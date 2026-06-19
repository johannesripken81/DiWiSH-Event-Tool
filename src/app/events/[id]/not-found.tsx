import Link from "next/link";

import { Card, EmptyState } from "@/components/ui";

export default function EventNotFound() {
  return (
    <div className="mx-auto max-w-2xl pt-10">
      <Card>
        <EmptyState
          action={
            <Link
              className="bg-brand-900 hover:bg-brand-800 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white"
              href="/events"
            >
              Zur Eventliste
            </Link>
          }
          description="Das Event wurde nicht gefunden oder ist nicht mehr verfügbar."
          title="Event nicht gefunden"
        />
      </Card>
    </div>
  );
}
