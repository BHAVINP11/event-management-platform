# Authentication Foundation

## 1. Firebase Authentication responsibility

Firebase Authentication handles user identity, email/password credentials, and session management.

## 2. User profile responsibility

User profiles are stored separately in Firestore under `users/{userId}`.

The Firestore user document is mapped into the application-level `User` domain model defined in `src/types/user.ts`.

## 3. Auth state lifecycle

- The app subscribes to Firebase Auth state on startup.
- If a Firebase user exists, the app loads the corresponding Firestore profile.
- The authenticated profile enters application state through `useAuth()`.
- If the profile is missing or cannot be loaded, the app treats the user as unauthenticated.

## 4. Signup flow

1. User submits first name, last name, email, and password.
2. The app creates an Auth account via Firebase Authentication.
3. The app creates a Firestore user profile in `users/{uid}`.
4. The app returns an application-level `User` model and navigates to `/dashboard`.

## 5. Login flow

1. User submits email and password.
2. The app signs in via Firebase Authentication.
3. The app loads the Firestore user profile from `users/{uid}`.
4. The app stores the application-level `User` model and navigates to `/dashboard`.

## 6. Logout flow

The app calls the Firebase sign-out function through the auth service. UI components only consume application auth state and do not call Firebase directly.

## 7. Firebase Auth User vs application User

Firebase Auth user objects are used only inside the auth infrastructure layer.

The application-level `User` model is defined in `src/types/user.ts` and is used throughout the app.

## 8. Future authorization layer

A future layer will enforce access control and permissions, likely by examining `EventMember` and `OrganizationMember` assignments.

For now, auth state is only used to gate protected routes.
