"use client";

import { Card, EmptyState } from "@/components/ui";

export default function EventsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl pt-10">
      <Card>
        <EmptyState
          action={
            <button
              className="bg-brand-900 hover:bg-brand-800 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              onClick={reset}
              type="button"
            >
              Erneut laden
            </button>
          }
          description="Die Eventdaten konnten nicht aus der Datenbank geladen werden. Prüfe die Datenbankverbindung und versuche es erneut."
          title="Events derzeit nicht verfügbar"
        />
      </Card>
    </div>
  );
}
