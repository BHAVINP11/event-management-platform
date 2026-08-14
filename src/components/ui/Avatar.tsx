export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** The person's display name or email — used for initials and the accessible label. */
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A photo avatar, falling back to initials on a tinted circle when no image is available. */
export function Avatar({ name, src, size = 'md', className }: AvatarProps): JSX.Element {
  const classes = ['avatar', `avatar--${size}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes} role="img" aria-label={name}>
      {src ? <img src={src} alt="" /> : getInitials(name)}
    </span>
  );
}
