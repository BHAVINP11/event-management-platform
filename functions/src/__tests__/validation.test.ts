import {
  validateCreateOrganizationInput,
  getOrganizationMembershipId,
  buildOrganizationDocument
} from '../onboarding/createOrganization';
import {
  validateCreateIndividualEventInput,
  getEventMembershipId,
  buildEventDocument
} from '../onboarding/createIndividualEvent';
import { ValidationError } from '../validation';

describe('Organization Validation', () => {
  describe('validateCreateOrganizationInput', () => {
    it('should accept valid input', () => {
      const input = {
        name: 'Royal Events',
        slug: 'royal-events',
        description: 'Premium event planning',
        contactEmail: 'contact@royal.com',
        contactPhone: '555-1234'
      };

      const result = validateCreateOrganizationInput(input);
      expect(result.name).toBe('Royal Events');
      expect(result.slug).toBe('royal-events');
      expect(result.description).toBe('Premium event planning');
    });

    it('should reject missing name', () => {
      const input = {
        slug: 'royal-events'
      };

      expect(() => validateCreateOrganizationInput(input)).toThrow(ValidationError);
    });

    it('should reject missing slug', () => {
      const input = {
        name: 'Royal Events'
      };

      expect(() => validateCreateOrganizationInput(input)).toThrow(ValidationError);
    });

    it('should normalize slug', () => {
      const input = {
        name: 'Royal Events',
        slug: 'Royal  Events!!!'
      };

      const result = validateCreateOrganizationInput(input);
      expect(result.slug).toBe('royal-events');
    });

    it('should reject slug that is too long', () => {
      const input = {
        name: 'Royal Events',
        slug: 'a'.repeat(101)
      };

      expect(() => validateCreateOrganizationInput(input)).toThrow(ValidationError);
    });

    it('should reject invalid email', () => {
      const input = {
        name: 'Royal Events',
        slug: 'royal-events',
        contactEmail: 'not-an-email'
      };

      expect(() => validateCreateOrganizationInput(input)).toThrow(ValidationError);
    });

    it('should accept undefined optional fields', () => {
      const input = {
        name: 'Royal Events',
        slug: 'royal-events'
      };

      const result = validateCreateOrganizationInput(input);
      expect(result.description).toBeUndefined();
      expect(result.contactEmail).toBeUndefined();
    });
  });

  describe('getOrganizationMembershipId', () => {
    it('should create deterministic membership ID', () => {
      const id = getOrganizationMembershipId('org-123', 'user-456');
      expect(id).toBe('org-123_user-456');
    });
  });
});

describe('Event Validation', () => {
  describe('validateCreateIndividualEventInput', () => {
    it('should accept valid input', () => {
      const input = {
        name: 'Sarah & Mike Wedding',
        type: 'wedding',
        description: 'A beautiful celebration',
        startDate: '2025-06-15T16:00:00Z',
        endDate: '2025-06-15T22:00:00Z',
        timezone: 'America/New_York',
        venueName: 'Grand Ballroom',
        venueAddress: '123 Main St'
      };

      const result = validateCreateIndividualEventInput(input);
      expect(result.name).toBe('Sarah & Mike Wedding');
      expect(result.type).toBe('wedding');
    });

    it('should reject missing name', () => {
      const input = {
        type: 'wedding',
        startDate: '2025-06-15T16:00:00Z',
        timezone: 'America/New_York'
      };

      expect(() => validateCreateIndividualEventInput(input)).toThrow(ValidationError);
    });

    it('should reject invalid event type', () => {
      const input = {
        name: 'My Event',
        type: 'invalid-type',
        startDate: '2025-06-15T16:00:00Z',
        timezone: 'America/New_York'
      };

      expect(() => validateCreateIndividualEventInput(input)).toThrow(ValidationError);
    });

    it('should reject end date before start date', () => {
      const input = {
        name: 'My Event',
        type: 'wedding',
        startDate: '2025-06-15T22:00:00Z',
        endDate: '2025-06-15T16:00:00Z',
        timezone: 'America/New_York'
      };

      expect(() => validateCreateIndividualEventInput(input)).toThrow(ValidationError);
    });

    it('should accept missing end date', () => {
      const input = {
        name: 'My Event',
        type: 'wedding',
        startDate: '2025-06-15T16:00:00Z',
        timezone: 'America/New_York'
      };

      const result = validateCreateIndividualEventInput(input);
      expect(result.endDate).toBeUndefined();
    });

    it('should reject invalid start date', () => {
      const input = {
        name: 'My Event',
        type: 'wedding',
        startDate: 'not-a-date',
        timezone: 'America/New_York'
      };

      expect(() => validateCreateIndividualEventInput(input)).toThrow(ValidationError);
    });

    it('should accept valid event types', () => {
      const validTypes = ['wedding', 'social', 'corporate', 'private', 'other'];

      for (const type of validTypes) {
        const input = {
          name: 'My Event',
          type,
          startDate: '2025-06-15T16:00:00Z',
          timezone: 'America/New_York'
        };

        const result = validateCreateIndividualEventInput(input);
        expect(result.type).toBe(type);
      }
    });
  });

  describe('getEventMembershipId', () => {
    it('should create deterministic membership ID', () => {
      const id = getEventMembershipId('event-123', 'user-456');
      expect(id).toBe('event-123_user-456');
    });
  });
});

describe('Document Builders', () => {
  describe('buildOrganizationDocument', () => {
    it('should omit undefined optional fields', () => {
      const input = {
        name: 'Royal Events',
        slug: 'royal-events',
        description: undefined,
        contactEmail: undefined,
        contactPhone: undefined
      };

      const doc = buildOrganizationDocument('org-123', input, '2025-01-01T00:00:00Z');
      
      expect(doc.name).toBe('Royal Events');
      expect(doc.slug).toBe('royal-events');
      expect(doc.createdAt).toBe('2025-01-01T00:00:00Z');
      expect('description' in doc).toBe(false);
      expect('contactEmail' in doc).toBe(false);
      expect('contactPhone' in doc).toBe(false);
      expect('logoUrl' in doc).toBe(false);
    });

    it('should include optional fields when provided', () => {
      const input = {
        name: 'Royal Events',
        slug: 'royal-events',
        description: 'Premium planning',
        contactEmail: 'contact@royal.com',
        contactPhone: '555-1234'
      };

      const doc = buildOrganizationDocument('org-123', input, '2025-01-01T00:00:00Z');
      
      expect(doc.description).toBe('Premium planning');
      expect(doc.contactEmail).toBe('contact@royal.com');
      expect(doc.contactPhone).toBe('555-1234');
    });
  });

  describe('buildEventDocument', () => {
    it('should omit undefined optional fields', () => {
      const input = {
        name: 'My Event',
        type: 'wedding',
        description: undefined,
        startDate: '2025-06-15T16:00:00Z',
        endDate: undefined,
        timezone: 'America/New_York',
        venueName: undefined,
        venueAddress: undefined
      };

      const doc = buildEventDocument('event-123', 'user-456', input, '2025-01-01T00:00:00Z');
      
      expect(doc.name).toBe('My Event');
      expect(doc.type).toBe('wedding');
      expect(doc.startDate).toBe('2025-06-15T16:00:00Z');
      expect(doc.timezone).toBe('America/New_York');
      expect('description' in doc).toBe(false);
      expect('endDate' in doc).toBe(false);
      expect('venueName' in doc).toBe(false);
      expect('venueAddress' in doc).toBe(false);
    });

    it('should include optional fields when provided', () => {
      const input = {
        name: 'My Event',
        type: 'wedding',
        description: 'A beautiful celebration',
        startDate: '2025-06-15T16:00:00Z',
        endDate: '2025-06-15T22:00:00Z',
        timezone: 'America/New_York',
        venueName: 'Grand Ballroom',
        venueAddress: '123 Main St'
      };

      const doc = buildEventDocument('event-123', 'user-456', input, '2025-01-01T00:00:00Z');
      
      expect(doc.description).toBe('A beautiful celebration');
      expect(doc.endDate).toBe('2025-06-15T22:00:00Z');
      expect(doc.venueName).toBe('Grand Ballroom');
      expect(doc.venueAddress).toBe('123 Main St');
    });
  });
});

describe('Timezone Validation', () => {
  it('should accept valid IANA timezone identifiers', () => {
    const validTimezones = [
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Asia/Kolkata',
      'Australia/Sydney',
      'UTC'
    ];

    for (const tz of validTimezones) {
      const input = {
        name: 'Test Event',
        type: 'wedding',
        startDate: '2025-06-15T16:00:00Z',
        timezone: tz
      };

      expect(() => validateCreateIndividualEventInput(input)).not.toThrow();
    }
  });

  it('should reject invalid timezone identifiers', () => {
    const invalidTimezones = [
      'xyz123',
      'random',
      'abc/timezone',
      'Invalid/Timezone',
      'NotATimezone'
    ];

    for (const tz of invalidTimezones) {
      const input = {
        name: 'Test Event',
        type: 'wedding',
        startDate: '2025-06-15T16:00:00Z',
        timezone: tz
      };

      expect(() => validateCreateIndividualEventInput(input)).toThrow(ValidationError);
    }
  });
});
