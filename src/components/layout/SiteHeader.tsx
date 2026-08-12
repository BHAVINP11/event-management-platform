import { Link } from 'react-router-dom';

export function SiteHeader() {
  return (
    <header style={{ padding: '1rem 0', borderBottom: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1100, margin: '0 auto', padding: '0 1rem' }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
          Event Management Platform
        </Link>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign Up</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      </div>
    </header>
  );
}
