import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  EventPhase,
  EventStatus,
  Prisma,
  PrismaClient,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { calculateDueDate } from "../src/modules/tasks/reverse-planning";

const connectionString = process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is not configured. Add the direct Neon connection string to .env.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const users = [
  {
    key: "johannes",
    name: "Johannes Ripken",
    email: "mail@diwish.de",
    role: UserRole.ADMIN,
  },
  {
    key: "verena",
    name: "Verena",
    email: "verena@diwish.de",
    role: UserRole.EVENT_LEAD,
  },
  {
    key: "karin",
    name: "Karin",
    email: "karin@diwish.de",
    role: UserRole.ADMIN,
  },
  {
    key: "emely",
    name: "Emely",
    email: "emely@diwish.de",
    role: UserRole.COMMUNICATION,
  },
  {
    key: "inga",
    name: "Inga",
    email: "inga@diwish.de",
    role: UserRole.TEAM_MEMBER,
  },
  {
    key: "moni",
    name: "Moni",
    email: "moni@diwish.de",
    role: UserRole.TEAM_MEMBER,
  },
] as const;

const seedUserPassword =
  process.env.APP_SEED_USER_PASSWORD?.trim() || "EventTool-Start-2026!";

if (
  !process.env.APP_SEED_USER_PASSWORD?.trim() &&
  process.env.NODE_ENV === "production"
) {
  throw new Error("APP_SEED_USER_PASSWORD muss in Produktion gesetzt sein.");
}

const seedUserPasswordHash = hashPassword(seedUserPassword);

type SeedTaskTemplate = Omit<
  Prisma.TaskTemplateCreateManyInput,
  "eventTemplateId"
>;

const taskTemplates: SeedTaskTemplate[] = [
  {
    title: "Ziel und Zielgruppe definieren",
    description:
      "Veranstaltungsziel, Zielgruppen und deren zentrale Bedarfe dokumentieren.",
    phase: EventPhase.CONCEPTION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -90,
    approvalRequired: true,
    isCritical: true,
  },
  {
    title: "Nutzenversprechen formulieren",
    description:
      "Den konkreten Mehrwert der Veranstaltung für die Zielgruppen formulieren.",
    phase: EventPhase.CONCEPTION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -85,
    approvalRequired: true,
    isCritical: false,
  },
  {
    title: "Gewünschtes Ergebnis und Erfolgskriterien festlegen",
    description:
      "Messbare Ergebnisse und Kriterien für eine erfolgreiche Veranstaltung festhalten.",
    phase: EventPhase.CONCEPTION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -85,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Konzept im Vier-Augen-Prinzip prüfen",
    description:
      "Konzept, Zielsetzung und geplanten Ablauf unabhängig prüfen und freigeben.",
    phase: EventPhase.FOUR_EYES_REVIEW,
    defaultResponsibleRole: UserRole.ADMIN,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -80,
    approvalRequired: true,
    isCritical: true,
  },
  {
    title: "Raum/Location klären",
    description:
      "Verfügbarkeit, Kapazität, Barrierefreiheit und Rahmenbedingungen der Location klären.",
    phase: EventPhase.LOCATION_CATERING,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.CRITICAL,
    offsetDays: -75,
    approvalRequired: false,
    isCritical: true,
  },
  {
    title: "Catering anfragen",
    description:
      "Cateringbedarf ermitteln und ein passendes Angebot einschließlich Optionen anfragen.",
    phase: EventPhase.LOCATION_CATERING,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -60,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Location und Catering final bestätigen",
    description:
      "Location und Catering auf Basis der erwarteten Teilnehmerzahl verbindlich bestätigen.",
    phase: EventPhase.LOCATION_CATERING,
    defaultResponsibleRole: UserRole.ADMIN,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -30,
    approvalRequired: true,
    isCritical: true,
  },
  {
    title: "Speaker identifizieren",
    description:
      "Geeignete Speaker und Partner passend zu Zielgruppe und Veranstaltungsthema auswählen.",
    phase: EventPhase.SPEAKERS_PARTNERS,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -75,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Speaker anfragen",
    description:
      "Speaker mit Thema, Format, Termin und organisatorischen Eckdaten anfragen.",
    phase: EventPhase.SPEAKERS_PARTNERS,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -70,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Speaker und Partner final bestätigen",
    description:
      "Zusagen, Beiträge, Ansprechpartner und Nutzungsrechte verbindlich dokumentieren.",
    phase: EventPhase.SPEAKERS_PARTNERS,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -45,
    approvalRequired: true,
    isCritical: true,
  },
  {
    title: "Einladungstext erstellen",
    description:
      "Einladungstext mit Nutzenversprechen, Agenda, Termin und Handlungsaufforderung erstellen.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -60,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Einladungstext freigeben",
    description:
      "Inhalt, Tonalität, Veranstaltungsdaten und Anmeldelink prüfen und freigeben.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -55,
    approvalRequired: true,
    isCritical: false,
  },
  {
    title: "Einladung versenden",
    description:
      "Freigegebene Einladung an den abgestimmten Verteiler versenden.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: null,
    priority: TaskPriority.CRITICAL,
    offsetDays: -45,
    approvalRequired: false,
    isCritical: true,
  },
  {
    title: "Social-Media-Post veröffentlichen",
    description:
      "Veranstaltung über die vorgesehenen Social-Media-Kanäle veröffentlichen.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -21,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Reminder versenden",
    description:
      "Angemeldete und relevante noch nicht angemeldete Kontakte gezielt erinnern.",
    phase: EventPhase.COMMUNICATION,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -14,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Anmeldeseite erstellen und testen",
    description:
      "Anmeldeseite inklusive Pflichtfeldern, Bestätigung und Datenschutzangaben testen.",
    phase: EventPhase.PARTICIPANT_MANAGEMENT,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: -50,
    approvalRequired: true,
    isCritical: true,
  },
  {
    title: "Anmeldestand prüfen",
    description:
      "Anmeldungen, Zielgruppenerreichung und mögliche Nachsteuerung bewerten.",
    phase: EventPhase.PARTICIPANT_MANAGEMENT,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -21,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Teilnehmerliste finalisieren",
    description:
      "Teilnehmerliste bereinigen und für Empfang, Catering und Organisation bereitstellen.",
    phase: EventPhase.PARTICIPANT_MANAGEMENT,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -2,
    approvalRequired: false,
    isCritical: true,
  },
  {
    title: "Agenda und Ablauf finalisieren",
    description:
      "Agenda, Moderationsablauf, Zeitfenster und Übergaben verbindlich abstimmen.",
    phase: EventPhase.MATERIAL_PRESENTATION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: -21,
    approvalRequired: true,
    isCritical: false,
  },
  {
    title: "Präsentationen einsammeln und zusammenführen",
    description:
      "Präsentationen einholen, auf Funktionsfähigkeit prüfen und zentral bereitstellen.",
    phase: EventPhase.MATERIAL_PRESENTATION,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -7,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Technikbedarf klären",
    description:
      "Bedarf an Präsentationstechnik, Mikrofonen, Ton, Licht und Netzwerk klären.",
    phase: EventPhase.TECHNOLOGY,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: -30,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Technikcheck planen",
    description:
      "Verantwortliche, Zeitfenster und Prüfpunkte für den technischen Probelauf festlegen.",
    phase: EventPhase.TECHNOLOGY,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -7,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Präsentation und Mikrofone testen",
    description:
      "Präsentationsrechner, Adapter, Klicker, Ton und Mikrofone vor Ort vollständig testen.",
    phase: EventPhase.TECHNOLOGY,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.CRITICAL,
    offsetDays: -1,
    approvalRequired: false,
    isCritical: true,
  },
  {
    title: "Vor-Ort-Rollen verteilen",
    description:
      "Empfang, Moderation, Technik, Speaker-Betreuung und Dokumentation verbindlich zuweisen.",
    phase: EventPhase.EVENT_DAY,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: -7,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Materialien und Beschilderung aufbauen",
    description:
      "Namensschilder, Wegweiser, Teilnehmerunterlagen und Raumaufbau fertigstellen.",
    phase: EventPhase.EVENT_DAY,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.HIGH,
    offsetDays: 0,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Begrüßung und Ablauf steuern",
    description:
      "Veranstaltung eröffnen, Zeitplan halten und Übergaben während des Events koordinieren.",
    phase: EventPhase.EVENT_DAY,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.CRITICAL,
    offsetDays: 0,
    approvalRequired: false,
    isCritical: true,
  },
  {
    title: "Feedback versenden",
    description:
      "Feedbackformular mit kurzer persönlicher Nachricht an die Teilnehmenden versenden.",
    phase: EventPhase.FOLLOW_UP,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: 1,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Follow-up-Mails versenden",
    description:
      "Dank, Unterlagen, Kontakte und vereinbarte nächste Schritte versenden.",
    phase: EventPhase.FOLLOW_UP,
    defaultResponsibleRole: UserRole.COMMUNICATION,
    defaultReviewerRole: UserRole.EVENT_LEAD,
    priority: TaskPriority.HIGH,
    offsetDays: 3,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Learnings dokumentieren",
    description:
      "Erfahrungen, Kennzahlen, Feedback und Verbesserungsideen strukturiert festhalten.",
    phase: EventPhase.EVALUATION,
    defaultResponsibleRole: UserRole.TEAM_MEMBER,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: 7,
    approvalRequired: false,
    isCritical: false,
  },
  {
    title: "Debrief durchführen",
    description:
      "Ergebnisse und Learnings im Team besprechen und Folgemaßnahmen vereinbaren.",
    phase: EventPhase.EVALUATION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: UserRole.ADMIN,
    priority: TaskPriority.HIGH,
    offsetDays: 10,
    approvalRequired: true,
    isCritical: false,
  },
];

const dependencies = [
  ["Nutzenversprechen formulieren", "Ziel und Zielgruppe definieren"],
  ["Konzept im Vier-Augen-Prinzip prüfen", "Nutzenversprechen formulieren"],
  ["Speaker anfragen", "Speaker identifizieren"],
  ["Einladungstext freigeben", "Einladungstext erstellen"],
  ["Einladung versenden", "Einladungstext freigeben"],
  ["Einladung versenden", "Anmeldeseite erstellen und testen"],
  ["Technikcheck planen", "Technikbedarf klären"],
  ["Präsentation und Mikrofone testen", "Technikcheck planen"],
  ["Teilnehmerliste finalisieren", "Anmeldestand prüfen"],
  ["Debrief durchführen", "Learnings dokumentieren"],
] as const;

function getDemoEventDate() {
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  date.setUTCDate(date.getUTCDate() + 56);

  if (date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 2);
  } else if (date.getUTCDay() === 0) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
}

async function upsertUsers() {
  const oldJohannesEmail = "johannes.ripken@diwish.de";
  const johannesUser = users.find((user) => user.key === "johannes");

  if (johannesUser) {
    const [oldJohannes, currentJohannes] = await Promise.all([
      prisma.user.findUnique({ where: { email: oldJohannesEmail } }),
      prisma.user.findUnique({ where: { email: johannesUser.email } }),
    ]);

    if (oldJohannes && !currentJohannes) {
      await prisma.user.update({
        where: { id: oldJohannes.id },
        data: {
          email: johannesUser.email,
          name: johannesUser.name,
          passwordHash: seedUserPasswordHash,
          role: johannesUser.role,
        },
      });
    }
  }

  const records = await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          passwordHash: seedUserPasswordHash,
          role: user.role,
        },
        create: {
          name: user.name,
          email: user.email,
          passwordHash: seedUserPasswordHash,
          role: user.role,
        },
      }),
    ),
  );

  return Object.fromEntries(
    users.map((user, index) => [user.key, records[index]]),
  ) as Record<(typeof users)[number]["key"], (typeof records)[number]>;
}

function getResponsibleUserId(
  role: UserRole,
  userRecords: Awaited<ReturnType<typeof upsertUsers>>,
  taskIndex: number,
) {
  switch (role) {
    case UserRole.ADMIN:
      return userRecords.karin.id;
    case UserRole.EVENT_LEAD:
      return userRecords.johannes.id;
    case UserRole.COMMUNICATION:
      return userRecords.emely.id;
    case UserRole.TEAM_MEMBER:
      return taskIndex % 2 === 0 ? userRecords.inga.id : userRecords.moni.id;
    case UserRole.GUEST:
      return null;
  }
}

function getReviewerUserId(
  role: UserRole | null,
  userRecords: Awaited<ReturnType<typeof upsertUsers>>,
) {
  switch (role) {
    case UserRole.ADMIN:
      return userRecords.karin.id;
    case UserRole.EVENT_LEAD:
      return userRecords.verena.id;
    case UserRole.COMMUNICATION:
      return userRecords.emely.id;
    case UserRole.TEAM_MEMBER:
      return userRecords.moni.id;
    case UserRole.GUEST:
    case null:
      return null;
  }
}

async function seedTemplate() {
  const eventTemplate = await prisma.eventTemplate.upsert({
    where: { name: "Netzwerktreffen" },
    update: {
      description:
        "Standardisierte Planung eines DIWISH-Netzwerktreffens von der Konzeption bis zur Evaluation.",
    },
    create: {
      name: "Netzwerktreffen",
      description:
        "Standardisierte Planung eines DIWISH-Netzwerktreffens von der Konzeption bis zur Evaluation.",
    },
  });

  await prisma.taskTemplate.deleteMany({
    where: { eventTemplateId: eventTemplate.id },
  });

  await prisma.taskTemplate.createMany({
    data: taskTemplates.map((task) => ({
      ...task,
      eventTemplateId: eventTemplate.id,
    })),
  });

  return eventTemplate;
}

async function seedDemoEvent(
  eventTemplateId: string,
  userRecords: Awaited<ReturnType<typeof upsertUsers>>,
) {
  const eventDate = getDemoEventDate();
  const eventData = {
    description:
      "Demo-Veranstaltung zur gemeinsamen Planung eines DIWISH-Netzwerktreffens rund um KI-Anwendungen im Mittelstand.",
    eventDate,
    startTime: new Date("1970-01-01T16:00:00.000Z"),
    endTime: new Date("1970-01-01T19:00:00.000Z"),
    location: "Kiel",
    format: "Netzwerktreffen",
    goal: "Unternehmen und Technologiepartner zu praxistauglichen KI-Anwendungen vernetzen.",
    targetAudience:
      "Unternehmen, Mittelstand, Technologieanbieter, Hochschule/Forschung",
    valueProposition:
      "Praxisnahe Einblicke, qualifizierte Kontakte und konkrete nächste Schritte für KI-Projekte.",
    desiredOutcome:
      "Neue Kooperationen und umsetzbare KI-Impulse für den Mittelstand.",
    eventLeadId: userRecords.johannes.id,
    coLeadId: userRecords.verena.id,
    communicationOwnerId: userRecords.emely.id,
    participantGoal: 60,
    status: EventStatus.PLANNING,
  } satisfies Omit<Prisma.EventUncheckedCreateInput, "title">;

  const existingEvent = await prisma.event.findFirst({
    where: { title: "DIWISH Netzwerktreffen KI & Mittelstand" },
    orderBy: { createdAt: "asc" },
  });

  const event = existingEvent
    ? await prisma.event.update({
        where: { id: existingEvent.id },
        data: eventData,
      })
    : await prisma.event.create({
        data: {
          title: "DIWISH Netzwerktreffen KI & Mittelstand",
          ...eventData,
        },
      });

  await prisma.eventTask.deleteMany({
    where: { eventId: event.id },
  });

  const templates = await prisma.taskTemplate.findMany({
    where: { eventTemplateId },
    orderBy: [{ offsetDays: "asc" }, { title: "asc" }],
  });

  const createdTasks = await Promise.all(
    templates.map((template, taskIndex) =>
      prisma.eventTask.create({
        data: {
          eventId: event.id,
          title: template.title,
          description: template.description,
          phase: template.phase,
          responsibleUserId: getResponsibleUserId(
            template.defaultResponsibleRole,
            userRecords,
            taskIndex,
          ),
          reviewerUserId: getReviewerUserId(
            template.defaultReviewerRole,
            userRecords,
          ),
          status: TaskStatus.OPEN,
          priority: template.priority,
          dueDate: calculateDueDate(eventDate, template.offsetDays),
          offsetDays: template.offsetDays,
          approvalRequired: template.approvalRequired,
          isCritical: template.isCritical,
        },
      }),
    ),
  );

  const tasksByTitle = new Map(createdTasks.map((task) => [task.title, task]));

  await prisma.taskDependency.createMany({
    data: dependencies.map(([taskTitle, dependencyTitle]) => {
      const task = tasksByTitle.get(taskTitle);
      const dependsOnTask = tasksByTitle.get(dependencyTitle);

      if (!task || !dependsOnTask) {
        throw new Error(
          `Task dependency could not be resolved: ${taskTitle} -> ${dependencyTitle}`,
        );
      }

      return {
        taskId: task.id,
        dependsOnTaskId: dependsOnTask.id,
      };
    }),
  });

  return {
    event,
    taskCount: createdTasks.length,
  };
}

async function main() {
  const userRecords = await upsertUsers();
  const eventTemplate = await seedTemplate();
  const { event, taskCount } = await seedDemoEvent(
    eventTemplate.id,
    userRecords,
  );

  const [userCount, taskTemplateCount, eventTaskCount] = await Promise.all([
    prisma.user.count({
      where: {
        email: {
          in: users.map((user) => user.email),
        },
      },
    }),
    prisma.taskTemplate.count({
      where: { eventTemplateId: eventTemplate.id },
    }),
    prisma.eventTask.count({
      where: { eventId: event.id },
    }),
  ]);

  if (
    userCount !== users.length ||
    taskTemplateCount !== taskTemplates.length ||
    eventTaskCount !== taskCount
  ) {
    throw new Error(
      `Seed verification failed: ${userCount} users, ${taskTemplateCount} task templates, ${eventTaskCount} event tasks.`,
    );
  }

  console.log(
    `Seed complete: ${userCount} users, ${taskTemplateCount} task templates, event "${event.title}" with ${eventTaskCount} tasks.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
