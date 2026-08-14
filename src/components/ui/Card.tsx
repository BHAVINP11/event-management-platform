import { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover/focus affordance for a card that acts as a click target. */
  interactive?: boolean;
  /** Set false to omit the default padding when a child needs edge-to-edge content. */
  padded?: boolean;
}

/** The base surface for grouped content — replaces ad hoc bordered `<div>`s. */
export function Card({ interactive = false, padded = true, className, ...rest }: CardProps): JSX.Element {
  const classes = ['card', padded && 'card--padded', interactive && 'card--interactive', className]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} {...rest} />;
}
