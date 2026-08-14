import { ReactNode, useEffect, useRef, useState } from 'react';

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: readonly DropdownItem[];
  /** Optional non-interactive row shown above the items, e.g. the signed-in user's name/email. */
  label?: string;
  align?: 'left' | 'right';
}

/**
 * A menu button: click (or Enter/Space) the trigger to open a small list
 * of actions. Closes on outside click, Escape, or selecting an item.
 */
export function Dropdown({ trigger, items, label, align = 'right' }: DropdownProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={containerRef}>
      <button
        type="button"
        className="dropdown-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger}
      </button>

      {open && (
        <div className={['dropdown-menu', align === 'left' && 'dropdown-menu--left'].filter(Boolean).join(' ')} role="menu">
          {label && <div className="dropdown-menu-label">{label}</div>}
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={['dropdown-menu-item', item.danger && 'dropdown-menu-item--danger'].filter(Boolean).join(' ')}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
