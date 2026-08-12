import { useParams } from 'react-router-dom';

export function EventDetailPage(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();

  return (
    <section>
      <h1>Event Details</h1>
      <p>Placeholder page for event ID: {eventId}</p>
    </section>
  );
}
