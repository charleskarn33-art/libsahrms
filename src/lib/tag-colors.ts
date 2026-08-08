const PALETTE = [
  "bg-primary/10 text-primary-700",
  "bg-secondary/10 text-secondary",
  "bg-accent/10 text-accent",
  "bg-warning/10 text-warning",
  "bg-danger/10 text-danger",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400",
];

/** Deterministic color for a tag-like label (e.g. department name) so the same value always renders the same color. */
export function tagColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash << 5) - hash + label.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
