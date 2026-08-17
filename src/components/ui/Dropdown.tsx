import { ReactNode, useEffect, useRef, useState } from 'react';

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  /** Rendered inert with a "Soon" badge instead of a working action. */
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: readonly DropdownItem[];
  /** Optional non-interactive row shown above the items, e.g. the signed-in user's name/email. */
  label?: string;
  align?: 'left' | 'right';
  /** Extra class(es) for the trigger button, e.g. to make it look like a primary `Button` ("+ Add"). */
  triggerClassName?: string;
}

/**
 * A menu button: click (or Enter/Space) the trigger to open a small list
 * of actions. Closes on outside click, Escape, or selecting an item.
 */
export function Dropdown({ trigger, items, label, align = 'right', triggerClassName }: DropdownProps): JSX.Element {
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
        className={['dropdown-trigger', triggerClassName].filter(Boolean).join(' ')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger}
      </button>

      {open && (
        <div className={['dropdown-menu', align === 'left' && 'dropdown-menu--left'].filter(Boolean).join(' ')} role="menu">
          {label && <div className="dropdown-menu-label">{label}</div>}
          {items.map((item) =>
            item.disabled ? (
              <span
                key={item.label}
                role="menuitem"
                aria-disabled="true"
                className="dropdown-menu-item dropdown-menu-item--disabled"
              >
                {item.label}
                <span className="dropdown-menu-item-soon">Soon</span>
              </span>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={['dropdown-menu-item', item.danger && 'dropdown-menu-item--danger']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
