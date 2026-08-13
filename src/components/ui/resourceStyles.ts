/**
 * Shared styling for the resource-launcher surfaces (dashboard and event page).
 *
 * Kept as a plain CSS string injected via `<style>`, matching the approach used
 * elsewhere in the application, so no UI component library is required.
 */
export const resourceStyles = `
  .resource-page {
    padding: 2rem 0 3rem;
    max-width: 900px;
    margin: 0 auto;
  }

  .resource-page h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.8rem;
    color: #333;
  }

  .resource-page .page-subtitle {
    margin: 0 0 2rem 0;
    color: #666;
    font-size: 0.95rem;
  }

  .resource-section {
    margin-bottom: 2.5rem;
  }

  .resource-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .resource-section-header h2 {
    margin: 0;
    font-size: 1.1rem;
    color: #333;
  }

  .resource-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .resource-card {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }

  .resource-card-body {
    min-width: 0;
  }

  .resource-card h3 {
    margin: 0 0 0.35rem 0;
    font-size: 1.05rem;
    color: #333;
  }

  .resource-card p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
  }

  .resource-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }

  .resource-tag {
    display: inline-block;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    background: #f1f5f9;
    color: #475569;
    font-size: 0.78rem;
    font-weight: 500;
  }

  .resource-tag.status-active {
    background: #dcfce7;
    color: #166534;
  }

  .resource-tag.status-draft {
    background: #fef3c7;
    color: #92400e;
  }

  .resource-tag.status-completed,
  .resource-tag.status-archived {
    background: #e2e8f0;
    color: #475569;
  }

  .resource-empty {
    padding: 1.5rem;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    color: #64748b;
    font-size: 0.95rem;
  }

  .resource-empty p {
    margin: 0 0 1rem 0;
  }

  .resource-empty p:last-child {
    margin-bottom: 0;
  }

  .resource-notice {
    padding: 1.5rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #475569;
  }

  .resource-notice h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    color: #333;
  }

  .resource-notice p {
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
  }

  .resource-notice p:last-child {
    margin-bottom: 0;
  }

  a.btn-primary,
  a.btn-secondary {
    display: inline-block;
    text-decoration: none;
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: 4px;
    font-size: 0.95rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.2s;
    white-space: nowrap;
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

  .sr-only-text {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .resource-skeleton-line,
  .resource-skeleton-card {
    background: linear-gradient(90deg, #eef2f6 25%, #e2e8f0 37%, #eef2f6 63%);
    background-size: 400% 100%;
    animation: resource-skeleton-pulse 1.4s ease-in-out infinite;
    border-radius: 6px;
  }

  .resource-skeleton-line {
    height: 1rem;
    margin-bottom: 0.75rem;
  }

  .resource-skeleton-card {
    height: 5.5rem;
    margin-bottom: 1rem;
  }

  @keyframes resource-skeleton-pulse {
    0% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0 50%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .resource-skeleton-line,
    .resource-skeleton-card {
      animation: none;
    }
  }
`;
