# Onboarding Architecture

## Overview

The onboarding system enables new authenticated users to quickly set up their event management account. The platform supports two primary entry paths:

1. **Event Planner**: A professional who manages events for clients
2. **Individual Event Owner**: A person organizing their own event

## Account Type Selection

After signup, authenticated users without any organizations or events are redirected to `/onboarding`.

### Route: `/onboarding`

Users are presented with a simple choice:

- **I manage events** → Event planner onboarding
- **I'm planning my own event** → Individual event owner onboarding

## Planner Onboarding Flow

### Route: `/onboarding/planner`

Planners are prompted to enter basic organization details:

- **Organization Name** (required): e.g., "Royal Events"
- **Organization URL** (required, normalized): e.g., "royal-events"
- **Description** (optional): Business description
- **Contact Email** (optional): Organization contact email
- **Contact Phone** (optional): Organization phone

### Planner Onboarding Process

1. User fills in organization details
2. Form validates locally (React)
3. Onboarding service sends input to Cloud Function
4. Cloud Function validates input server-side
5. Cloud Function creates:
   - Organization document
   - OrganizationMember (owner) document
6. Both documents created atomically
7. User redirected to `/dashboard`
8. User is now an Organization owner

## Individual Event Owner Onboarding Flow

### Route: `/onboarding/event`

Individual event owners are prompted to enter basic event details:

- **Event Name** (required): e.g., "Sarah & Mike's Wedding"
- **Event Type** (required): wedding, social, corporate, private, other
- **Description** (optional): Event details
- **Start Date** (required): ISO 8601 datetime
- **End Date** (optional): ISO 8601 datetime (must not be before start date)
- **Timezone** (required): e.g., "America/New_York"
- **Venue Name** (optional): e.g., "Grand Ballroom"
- **Venue Address** (optional): Venue location

### Individual Event Onboarding Process

1. User fills in event details
2. Form validates locally (React)
3. Onboarding service sends input to Cloud Function
4. Cloud Function validates input server-side
5. Cloud Function creates:
   - Event document (organizationId = null)
   - EventMember (owner) document
6. Both documents created atomically
7. User redirected to `/dashboard`
8. User is now an Event owner

## Trusted Backend Architecture

```
React Component
    ↓
Onboarding Service (src/features/onboarding/services/onboardingService.ts)
    ↓
Callable Cloud Function (Firebase SDK)
    ↓
Cloud Function Server (functions/src/index.ts)
    ↓
Validation Logic (functions/src/validation.ts)
    ↓
Business Logic (functions/src/onboarding/*.ts)
    ↓
Firebase Admin SDK (server-side only)
    ↓
Firestore
```

### Key Principles

1. **Browser does not receive Admin credentials**: The browser only has the client SDK.
2. **Authentication enforced**: All Cloud Functions require `context.auth.uid`.
3. **Server-side validation**: Input is validated on the server, not just the client.
4. **Deterministic membership IDs**: Membership documents use deterministic IDs to prevent duplicates:
   - Organization members: `{organizationId}_{userId}`
   - Event members: `{eventId}_{userId}`
5. **Atomic writes**: Organization/event and membership created together.

## Cloud Functions

### `onCreateOrganization`

**Callable**: `functions.httpsCallable('onCreateOrganization')`

**Input**:
```typescript
{
  name: string;
  slug: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}
```

**Output**:
```typescript
{
  organizationId: string;
  membershipId: string;
}
```

**Validation**:
- Name: 1-200 characters
- Slug: 1-100 characters, normalized (lowercase, hyphens only, alphanumeric)
- Description: Max 1000 characters
- Email: Valid email format (if provided)
- Phone: Non-empty string (if provided)
- Slug uniqueness: No duplicate slugs

**Errors**:
- `unauthenticated`: User is not authenticated
- `invalid_name`: Organization name is invalid
- `invalid_slug`: Slug is invalid or too long
- `invalid_email`: Email format is invalid
- `invalid_phone`: Phone format is invalid
- `organization_slug_taken`: Slug already in use
- `internal_error`: Server error

**Process**:
1. Validate input
2. Check for duplicate slug
3. Generate organization ID
4. Generate deterministic membership ID
5. Create both documents atomically
6. Return IDs

### `onCreateIndividualEvent`

**Callable**: `functions.httpsCallable('onCreateIndividualEvent')`

**Input**:
```typescript
{
  name: string;
  type: string; // 'wedding' | 'social' | 'corporate' | 'private' | 'other'
  description?: string;
  startDate: string; // ISO 8601
  endDate?: string; // ISO 8601
  timezone: string;
  venueName?: string;
  venueAddress?: string;
}
```

**Output**:
```typescript
{
  eventId: string;
  membershipId: string;
}
```

**Validation**:
- Name: 1-200 characters
- Type: Must be valid EventType
- Description: Max 2000 characters
- Start date: Valid ISO 8601 date
- End date: Valid ISO 8601 date (if provided), must not be before start date
- Timezone: Non-empty string, max 100 characters
- Venue name: Max 200 characters (if provided)
- Venue address: Max 500 characters (if provided)

**Errors**:
- `unauthenticated`: User is not authenticated
- `invalid_name`: Event name is invalid
- `invalid_type`: Event type is not valid
- `invalid_start_date`: Start date is invalid
- `invalid_end_date`: End date is invalid or before start date
- `invalid_timezone`: Timezone is invalid
- `invalid_venue_name`: Venue name is too long
- `invalid_venue_address`: Venue address is too long
- `internal_error`: Server error

**Process**:
1. Validate input
2. Generate event ID
3. Generate deterministic membership ID
4. Create both documents atomically
5. Event has:
   - `organizationId: null` (individual event)
   - `createdBy: authenticated UID`
   - `status: 'draft'`
6. EventMember has:
   - `role: 'owner'`
   - `status: 'active'`
   - `invitedBy: null`
7. Return IDs

## Onboarding Service (Frontend)

### File: `src/features/onboarding/services/onboardingService.ts`

The onboarding service provides a clean interface to UI components:

```typescript
// Create organization
const { organizationId, membershipId } = await createOrganization({
  name: 'Royal Events',
  slug: 'royal-events',
  contactEmail: 'contact@royal.com'
});

// Create event
const { eventId, membershipId } = await createIndividualEvent({
  name: 'Sarah & Mike\'s Wedding',
  type: 'wedding',
  startDate: '2025-06-15T16:00:00Z',
  timezone: 'America/New_York'
});
```

**Error Handling**:

The service maps Cloud Function errors to user-friendly messages:

```typescript
try {
  await createOrganization(data);
} catch (error: OnboardingError) {
  console.log(error.friendlyMessage); // User-friendly error
  console.log(error.code); // Error code for app logic
  console.log(error.message); // Original error message
}
```

## Firestore Documents Created

### Organization Document

```
collections/organizations/{organizationId}
{
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  contactEmail: string;
  contactPhone?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### Organization Member Document

```
collections/organizationMembers/{organizationId}_{userId}
{
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner';
  status: 'active';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### Event Document (Individual)

```
collections/events/{eventId}
{
  id: string;
  name: string;
  type: string; // EventType
  description?: string;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
  timezone?: string;
  venueName?: string;
  venueAddress?: string;
  organizationId: null;
  createdBy: string; // Authenticated UID
  status: 'draft';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### Event Member Document (Owner)

```
collections/eventMembers/{eventId}_{userId}
{
  id: string;
  eventId: string;
  userId: string;
  role: 'owner';
  status: 'active';
  invitedBy: null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

## Firestore Security Rules

Cloud Functions use the Firebase Admin SDK, which bypasses Firestore client security rules.

Client security rules remain restrictive:

```
// Clients cannot directly create organizations or memberships
allow read/write: if false
```

Only Cloud Functions (with Admin SDK) can create these documents.

## Onboarding Completion Detection

A user is considered to have completed onboarding if they own:

- **At least one Organization** (planner path), OR
- **At least one Event** (individual path)

**Not** completion:
- Being invited to someone else's event
- Being an organization member but not the owner

## Dashboard

Route: `/dashboard`

The dashboard is a minimal placeholder that displays:

- Welcome message with user's first name
- Number of organizations owned
- Number of events owned
- Call-to-action buttons

The real dashboard implementation is out of scope for this step.

## Slug Normalization

Slugs are normalized server-side to ensure consistency:

- Convert to lowercase
- Replace spaces and underscores with hyphens
- Remove invalid characters (anything except alphanumeric and hyphens)
- Remove leading/trailing hyphens
- Validate length (1-100 characters)

Example:

```
"Royal Events!!!" → "royal-events"
"ABC_XYZ 123" → "abc-xyz-123"
"___test___" → "test"
```

## Slug Uniqueness

Slug uniqueness is checked by querying Firestore:

```
WHERE slug == normalizedSlug LIMIT 1
```

This is a linear search suitable for the MVP. Production systems may benefit from:

- Dedicated slug index
- Hash-based slug reservation
- Eventually consistent slug uniqueness

Current implementation:
- Prevents duplicate slug creation
- Rejects requests with taken slugs
- No reservation or placeholder system

## Error Handling

### Validation Errors

Server-side validation errors map to friendly messages. Examples:

- `invalid_name` → "Please enter a valid name."
- `organization_slug_taken` → "That organization name is already taken."
- `invalid_start_date` → "Please enter a valid start date."

### Firebase Errors

Firebase infrastructure errors (auth, permissions, etc.) are caught and mapped:

- `PERMISSION_DENIED` → "You do not have permission to perform this action."
- `UNAUTHENTICATED` → "You must be logged in to complete this action."

### Unknown Errors

Unknown errors are mapped to:

- Code: `internal_error`
- Message: "Something went wrong. Please try again."

## Setup & Deployment

### Local Development

1. Install Cloud Functions dependencies:
   ```bash
   cd functions
   npm install
   ```

2. Start the emulator:
   ```bash
   firebase emulators:start
   ```

3. Functions run on `http://localhost:5001`

### Deployment to Production

1. Build the functions:
   ```bash
   cd functions
   npm run build
   ```

2. Deploy to Firebase:
   ```bash
   firebase deploy --only functions
   ```

### Environment Variables

Cloud Functions do not require environment variables for this implementation. All configuration (Firestore collection names, ID prefixes, validation limits) is hardcoded.

## Hardening: Package Configuration

The Cloud Functions package is configured for deployment:

- **functions/package.json**: `"main": "lib/index.js"` (compiled output entry point)
- **functions/tsconfig.json**: Compiles to CommonJS format in `lib/` directory
- **Build output**: `npm run build` generates `lib/index.js` + type declarations

Deployment with `firebase deploy --only functions` uses the compiled `lib/index.js` as the entry point.

## Hardening: Timezone Validation

Timezone identifiers are validated against IANA timezone database using Node.js `Intl.DateTimeFormat` API:

Valid examples:
- America/New_York
- Europe/London
- Asia/Tokyo
- Australia/Sydney
- UTC

Invalid timezones are rejected with friendly error: "Timezone 'xyz123' is not a valid IANA timezone identifier."

## Hardening: Optional Field Storage

Optional fields in Firestore documents are omitted when not provided:

**Organization optional fields** (omitted if undefined):
- description
- contactEmail
- contactPhone

**Event optional fields** (omitted if undefined):
- description
- endDate
- venueName
- venueAddress

This prevents storing undefined values in Firestore and keeps documents clean.

## Slug Uniqueness: MVP Limitation

**Current behavior**:
The system normalizes the requested slug and checks the organizations collection for an existing document with the same slug before creating the organization.

```typescript
// Query to check slug availability
const snapshot = await db
  .collection('organizations')
  .where('slug', '==', normalizedSlug)
  .limit(1)
  .get();

// Only create if no match found
if (snapshot.empty) {
  // Create organization with auto-generated Firestore document ID
  const organizationRef = db.collection('organizations').doc();
  // ... set slug field in document
}
```

**MVP limitation**:
- The organization document itself uses an auto-generated Firestore document ID (not based on slug)
- Two simultaneous organization creation requests with the same slug could theoretically both pass the availability check before either organization is written to Firestore
- The auto-generated organization ID does not provide slug-level uniqueness

This is accepted as an MVP limitation suitable for low-concurrency environments.

**Future improvement**:
A dedicated slug reservation/index document or another transactional uniqueness strategy can be introduced when needed.

For this step, the availability check is acceptable for MVP. Production deployments should monitor slug collision rates.

## Future Enhancements

Out of scope for this step:

- Invitations system
- Guest management
- Granular permissions
- Permission editor
- Membership acceptance workflows
- Role-based access control beyond owner/member
- Event collaboration features
- Guest lists and RSVPs
- Expenses, rooms, vendors, tasks

These features will be added in subsequent steps.
