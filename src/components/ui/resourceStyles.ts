/**
 * Shared styling for the resource-launcher surfaces (dashboard and event page).
 *
 * Kept as a plain CSS string injected via `<style>`, matching the approach used
 * elsewhere in the application, so no UI component library is required.
 *
 * Colors reference the design tokens in `src/styles/tokens.css` (imported
 * once, globally, in `main.tsx`) rather than hardcoding hex values, so this
 * file automatically stays on-palette with the rest of the app. Structural
 * values (spacing, radius, font sizes) are left as-is — this is a color
 * retint only, not a layout change.
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
    color: var(--color-text);
  }

  .resource-page .page-subtitle {
    margin: 0 0 2rem 0;
    color: var(--color-text-muted);
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
    color: var(--color-text);
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
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
  }

  .resource-card-body {
    min-width: 0;
  }

  .resource-card h3 {
    margin: 0 0 0.35rem 0;
    font-size: 1.05rem;
    color: var(--color-text);
  }

  .resource-card p {
    margin: 0;
    color: var(--color-text-muted);
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
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-size: 0.78rem;
    font-weight: 500;
  }

  .resource-tag.status-active {
    background: var(--color-success-tint);
    color: var(--color-success);
  }

  .resource-tag.status-draft {
    background: var(--color-warning-tint);
    color: var(--color-warning);
  }

  .resource-tag.status-completed,
  .resource-tag.status-archived {
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
  }

  .resource-empty {
    padding: 1.5rem;
    background: var(--color-surface-sunken);
    border: 1px dashed var(--color-border-strong);
    border-radius: 8px;
    color: var(--color-text-muted);
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
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    color: var(--color-text-muted);
  }

  .resource-notice h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    color: var(--color-text);
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
    background: var(--color-accent);
    color: var(--color-text-on-accent);
  }

  .btn-primary:hover {
    background: var(--color-accent-hover);
  }

  .btn-secondary {
    background: var(--color-surface-sunken);
    color: var(--color-text);
  }

  .btn-secondary:hover {
    background: var(--color-border);
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
    background: linear-gradient(90deg, var(--color-surface-sunken) 25%, var(--color-border) 37%, var(--color-surface-sunken) 63%);
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

  /* Event creation: entry-point choice, organization selector, form */

  .creation-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .creation-option {
    display: block;
    width: 100%;
    text-align: left;
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.2s, background 0.2s;
  }

  .creation-option:hover {
    border-color: var(--color-accent);
    background: var(--color-accent-tint);
  }

  .creation-option h3 {
    margin: 0 0 0.35rem 0;
    font-size: 1.05rem;
    color: var(--color-text);
  }

  .creation-option p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .org-select-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    list-style: none;
    margin: 0 0 1.5rem 0;
    padding: 0;
  }

  .org-select-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    cursor: pointer;
  }

  .org-select-item:has(input:checked) {
    border-color: var(--color-accent);
    background: var(--color-accent-tint);
  }

  .org-select-item-label {
    display: flex;
    flex-direction: column;
  }

  .org-select-item-label strong {
    color: var(--color-text);
    font-size: 0.95rem;
  }

  .org-select-item-label span {
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }

  .event-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 600px;
  }

  .event-form .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .event-form .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .event-form label {
    font-weight: 500;
    color: var(--color-text);
    font-size: 0.9rem;
  }

  .event-form input,
  .event-form textarea,
  .event-form select {
    padding: 0.75rem;
    border: 1px solid var(--color-border-strong);
    border-radius: 4px;
    font-size: 1rem;
    font-family: inherit;
  }

  .event-form input:focus,
  .event-form textarea:focus,
  .event-form select:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: var(--shadow-focus);
  }

  .event-form input:disabled,
  .event-form textarea:disabled,
  .event-form select:disabled {
    background: var(--color-surface-sunken);
    cursor: not-allowed;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .form-error {
    padding: 1rem;
    background: var(--color-danger-tint);
    border: 1px solid var(--color-danger);
    border-radius: 4px;
    color: var(--color-danger);
    font-size: 0.9rem;
  }

  @media (max-width: 600px) {
    .creation-options {
      grid-template-columns: 1fr;
    }

    .event-form .form-row {
      grid-template-columns: 1fr;
    }
  }

  /* Event workspace: header + navigation shell */

  .event-header {
    margin-bottom: 1.5rem;
  }

  .event-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    list-style: none;
    margin: 0 0 2rem 0;
    padding: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .event-nav-item {
    padding: 0.65rem 1rem;
    font-size: 0.9rem;
    color: var(--color-text-muted);
    border-bottom: 2px solid transparent;
  }

  .event-nav-item.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
    font-weight: 500;
  }

  .event-nav-item.disabled {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--color-text-subtle);
    cursor: default;
  }

  .event-nav-item a {
    color: inherit;
    text-decoration: none;
  }

  .event-nav-item a:hover {
    color: var(--color-accent);
  }

  .event-nav-soon {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    background: var(--color-surface-sunken);
    color: var(--color-text-subtle);
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
  }

  .event-overview-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
    max-width: 700px;
  }

  .event-overview-field dt {
    margin: 0 0 0.25rem 0;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-text-subtle);
  }

  .event-overview-field dd {
    margin: 0;
    color: var(--color-text);
    font-size: 0.95rem;
  }

  @media (max-width: 600px) {
    .event-overview-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Guests page: toolbar (search + filter tabs), counts, row actions */

  .guest-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .guest-search-input {
    padding: 0.6rem 0.9rem;
    border: 1px solid var(--color-border-strong);
    border-radius: 4px;
    font-size: 0.9rem;
    font-family: inherit;
    min-width: 220px;
  }

  .guest-search-input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: var(--shadow-focus);
  }

  .guest-filter-tabs {
    display: flex;
    gap: 0.4rem;
  }

  .guest-filter-tab {
    padding: 0.45rem 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-surface);
    color: var(--color-text-muted);
    font-size: 0.85rem;
    font-family: inherit;
    cursor: pointer;
  }

  .guest-filter-tab.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-text-on-accent);
  }

  .guest-counts {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .guest-count {
    display: flex;
    flex-direction: column;
  }

  .guest-count-value {
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .guest-count-label {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-text-subtle);
  }

  .resource-card-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  /* Expenses page: budget summary, edit-budget action */

  .budget-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .budget-stat {
    display: flex;
    flex-direction: column;
  }

  .budget-stat-value {
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .budget-stat-value.negative {
    color: var(--color-danger);
  }

  .budget-stat-label {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-text-subtle);
  }

  .budget-edit-form {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .budget-edit-form .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
  }

  .budget-edit-form label {
    font-weight: 500;
    color: var(--color-text);
    font-size: 0.9rem;
  }

  .budget-edit-form input {
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--color-border-strong);
    border-radius: 4px;
    font-size: 0.95rem;
    font-family: inherit;
    width: 200px;
  }
`;
