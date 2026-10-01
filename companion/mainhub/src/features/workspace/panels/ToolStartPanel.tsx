const TOOLS = ["Chat", "Editor", "Suche", "Analyse"];

export function ToolStartPanel() {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {TOOLS.map((t) => (
        <button
          key={t}
          type="button"
          className="rounded-md border border-border bg-surface px-2 py-2 text-left hover:border-border-strong hover:bg-surface-raised"
        >
          {t}
        </button>
      ))}
    </div>
  );
}
