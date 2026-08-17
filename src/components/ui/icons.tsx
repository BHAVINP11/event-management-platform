import { SVGProps } from 'react';

/**
 * A small, dependency-free set of stroke icons for shell navigation and
 * event modules. Consistent 24×24 viewBox, 1.75 stroke, round joins — no
 * icon library added; every icon used in the app lives here.
 */
export type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
};

export function IconGrid(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconCompass(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 9.2 13 13l-3.8 1.8L11 11z" />
    </svg>
  );
}

export function IconUsers(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 5.5c1.4.3 2.5 1.6 2.5 3.1 0 1.5-1.1 2.8-2.5 3.1" />
      <path d="M16.5 14.2c2 .5 3.5 2.2 3.5 4.3" />
    </svg>
  );
}

export function IconUserPlus(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <circle cx="9.5" cy="8.5" r="3.25" />
      <path d="M3.5 19.5c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5" />
      <path d="M18 8.5h3.2M19.6 6.9v3.2" />
    </svg>
  );
}

export function IconUser(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </svg>
  );
}

export function IconCalendar(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconWallet(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <path d="M14.5 12h3.5" />
      <circle cx="16.25" cy="12" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconReceipt(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.5h12v17l-2.2-1.5-2.1 1.5-2.2-1.5-2 1.5-2.1-1.5L6 20.5z" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" />
    </svg>
  );
}

export function IconBriefcase(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="7.5" width="17" height="11.5" rx="2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3.5 12.5h17" />
    </svg>
  );
}

export function IconCheckSquare(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 12.2 11 14.7l4.8-5.4" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </svg>
  );
}

export function IconMenu(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

export function IconPlus(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M12 4.5v15M4.5 12h15" />
    </svg>
  );
}

export function IconSparkle(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5c.6 3 1.9 4.3 4.9 4.9-3 .6-4.3 1.9-4.9 4.9-.6-3-1.9-4.3-4.9-4.9 3-.6 4.3-1.9 4.9-4.9z" />
      <path d="M18.5 15c.3 1.5 1 2.2 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.3 2.2-1 2.5-2.5z" />
    </svg>
  );
}

export function IconMapPin(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}
