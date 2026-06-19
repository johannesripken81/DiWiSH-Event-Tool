"use client";

import { deleteParticipantAction } from "./actions";

export function DeleteParticipantForm({
  eventId,
  participantId,
  participantName,
}: {
  eventId: string;
  participantId: string;
  participantName: string;
}) {
  return (
    <form
      action={deleteParticipantAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Soll „${participantName}“ wirklich aus der Teilnehmerliste gelöscht werden?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="eventId" type="hidden" value={eventId} />
      <input name="participantId" type="hidden" value={participantId} />
      <button
        className="inline-flex min-h-8 items-center rounded-md border border-red-200 bg-white px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50"
        type="submit"
      >
        Löschen
      </button>
    </form>
  );
}
