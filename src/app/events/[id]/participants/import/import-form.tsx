"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import {
  guessParticipantCsvColumn,
  parseParticipantCsvHeaders,
} from "@/modules/participants/csv-import";

import { importParticipantsCsvAction } from "../actions";

type Mapping = {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="bg-brand-900 hover:bg-brand-800 inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "CSV wird importiert..." : "CSV importieren"}
    </button>
  );
}

function ColumnSelect({
  label,
  name,
  headers,
  value,
  onChange,
  required = false,
}: {
  label: string;
  name: string;
  headers: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <select
        className="focus:border-brand-500 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none"
        name={name}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      >
        <option value="">Nicht zuordnen</option>
        {headers.map((header) => (
          <option key={header} value={header}>
            {header}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ParticipantImportForm({ eventId }: { eventId: string }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Mapping>({
    firstName: "",
    lastName: "",
    email: "",
    organization: "",
  });

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setHeaders([]);
      setError(null);
      return;
    }

    const text = await file.text();
    const parsedHeaders = parseParticipantCsvHeaders(text);

    if (parsedHeaders.length === 0) {
      setHeaders([]);
      setError("Die CSV-Datei enthält keine Kopfzeile.");
      return;
    }

    setHeaders(parsedHeaders);
    setError(null);
    setMapping({
      firstName: guessParticipantCsvColumn(parsedHeaders, "firstName"),
      lastName: guessParticipantCsvColumn(parsedHeaders, "lastName"),
      email: guessParticipantCsvColumn(parsedHeaders, "email"),
      organization: guessParticipantCsvColumn(parsedHeaders, "organization"),
    });
  }

  const canSubmit =
    headers.length > 0 &&
    Boolean(mapping.firstName) &&
    Boolean(mapping.lastName) &&
    Boolean(mapping.email);

  return (
    <form action={importParticipantsCsvAction} className="space-y-6">
      <input name="eventId" type="hidden" value={eventId} />

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-brand-950 font-bold">CSV-Datei auswählen</h2>
          <p className="text-muted mt-1 text-xs">
            Erwartet wird eine Kopfzeile, zum Beispiel: Vorname, Nachname,
            E-Mail, Organisation.
          </p>
        </div>
        <div className="p-5">
          <input
            accept=".csv,text/csv"
            className="file:bg-brand-900 block w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            name="csvFile"
            onChange={handleFileChange}
            required
            type="file"
          />
          {error ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {error}
            </p>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-brand-950 font-bold">Spalten zuordnen</h2>
          <p className="text-muted mt-1 text-xs">
            Wähle aus, welche CSV-Spalte in welches Feld übernommen werden soll.
          </p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <ColumnSelect
            headers={headers}
            label="Vorname"
            name="firstNameColumn"
            onChange={(value) =>
              setMapping((current) => ({ ...current, firstName: value }))
            }
            required
            value={mapping.firstName}
          />
          <ColumnSelect
            headers={headers}
            label="Nachname"
            name="lastNameColumn"
            onChange={(value) =>
              setMapping((current) => ({ ...current, lastName: value }))
            }
            required
            value={mapping.lastName}
          />
          <ColumnSelect
            headers={headers}
            label="E-Mail"
            name="emailColumn"
            onChange={(value) =>
              setMapping((current) => ({ ...current, email: value }))
            }
            required
            value={mapping.email}
          />
          <ColumnSelect
            headers={headers}
            label="Organisation"
            name="organizationColumn"
            onChange={(value) =>
              setMapping((current) => ({ ...current, organization: value }))
            }
            value={mapping.organization}
          />
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          href={`/events/${eventId}/participants`}
        >
          Abbrechen
        </Link>
        <SubmitButton disabled={!canSubmit} />
      </div>
    </form>
  );
}
