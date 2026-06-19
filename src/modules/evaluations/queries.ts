import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import {
  getEmptyEvaluationFormValues,
  type EvaluationFormValues,
} from "@/modules/evaluations/evaluation-form";

function toFormValue(value: number | null) {
  return value === null ? "" : String(value);
}

export async function getEvaluationData(eventId: string) {
  await requireEventReadAccess();
  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      eventDate: true,
      evaluation: true,
    },
  });

  if (!event) {
    return null;
  }

  const emptyValues = getEmptyEvaluationFormValues(event.id);
  const evaluation = event.evaluation;
  const initialValues: EvaluationFormValues = evaluation
    ? {
        eventId: event.id,
        registrations: toFormValue(evaluation.registrations),
        attendees: toFormValue(evaluation.attendees),
        targetAudienceFit: toFormValue(evaluation.targetAudienceFit),
        satisfaction: toFormValue(evaluation.satisfaction),
        netPromoterScore: toFormValue(evaluation.netPromoterScore),
        newContacts: toFormValue(evaluation.newContacts),
        cooperationApproaches: toFormValue(evaluation.cooperationApproaches),
        followUpConversations: toFormValue(evaluation.followUpConversations),
        qualitativeLearnings: evaluation.qualitativeLearnings ?? "",
        wentWell: evaluation.wentWell ?? "",
        wasDifficult: evaluation.wasDifficult ?? "",
        nextTimeDifferent: evaluation.nextTimeDifferent ?? "",
        repeatEvent:
          evaluation.repeatEvent === null
            ? ""
            : evaluation.repeatEvent
              ? "yes"
              : "no",
      }
    : emptyValues;

  return {
    event,
    evaluation,
    initialValues,
  };
}
