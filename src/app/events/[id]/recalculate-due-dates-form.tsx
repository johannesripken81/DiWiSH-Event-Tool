"use client";

import { useFormStatus } from "react-dom";

import { recalculateTaskDueDatesAction } from "./planning-actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="bg-brand-900 hover:bg-brand-800 mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending
        ? "Fälligkeiten werden berechnet..."
        : "Fälligkeiten aus Eventdatum neu berechnen"}
    </button>
  );
}

export function RecalculateDueDatesForm({
  eventId,
  tasksWithOffset,
  manualOverrideCount,
}: {
  eventId: string;
  tasksWithOffset: number;
  manualOverrideCount: number;
}) {
  return (
    <form action={recalculateTaskDueDatesAction}>
      <input name="eventId" type="hidden" value={eventId} />
      <p className="text-sm leading-6 text-slate-600">
        Berechnet die Fälligkeiten von {tasksWithOffset} Aufgaben erneut aus
        Eventdatum und Offset.
      </p>

      {manualOverrideCount > 0 ? (
        <label className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <input
            className="mt-0.5 size-4 rounded border-amber-400 text-amber-700"
            name="overwriteManualOverrides"
            type="checkbox"
          />
          <span className="text-xs leading-5 text-amber-900">
            Auch {manualOverrideCount} manuell überschriebene{" "}
            {manualOverrideCount === 1 ? "Fälligkeit" : "Fälligkeiten"} neu
            berechnen. Die manuellen Termine werden dadurch ausdrücklich
            ersetzt.
          </span>
        </label>
      ) : null}

      <SubmitButton />
    </form>
  );
}
