import {
  EventPhase,
  Prisma,
  TaskPriority,
  UserRole,
} from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

type DefaultTaskTemplate = Omit<
  Prisma.TaskTemplateCreateManyInput,
  "eventTemplateId"
>;

type DefaultEventTemplate = {
  name: string;
  description: string;
  tasks: DefaultTaskTemplate[];
};

function task(
  title: string,
  values: Omit<DefaultTaskTemplate, "title">,
): DefaultTaskTemplate {
  return { title, ...values };
}

const largeEventTasks: DefaultTaskTemplate[] = [
  task("Zielbild, Zielgruppe und Erfolgskriterien festlegen", {
    description:
      "Strategische Ziele, Zielgruppen, Nutzenversprechen und messbare Erfolgskriterien dokumentieren.",
    phase: EventPhase.CONCEPTION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.CRITICAL,
    offsetDays: -180,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Budgetrahmen und Kernteam bestätigen", {
    description:
      "Budget, Rollen, Entscheidungswege und feste Projekttermine für das Eventteam klären.",
    phase: EventPhase.CONCEPTION,
    defaultResponsibleRole: UserRole.ADMIN,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -175,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Grobkonzept und Format ausarbeiten", {
    description:
      "Dramaturgie, Programmlogik, Teilnehmernutzen und groben Zeitplan erarbeiten.",
    phase: EventPhase.CONCEPTION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -165,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Location-Shortlist erstellen", {
    description:
      "Geeignete Locations anhand Kapazität, Erreichbarkeit, Technik und Kosten vorprüfen.",
    phase: EventPhase.LOCATION_CATERING,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -155,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Partner- und Sponsoringpakete definieren", {
    description:
      "Mögliche Partnerrollen, Leistungen, Gegenleistungen und Ansprachelogik festlegen.",
    phase: EventPhase.SPEAKERS_PARTNERS,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.MEDIUM,
    offsetDays: -145,
    approvalRequired: true,
    isCritical: false,
  }),
  task("Speaker-Longlist erstellen", {
    description:
      "Potenzielle Keynotes, Panels und Praxisbeiträge sammeln und priorisieren.",
    phase: EventPhase.SPEAKERS_PARTNERS,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -135,
    approvalRequired: false,
    isCritical: false,
  }),
  task("Kommunikationsfahrplan aufsetzen", {
    description:
      "Kanäle, Meilensteine, Kernbotschaften und Freigabepunkte bis zum Event planen.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -125,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Location verbindlich reservieren", {
    description:
      "Raum, Nebenflächen, Zeiten, Stornofristen und technische Grundausstattung sichern.",
    phase: EventPhase.LOCATION_CATERING,
    defaultResponsibleRole: UserRole.ADMIN,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.CRITICAL,
    offsetDays: -115,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Keynote und Hauptbeiträge anfragen", {
    description:
      "Top-Speaker mit Thema, Erwartung, Zeitfenster und organisatorischem Rahmen anfragen.",
    phase: EventPhase.SPEAKERS_PARTNERS,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -105,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Anmeldeseite und Tracking-Konzept vorbereiten", {
    description:
      "Anmeldeformular, Pflichtfelder, Datenschutz, UTM-Logik und Reporting klären.",
    phase: EventPhase.PARTICIPANT_MANAGEMENT,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -95,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Save-the-Date versenden", {
    description:
      "Termin und Nutzenversprechen frühzeitig über priorisierte Verteiler kommunizieren.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -90,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Catering- und Technikbedarf spezifizieren", {
    description:
      "Teilnehmerziel, Raumsetup, Cateringzeiten, AV-Technik und Netzwerkbedarf ableiten.",
    phase: EventPhase.LOCATION_CATERING,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -80,
    approvalRequired: false,
    isCritical: false,
  }),
  task("Speaker und Partner final bestätigen", {
    description:
      "Zusagen, Rollen, Logos, Bios, Beitragsformate und Fristen verbindlich dokumentieren.",
    phase: EventPhase.SPEAKERS_PARTNERS,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -70,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Einladungskampagne starten", {
    description:
      "Einladung über Newsletter, Website, LinkedIn und Partnerkanäle veröffentlichen.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.CRITICAL,
    offsetDays: -60,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Programm und Ablaufplan finalisieren", {
    description:
      "Agenda, Übergänge, Moderation, Pausen und Verantwortlichkeiten final abstimmen.",
    phase: EventPhase.MATERIAL_PRESENTATION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -45,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Anmeldestand und Zielgruppenerreichung prüfen", {
    description:
      "Anmeldungen, Zielgruppenmix und Nachsteuerungsbedarf bewerten.",
    phase: EventPhase.PARTICIPANT_MANAGEMENT,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.COMMUNICATION,
    priority: TaskPriority.HIGH,
    offsetDays: -35,
    approvalRequired: false,
    isCritical: false,
  }),
  task("Run-of-Show und Vor-Ort-Rollen erstellen", {
    description:
      "Minutenplan, Rollen, Eskalationswege, Check-in und Speaker-Betreuung ausarbeiten.",
    phase: EventPhase.EVENT_DAY,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -28,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Präsentationen und Materialien einsammeln", {
    description:
      "Slides, Handouts, Logos, Namensschilder und Beschilderung zentral bereitstellen.",
    phase: EventPhase.MATERIAL_PRESENTATION,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -21,
    approvalRequired: false,
    isCritical: false,
  }),
  task("Finale Reminder-Kommunikation versenden", {
    description:
      "Angemeldete Personen informieren und relevante Kontakte erneut aktivieren.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -14,
    approvalRequired: false,
    isCritical: false,
  }),
  task("Technikcheck mit Location durchführen", {
    description:
      "Ton, Bild, Präsentationsrechner, Adapter, Licht, WLAN und Aufnahmebedarf testen.",
    phase: EventPhase.TECHNOLOGY,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.CRITICAL,
    offsetDays: -7,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Teilnehmerliste und Briefing finalisieren", {
    description:
      "Check-in-Liste, Cateringzahl, Teambriefing und Notfallkontakte final bereitstellen.",
    phase: EventPhase.PARTICIPANT_MANAGEMENT,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -2,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Event vor Ort steuern", {
    description:
      "Check-in, Ablauf, Zeitmanagement, Speaker-Betreuung und Problemlösung koordinieren.",
    phase: EventPhase.EVENT_DAY,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.CRITICAL,
    offsetDays: 0,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Feedback und Dank versenden", {
    description:
      "Feedbacklink, Dank, Unterlagen und nächste Schritte an Teilnehmende senden.",
    phase: EventPhase.FOLLOW_UP,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: 1,
    approvalRequired: false,
    isCritical: false,
  }),
  task("Auswertung und Debrief durchführen", {
    description:
      "Kennzahlen, Feedback, Learnings und Folgeaktivitäten gemeinsam bewerten.",
    phase: EventPhase.EVALUATION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: 7,
    approvalRequired: true,
    isCritical: false,
  }),
];

const inPersonWorkingGroupTasks: DefaultTaskTemplate[] = [
  task("Thema, Ziel und Zielgruppe schärfen", {
    description:
      "Fachliches Ziel, Zielgruppe, gewünschtes Ergebnis und Format festlegen.",
    phase: EventPhase.CONCEPTION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -56,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Raum und Grundsetup sichern", {
    description:
      "Raum, Bestuhlung, Erreichbarkeit und Verfügbarkeit für die Fachgruppe klären.",
    phase: EventPhase.LOCATION_CATERING,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -52,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Impulse und Moderation festlegen", {
    description:
      "Inputs, Diskussionslogik, Moderation und mögliche Praxisbeiträge planen.",
    phase: EventPhase.SPEAKERS_PARTNERS,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -49,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Einladung und Anmeldeseite vorbereiten", {
    description:
      "Einladungstext, Nutzenargument, Verteiler und Anmeldung erstellen.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -42,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Einladung versenden", {
    description:
      "Einladung an Fachgruppenverteiler, Partner und relevante Kontakte senden.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: null,
    priority: TaskPriority.CRITICAL,
    offsetDays: -35,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Cateringbedarf klären", {
    description:
      "Teilnehmerziel, Getränke, Snacks und besondere Bedarfe mit Location abstimmen.",
    phase: EventPhase.LOCATION_CATERING,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -28,
    approvalRequired: false,
    isCritical: false,
  }),
  task("Agenda und Arbeitsmaterial finalisieren", {
    description:
      "Agenda, Moderationsfragen, Präsentation und Arbeitsmaterial vorbereiten.",
    phase: EventPhase.MATERIAL_PRESENTATION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -21,
    approvalRequired: true,
    isCritical: false,
  }),
  task("Reminder versenden und Anmeldestand prüfen", {
    description:
      "Teilnehmerstand prüfen, gezielt nachfassen und Reminder verschicken.",
    phase: EventPhase.PARTICIPANT_MANAGEMENT,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -14,
    approvalRequired: false,
    isCritical: false,
  }),
  task("Technik und Raum vor Ort testen", {
    description:
      "Beamer, Ton, WLAN, Adapter, Raumlayout und Empfangssituation prüfen.",
    phase: EventPhase.TECHNOLOGY,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -7,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Teilnehmerliste und Rollen finalisieren", {
    description:
      "Teilnehmerliste, Empfang, Moderation, Fotodoku und Ansprechpartner festlegen.",
    phase: EventPhase.EVENT_DAY,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -2,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Fachgruppenveranstaltung durchführen", {
    description:
      "Ablauf moderieren, Diskussion steuern und Ergebnisse sichern.",
    phase: EventPhase.EVENT_DAY,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.CRITICAL,
    offsetDays: 0,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Follow-up und Ergebnisnotiz versenden", {
    description:
      "Dank, zentrale Ergebnisse, Unterlagen und nächste Termine kommunizieren.",
    phase: EventPhase.FOLLOW_UP,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: 2,
    approvalRequired: false,
    isCritical: false,
  }),
  task("Learnings dokumentieren", {
    description:
      "Teilnehmerfeedback, fachliche Erkenntnisse und nächste Schritte festhalten.",
    phase: EventPhase.EVALUATION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: 7,
    approvalRequired: false,
    isCritical: false,
  }),
];

const virtualWorkingGroupTasks: DefaultTaskTemplate[] = [
  task("Thema, Ziel und virtuelles Format festlegen", {
    description:
      "Ziel, Zielgruppe, Ablauf, Interaktionsgrad und gewünschtes Ergebnis klären.",
    phase: EventPhase.CONCEPTION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -42,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Videoplattform und Zugangskonzept klären", {
    description:
      "Tool, Linklogik, Warteraum, Datenschutz, Rechte und technische Betreuung festlegen.",
    phase: EventPhase.TECHNOLOGY,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.CRITICAL,
    offsetDays: -38,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Impulse und Moderation bestätigen", {
    description:
      "Speaker, Moderation, Interaktionselemente und Zeitfenster verbindlich festlegen.",
    phase: EventPhase.SPEAKERS_PARTNERS,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -35,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Einladung und Registrierung vorbereiten", {
    description:
      "Einladung, Registrierungslink, Kalendereintrag und Teilnahmehinweise erstellen.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -30,
    approvalRequired: true,
    isCritical: true,
  }),
  task("Einladung versenden", {
    description:
      "Einladung über Fachgruppenverteiler und passende Partnerkanäle versenden.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: null,
    priority: TaskPriority.CRITICAL,
    offsetDays: -28,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Virtuelle Agenda und Moderationsleitfaden erstellen", {
    description:
      "Ablauf, Chat-/Q&A-Regeln, Breakouts, Übergänge und Backup-Plan vorbereiten.",
    phase: EventPhase.MATERIAL_PRESENTATION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -21,
    approvalRequired: true,
    isCritical: false,
  }),
  task("Reminder mit Teilnahmelink versenden", {
    description:
      "Registrierte und relevante Kontakte mit Nutzenargument und Zugangslink erinnern.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -14,
    approvalRequired: false,
    isCritical: false,
  }),
  task("Technikprobe mit Speaker durchführen", {
    description:
      "Audio, Kamera, Bildschirmfreigabe, Rollen, Aufzeichnung und Backup-Kanal testen.",
    phase: EventPhase.TECHNOLOGY,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.CRITICAL,
    offsetDays: -7,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Teilnehmerliste und Zugangsmail finalisieren", {
    description:
      "Registrierte Personen, Zugangslink, Kalendereintrag und Supportkontakt prüfen.",
    phase: EventPhase.PARTICIPANT_MANAGEMENT,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -3,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Finalen Plattformcheck durchführen", {
    description:
      "Meetingraum, Rechte, Präsentation, Aufzeichnung und Co-Host-Rollen final testen.",
    phase: EventPhase.TECHNOLOGY,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -1,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Virtuelle Fachgruppe durchführen", {
    description:
      "Meeting öffnen, technische Betreuung sicherstellen, Moderation begleiten und Ergebnisse sichern.",
    phase: EventPhase.EVENT_DAY,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.CRITICAL,
    offsetDays: 0,
    approvalRequired: false,
    isCritical: true,
  }),
  task("Aufzeichnung, Unterlagen und Follow-up versenden", {
    description:
      "Dank, Unterlagen, Aufzeichnung, Kontaktpunkte und nächste Schritte verschicken.",
    phase: EventPhase.FOLLOW_UP,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: 1,
    approvalRequired: false,
    isCritical: false,
  }),
  task("Virtuelles Format auswerten", {
    description:
      "Teilnahme, Interaktion, Feedback und Verbesserungen für nächste virtuelle Termine dokumentieren.",
    phase: EventPhase.EVALUATION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: 7,
    approvalRequired: false,
    isCritical: false,
  }),
];

export const defaultEventTemplates: DefaultEventTemplate[] = [
  {
    name: "Große Veranstaltung",
    description:
      "Umfangreiche DIWISH-Veranstaltung mit sechs Monaten Vorlauf, Partnern, Kommunikation, Location, Technik und Nachbereitung.",
    tasks: largeEventTasks,
  },
  {
    name: "Fachgruppenveranstaltung (Präsenz)",
    description:
      "Kompakter Präsenztermin für eine Fachgruppe mit acht Wochen Vorlauf, Raum, Catering, Materialien und Follow-up.",
    tasks: inPersonWorkingGroupTasks,
  },
  {
    name: "Fachgruppenveranstaltung (virtuell)",
    description:
      "Virtuelle Fachgruppenveranstaltung mit sechs Wochen Vorlauf, Plattformcheck, Zugangslogik, Moderation und Follow-up.",
    tasks: virtualWorkingGroupTasks,
  },
];

export async function ensureDefaultEventTemplates(db = getDb()) {
  let templateCount = 0;
  let taskCount = 0;

  for (const definition of defaultEventTemplates) {
    await db.$transaction(async (transaction) => {
      const template = await transaction.eventTemplate.upsert({
        where: { name: definition.name },
        create: {
          name: definition.name,
          description: definition.description,
        },
        update: {
          description: definition.description,
        },
      });

      await transaction.taskTemplate.deleteMany({
        where: { eventTemplateId: template.id },
      });

      await transaction.taskTemplate.createMany({
        data: definition.tasks.map((templateTask) => ({
          ...templateTask,
          eventTemplateId: template.id,
        })),
      });
    });

    templateCount += 1;
    taskCount += definition.tasks.length;
  }

  return { templateCount, taskCount };
}
