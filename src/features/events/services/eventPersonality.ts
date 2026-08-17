import { EventType } from '@/types/event';

export type EventPersonality = 'romantic' | 'structured' | 'playful' | 'neutral';

/**
 * Maps the event's own existing `type` to a subtle personality accent for
 * the hero — one design system with contextual mood, not a separate
 * theme per event type. Purely a CSS class selector; no new data.
 */
export function eventPersonality(type: EventType): EventPersonality {
  switch (type) {
    case EventType.Wedding:
      return 'romantic';
    case EventType.Corporate:
      return 'structured';
    case EventType.Social:
      return 'playful';
    default:
      return 'neutral';
  }
}
