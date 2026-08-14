import { HTMLAttributes } from 'react';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/** A small status/label pill — for statuses, roles, categories, counts. */
export function Badge({ variant = 'neutral', className, ...rest }: BadgeProps): JSX.Element {
  const classes = ['badge', `badge--${variant}`, className].filter(Boolean).join(' ');
  return <span className={classes} {...rest} />;
}
