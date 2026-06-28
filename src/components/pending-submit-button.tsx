"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  ariaLabel,
  ariaPressed,
  children,
  className,
  pendingLabel = "Speichert...",
  title,
}: {
  ariaLabel?: string;
  ariaPressed?: boolean;
  children: React.ReactNode;
  className: string;
  pendingLabel?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  const [optimisticPending, setOptimisticPending] = useState(false);
  const isPending = pending || optimisticPending;

  useEffect(() => {
    if (!pending && optimisticPending) {
      const timeout = window.setTimeout(() => {
        setOptimisticPending(false);
      }, 1200);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [optimisticPending, pending]);

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-disabled={isPending}
      className={`${className} disabled:cursor-wait disabled:opacity-65`}
      disabled={isPending}
      onClick={() => setOptimisticPending(true)}
      title={title}
      type="submit"
    >
      <span aria-live="polite">{isPending ? pendingLabel : children}</span>
    </button>
  );
}
