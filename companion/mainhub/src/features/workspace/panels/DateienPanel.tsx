const FILES = [
  { name: "plan.md", size: "4.2 KB" },
  { name: "notes.txt", size: "980 B" },
  { name: "architecture.pdf", size: "1.1 MB" },
];

export function DateienPanel() {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {FILES.map((f) => (
        <li
          key={f.name}
          className="flex items-center justify-between rounded-md border border-border bg-surface px-2 py-1.5"
        >
          <span>{f.name}</span>
          <span className="text-xs text-text-muted">{f.size}</span>
        </li>
      ))}
    </ul>
  );
}
