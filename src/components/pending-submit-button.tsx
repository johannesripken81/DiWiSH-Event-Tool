"use client";

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
  // Only disable for the real form pending state. Disabling on click can
  // cancel native form submission before the server action starts.

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-65`}
      disabled={pending}
      title={title}
      type="submit"
    >
      <span aria-live="polite">{pending ? pendingLabel : children}</span>
    </button>
  );
}
