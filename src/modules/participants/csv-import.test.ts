import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  guessParticipantCsvColumn,
  mapParticipantCsvRows,
  parseParticipantCsvHeaders,
} from "./csv-import";

describe("Teilnehmer-CSV-Import", () => {
  it("liest Kopfzeilen und ordnet typische Spalten automatisch zu", () => {
    const headers = parseParticipantCsvHeaders(
      "Vorname;Nachname;E-Mail;Organisation\nAda;Lovelace;ada@example.org;DIWISH",
    );

    assert.deepEqual(headers, [
      "Vorname",
      "Nachname",
      "E-Mail",
      "Organisation",
    ]);
    assert.equal(guessParticipantCsvColumn(headers, "firstName"), "Vorname");
    assert.equal(guessParticipantCsvColumn(headers, "lastName"), "Nachname");
    assert.equal(guessParticipantCsvColumn(headers, "email"), "E-Mail");
    assert.equal(
      guessParticipantCsvColumn(headers, "organization"),
      "Organisation",
    );
  });

  it("erzeugt Kontaktzeilen aus der Spaltenzuordnung und überspringt ungültige E-Mails", () => {
    const result = mapParticipantCsvRows(
      [
        "Vorname,Nachname,E-Mail,Organisation",
        "Ada,Lovelace,ada@example.org,DIWISH",
        "Grace,Hopper,keine-mail,Marine",
      ].join("\n"),
      {
        firstName: "Vorname",
        lastName: "Nachname",
        email: "E-Mail",
        organization: "Organisation",
      },
    );

    assert.deepEqual(result.rows, [
      {
        name: "Ada Lovelace",
        email: "ada@example.org",
        organization: "DIWISH",
      },
    ]);
    assert.equal(result.skipped, 1);
  });
});
