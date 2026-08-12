import { PropsWithChildren } from 'react';

export function Container({ children }: PropsWithChildren) {
  return <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>{children}</div>;
}
