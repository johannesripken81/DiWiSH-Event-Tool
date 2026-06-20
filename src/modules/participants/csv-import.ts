import {
  combineParticipantName,
  optionalParticipantValue,
} from "./participant-form";

export type ParticipantCsvMapping = {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
};

export type MappedParticipantCsvRow = {
  name: string;
  email: string;
  organization: string | null;
};

export const maxParticipantCsvFileSizeBytes = 1_000_000;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function detectDelimiter(headerLine: string) {
  const candidates = [";", ",", "\t"] as const;

  return candidates
    .map((delimiter) => ({
      delimiter,
      count: headerLine.split(delimiter).length,
    }))
    .sort((first, second) => second.count - first.count)[0].delimiter;
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());

  return values;
}

export function parseParticipantCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], records: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header) =>
    header.trim(),
  );
  const records = lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);

    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]?.trim() ?? ""]),
    );
  });

  return { headers, records };
}

export function parseParticipantCsvHeaders(text: string) {
  return parseParticipantCsv(text).headers;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getValue(record: Record<string, string>, column: string) {
  return column ? (record[column]?.trim() ?? "") : "";
}

export function mapParticipantCsvRows(
  text: string,
  mapping: ParticipantCsvMapping,
) {
  const { records } = parseParticipantCsv(text);
  const rows: MappedParticipantCsvRow[] = [];
  let skipped = 0;

  for (const record of records) {
    const firstName = getValue(record, mapping.firstName);
    const lastName = getValue(record, mapping.lastName);
    const email = normalizeEmail(getValue(record, mapping.email));
    const organization = getValue(record, mapping.organization);
    const name = combineParticipantName(firstName, lastName);

    if (!name || !emailPattern.test(email)) {
      skipped += 1;
      continue;
    }

    rows.push({
      name,
      email,
      organization: optionalParticipantValue(organization),
    });
  }

  return { rows, skipped };
}

export function guessParticipantCsvColumn(
  headers: string[],
  purpose: keyof ParticipantCsvMapping,
) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: header.toLowerCase().replace(/[\s_-]/g, ""),
  }));
  const candidates: Record<keyof ParticipantCsvMapping, string[]> = {
    firstName: ["vorname", "firstname", "first"],
    lastName: ["nachname", "lastname", "last", "surname"],
    email: ["email", "emailadresse", "e-mail", "mail"],
    organization: ["organisation", "organization", "firma", "unternehmen"],
  };

  return (
    normalizedHeaders.find((header) =>
      candidates[purpose].includes(header.normalized),
    )?.original ?? ""
  );
}
