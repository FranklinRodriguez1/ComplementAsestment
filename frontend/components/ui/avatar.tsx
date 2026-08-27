const AVATAR_COLORS = [
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
] as const;

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Deterministic per-user color (STYLE.md "Paleta de avatares"): a simple
 * string hash of the name mod the palette size, so the same person always
 * gets the same color everywhere they appear (message list, sidebar,
 * profile) -- never re-randomized per render, and every entry in the
 * palette already clears 4.5:1 with white initials in both themes.
 */
function colorClassFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${dimensions} shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorClassFor(name)}`}
    >
      {initials(name)}
    </span>
  );
}
