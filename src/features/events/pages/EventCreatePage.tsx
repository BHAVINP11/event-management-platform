import { Link } from 'react-router-dom';
import { resourceStyles } from '@/components/ui/resourceStyles';

/** Placeholder target for the dashboard's Create Event action. */
export function EventCreatePage(): JSX.Element {
  return (
    <section className="resource-page">
      <h1>Create an event</h1>
      <div className="resource-notice">
        <p>Event creation will be available here.</p>
        <Link to="/dashboard" className="btn-secondary">
          Back to dashboard
        </Link>
      </div>
      <style>{resourceStyles}</style>
    </section>
  );
}
