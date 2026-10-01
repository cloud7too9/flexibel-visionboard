const RECENT = [
  { label: "Notiz – Roadmap", time: "vor 2 Min." },
  { label: "Aufgabe – Grid finalisieren", time: "vor 15 Min." },
  { label: "Datei – plan.md", time: "vor 1 Std." },
];

export function LetzteInhaltePanel() {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {RECENT.map((r) => (
        <li
          key={r.label}
          className="flex items-center justify-between rounded-md border border-border bg-surface px-2 py-1.5"
        >
          <span>{r.label}</span>
          <span className="text-xs text-text-muted">{r.time}</span>
        </li>
      ))}
    </ul>
  );
}
