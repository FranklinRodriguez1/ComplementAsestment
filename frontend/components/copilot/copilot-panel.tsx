"use client";

import { Send, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-views";
import { useAskCopilot } from "@/lib/query/copilot";
import type { Channel, CopilotAnswer } from "@/lib/types";

type TurnResult =
  | { status: "loading" }
  | { status: "answered"; answer: CopilotAnswer }
  | { status: "refused" }
  | { status: "error" };

interface Turn {
  id: string;
  question: string;
  result: TurnResult;
}

/**
 * Q&A history here is local component state, not a TanStack Query cache
 * entry: it isn't "fetched" from anywhere, it's this session's own
 * questions (see lib/query/copilot.ts).
 */
export function CopilotPanel({ channel, onClose }: { channel: Channel; onClose: () => void }) {
  const t = useTranslations("copilot");
  const [value, setValue] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const askCopilot = useAskCopilot(channel.id);

  function runTurn(turnId: string, question: string) {
    askCopilot.mutate(question, {
      onSuccess: (result) => {
        setTurns((prev) =>
          prev.map((turn) =>
            turn.id === turnId
              ? {
                  ...turn,
                  result: result.refused
                    ? { status: "refused" }
                    : { status: "answered", answer: result.answer },
                }
              : turn,
          ),
        );
      },
      onError: () => {
        setTurns((prev) =>
          prev.map((turn) => (turn.id === turnId ? { ...turn, result: { status: "error" } } : turn)),
        );
      },
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const question = value.trim();
    if (!question) return;
    const turnId = crypto.randomUUID();
    setTurns((prev) => [...prev, { id: turnId, question, result: { status: "loading" } }]);
    setValue("");
    runTurn(turnId, question);
  }

  function retry(turnId: string, question: string) {
    setTurns((prev) => prev.map((turn) => (turn.id === turnId ? { ...turn, result: { status: "loading" } } : turn)));
    runTurn(turnId, question);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2 border-b border-border px-4 py-3">
        <Sparkles className="mt-0.5 h-icon-md w-icon-md shrink-0 text-brand-text" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <p className="text-xs text-foreground-secondary">{t("description")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("closePanel")}
          className="-mt-1 -mr-1 inline-flex h-icon-xl w-icon-xl shrink-0 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-background hover:text-foreground"
        >
          <X className="h-icon-md w-icon-md" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {turns.length === 0 ? (
          <EmptyState title={t("empty")} icon={Sparkles} />
        ) : (
          <div className="flex flex-col gap-4">
            {turns.map((turn) => (
              <CopilotTurn key={turn.id} turn={turn} onRetry={() => retry(turn.id, turn.question)} />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <label htmlFor="copilot-input" className="sr-only">
          {t("inputLabel")}
        </label>
        <input
          id="copilot-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("placeholder", { channel: channel.name })}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <Button type="submit" disabled={!value.trim()} aria-label={t("ask")}>
          <Send className="h-icon-md w-icon-md" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}

function CopilotTurn({ turn, onRetry }: { turn: Turn; onRetry: () => void }) {
  const t = useTranslations("copilot");

  return (
    <div className="flex flex-col gap-2">
      <p className="self-end rounded-lg bg-brand/15 px-3 py-1.5 text-sm text-foreground">{turn.question}</p>

      {turn.result.status === "loading" ? (
        <LoadingState title={t("thinking")} />
      ) : turn.result.status === "error" ? (
        <ErrorState
          title={t("error")}
          action={
            <Button variant="outline" onClick={onRetry}>
              {t("retry")}
            </Button>
          }
        />
      ) : turn.result.status === "refused" ? (
        <p className="rounded-lg bg-background-secondary px-3 py-2 text-sm text-foreground-secondary">
          {t("refusalMessage")}
        </p>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg bg-background-secondary px-3 py-2">
          <p className="text-sm text-foreground">{turn.result.answer.answer}</p>
          <div className="flex flex-col gap-1 border-t border-border pt-2">
            <span className="text-xs font-medium text-foreground-secondary">{t("sourcesLabel")}</span>
            {turn.result.answer.sources.length === 0 ? (
              <span className="text-xs text-foreground-secondary">{t("noSources")}</span>
            ) : (
              turn.result.answer.sources.map((source) => (
                <p key={source.messageId} className="truncate text-xs text-foreground-secondary">
                  <span className="font-medium text-foreground">{source.authorName}:</span> {source.content}
                </p>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
