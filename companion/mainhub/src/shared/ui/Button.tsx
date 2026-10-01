import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-surface hover:bg-accent-muted disabled:bg-border disabled:text-text-muted",
  ghost:
    "border border-border bg-transparent text-text hover:border-border-strong hover:bg-surface-raised",
  danger:
    "bg-danger text-white hover:brightness-110 disabled:bg-border disabled:text-text-muted",
};

export function Button({ variant = "ghost", className = "", ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}
