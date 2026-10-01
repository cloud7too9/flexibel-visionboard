const SAMPLE = [
  { id: 1, text: "Layout-System finalisieren", done: false },
  { id: 2, text: "Panel-Inhalte erweitern", done: false },
  { id: 3, text: "Review-Feedback einarbeiten", done: true },
];

export function AufgabenPanel() {
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {SAMPLE.map((t) => (
        <li
          key={t.id}
          className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5"
        >
          <span
            className={
              "inline-block h-3 w-3 rounded-sm border " +
              (t.done ? "border-accent bg-accent" : "border-border-strong")
            }
          />
          <span className={t.done ? "text-text-muted line-through" : "text-text"}>{t.text}</span>
        </li>
      ))}
    </ul>
  );
}
