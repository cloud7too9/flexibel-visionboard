export function ProjektstatusPanel() {
  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div>
        <div className="text-xs uppercase tracking-wide text-text-muted">Aktiv</div>
        <div className="mt-0.5 text-base font-medium">MainHub Workspace</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatusBlock label="Offen" value="7" />
        <StatusBlock label="Erledigt" value="12" />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-text-muted">
          <span>Fortschritt</span>
          <span>63%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface">
          <div className="h-full rounded-full bg-accent" style={{ width: "63%" }} />
        </div>
      </div>
    </div>
  );
}

function StatusBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-2 py-1.5">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
