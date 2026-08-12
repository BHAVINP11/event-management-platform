import { Link } from 'react-router-dom';

export function HomePage(): JSX.Element {
  return (
    <section>
      <h1>Event Management Platform</h1>
      <p>
        A multi-tenant SaaS foundation for event planners and couples to manage events in a single platform.
      </p>
      <p>
        This project is currently in the foundation phase with routing, architecture, and project configuration established.
      </p>
      <div style={{ marginTop: '1.5rem' }}>
        <Link to="/signup">Create an account</Link>
      </div>
    </section>
  );
}
