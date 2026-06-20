"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  evaluationFormSchema,
  getEvaluationFormValues,
  optionalEvaluationNumber,
  optionalEvaluationText,
  parseRepeatEvent,
  type EvaluationFormState,
} from "@/modules/evaluations/evaluation-form";
import { calculateNoShowRate } from "@/modules/evaluations/metrics";

function getEvaluationData(
  input: ReturnType<typeof evaluationFormSchema.parse>,
) {
  const registrations = optionalEvaluationNumber(input.registrations);
  const attendees = optionalEvaluationNumber(input.attendees);

  return {
    registrations,
    attendees,
    noShowRate: calculateNoShowRate(registrations, attendees),
    targetAudienceFit: optionalEvaluationNumber(input.targetAudienceFit),
    satisfaction: optionalEvaluationNumber(input.satisfaction),
    netPromoterScore: optionalEvaluationNumber(input.netPromoterScore),
    newContacts: optionalEvaluationNumber(input.newContacts),
    cooperationApproaches: optionalEvaluationNumber(
      input.cooperationApproaches,
    ),
    followUpConversations: optionalEvaluationNumber(
      input.followUpConversations,
    ),
    qualitativeLearnings: optionalEvaluationText(input.qualitativeLearnings),
    wentWell: optionalEvaluationText(input.wentWell),
    wasDifficult: optionalEvaluationText(input.wasDifficult),
    nextTimeDifferent: optionalEvaluationText(input.nextTimeDifferent),
    repeatEvent: parseRepeatEvent(input.repeatEvent),
  };
}

function getAuditValue(evaluation: ReturnType<typeof getEvaluationData>) {
  return {
    registrations: evaluation.registrations,
    attendees: evaluation.attendees,
    noShowRate: evaluation.noShowRate,
    targetAudienceFit: evaluation.targetAudienceFit,
    satisfaction: evaluation.satisfaction,
    netPromoterScore: evaluation.netPromoterScore,
    newContacts: evaluation.newContacts,
    cooperationApproaches: evaluation.cooperationApproaches,
    followUpConversations: evaluation.followUpConversations,
    repeatEvent: evaluation.repeatEvent,
  };
}

export async function saveEvaluationAction(
  _previousState: EvaluationFormState,
  formData: FormData,
): Promise<EvaluationFormState> {
  const values = getEvaluationFormValues(formData);
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS)) {
    return {
      values,
      fieldErrors: {},
      formError: "Du hast keine Berechtigung, die Evaluation zu bearbeiten.",
    };
  }

  const validation = evaluationFormSchema.safeParse(values);

  if (!validation.success) {
    return {
      values,
      fieldErrors: validation.error.flatten().fieldErrors,
      formError: "Bitte prüfe die markierten Eingaben.",
    };
  }

  const input = validation.data;
  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: input.eventId },
    select: { id: true },
  });
  const existingEvaluation = await db.eventEvaluation.findUnique({
    where: { eventId: input.eventId },
  });

  if (!event) {
    return {
      values,
      fieldErrors: {},
      formError: "Das zugehörige Event existiert nicht mehr.",
    };
  }

  const evaluationData = getEvaluationData(input);

  try {
    await db.$transaction(async (transaction) => {
      const evaluation = await transaction.eventEvaluation.upsert({
        where: { eventId: input.eventId },
        create: {
          eventId: input.eventId,
          ...evaluationData,
        },
        update: evaluationData,
      });

      await transaction.auditLog.create({
        data: {
          userId: currentUser.id,
          entityType: "EventEvaluation",
          entityId: evaluation.id,
          action: existingEvaluation ? "UPDATED" : "CREATED",
          oldValue: existingEvaluation
            ? getAuditValue(existingEvaluation)
            : undefined,
          newValue: getAuditValue(evaluation),
        },
      });
    });
  } catch (error) {
    console.error("Failed to save event evaluation", error);

    return {
      values,
      fieldErrors: {},
      formError: "Die Evaluation konnte nicht gespeichert werden.",
    };
  }

  revalidatePath(`/events/${input.eventId}`);
  revalidatePath(`/events/${input.eventId}/evaluation`);
  redirect(`/events/${input.eventId}/evaluation?saved=1`);
}
