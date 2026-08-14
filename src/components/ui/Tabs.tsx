export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: readonly TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Associates the tablist with the panel it controls, for screen readers. */
  panelId?: string;
}

/**
 * A controlled tab strip. Renders only the tab buttons — the caller
 * decides what panel content to show for the active tab, keeping this
 * component reusable across very different content shapes.
 */
export function Tabs({ tabs, activeId, onChange, panelId }: TabsProps): JSX.Element {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={tab.id === activeId}
          aria-controls={panelId}
          className={['tab', tab.id === activeId && 'tab--active'].filter(Boolean).join(' ')}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
