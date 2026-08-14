import { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Typically a <Button>, e.g. "+ Add Guest". */
  action?: ReactNode;
}

/** A calm placeholder for "nothing here yet" — not an error, just empty. */
export function EmptyState({ title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-description">{description}</p>}
      {action}
    </div>
  );
}
