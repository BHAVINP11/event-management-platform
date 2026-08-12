import {
  validateCreateOrganizationInput,
  getOrganizationMembershipId
} from '../onboarding/createOrganization';
import {
  validateCreateIndividualEventInput,
  getEventMembershipId
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
