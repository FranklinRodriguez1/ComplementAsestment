import { Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StateViewProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

interface EmptyStateProps extends StateViewProps {
  /** Optional (STYLE.md: "estados vacíos" get an icon-xl icon). */
  icon?: LucideIcon;
}

/**
 * These three components render the loading/empty/error states required in
 * every data-driven section. They never own translated text themselves --
 * callers pass already-translated strings in, so the same primitive works
 * for channels, messages, or the copilot without hardcoding any copy here.
 */
export function LoadingState({ title }: { title: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-foreground-secondary"
    >
      <Loader2 className="h-icon-lg w-icon-lg animate-spin" aria-hidden="true" />
      <p className="text-sm">{title}</p>
    </div>
  );
}

export function EmptyState({ title, description, action, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      {Icon ? (
        <Icon className="h-icon-xl w-icon-xl mb-1 text-foreground-secondary" aria-hidden="true" />
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-xs text-sm text-foreground-secondary">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ title, description, action }: StateViewProps) {
  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm font-medium text-status-error-text">{title}</p>
      {description ? <p className="max-w-xs text-sm text-foreground-secondary">{description}</p> : null}
      {action}
    </div>
  );
}
