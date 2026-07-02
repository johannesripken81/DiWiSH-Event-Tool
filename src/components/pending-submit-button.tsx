"use client";

import { useState } from "react";
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
  const isToggle = typeof ariaPressed === "boolean";
  const [optimisticPressed, setOptimisticPressed] = useState(ariaPressed);
  const visualPressed = isToggle ? optimisticPressed === true : ariaPressed;
  const toggleClass = isToggle
    ? visualPressed
      ? " !border-emerald-600 !bg-emerald-600 !text-white"
      : " !border-slate-300 !bg-white !text-transparent"
    : "";
  // Only disable for the real form pending state. Disabling on click can
  // cancel native form submission before the server action starts.

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={visualPressed}
      aria-disabled={pending}
      className={`${className}${toggleClass} disabled:cursor-default disabled:opacity-65`}
      disabled={pending}
      onClick={() => {
        if (isToggle) {
          setOptimisticPressed(!visualPressed);
        }
      }}
      title={title}
      type="submit"
    >
      <span aria-live="polite">
        {isToggle && visualPressed ? "\u2713" : pending ? pendingLabel : children}
      </span>
    </button>
  );
}
