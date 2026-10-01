export function SchnellnotizPanel() {
  return (
    <div className="flex h-full flex-col gap-2 text-sm">
      <p className="text-text-muted">Kurze Gedanken, sofort festhalten.</p>
      <div className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-text-muted">
        Noch keine Notizen. Klicke hier, um eine anzulegen.
      </div>
    </div>
  );
}
