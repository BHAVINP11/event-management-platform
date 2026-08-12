import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function SecureDashboardPage(): JSX.Element {
  const { user, loading } = useAuth();
  const [organizationCount] = useState(0);
  const [eventCount] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch user's organizations and events
    // This is a placeholder implementation
    setDashboardLoading(false);
  }, [user]);

  if (loading || dashboardLoading) {
    return <p>Loading...</p>;
  }

  return (
    <section className="dashboard-container">
      <div className="dashboard-content">
        <h1>Welcome, {user?.firstName}!</h1>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Organizations</h3>
            <p className="stat-number">{organizationCount}</p>
            <p className="stat-label">You manage {organizationCount === 1 ? 'one organization' : `${organizationCount} organizations`}</p>
          </div>

          <div className="stat-card">
            <h3>Events</h3>
            <p className="stat-number">{eventCount}</p>
            <p className="stat-label">You own {eventCount === 1 ? 'one event' : `${eventCount} events`}</p>
          </div>
        </div>

        <div className="dashboard-actions">
          <button className="btn-primary">Start Planning</button>
          <button className="btn-secondary">View Organizations</button>
        </div>

        <div className="dashboard-info">
          <p>Your full event management features are coming soon.</p>
        </div>
      </div>

      <style>{`
        .dashboard-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-content h1 {
          margin: 0 0 2rem 0;
          font-size: 2rem;
          color: #333;
        }

        .dashboard-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .stat-card h3 {
          margin: 0 0 0.5rem 0;
          color: #666;
          font-size: 0.9rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-number {
          margin: 0 0 0.5rem 0;
          font-size: 2.5rem;
          font-weight: bold;
          color: #0066cc;
        }

        .stat-label {
          margin: 0;
          color: #999;
          font-size: 0.9rem;
        }

        .dashboard-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }

        .btn-primary {
          background: #0066cc;
          color: white;
        }

        .btn-primary:hover {
          background: #0052a3;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .dashboard-info {
          background: #e6f2ff;
          padding: 1rem;
          border-radius: 4px;
          color: #0052a3;
          font-size: 0.95rem;
        }

        .dashboard-info p {
          margin: 0;
        }
      `}</style>
    </section>
  );
}
