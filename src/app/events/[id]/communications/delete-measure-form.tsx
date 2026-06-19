"use client";

import { useFormStatus } from "react-dom";

import { deleteCommunicationMeasureAction } from "./actions";

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-8 items-center rounded-md bg-red-50 px-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Löschen..." : "Löschen"}
    </button>
  );
}

export function DeleteMeasureForm({
  eventId,
  measureId,
}: {
  eventId: string;
  measureId: string;
}) {
  return (
    <form
      action={deleteCommunicationMeasureAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Soll diese Kommunikationsmaßnahme wirklich gelöscht werden?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="eventId" type="hidden" value={eventId} />
      <input name="measureId" type="hidden" value={measureId} />
      <DeleteButton />
    </form>
  );
}
