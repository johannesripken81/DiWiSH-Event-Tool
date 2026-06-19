import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { getEvaluationData } from "@/modules/evaluations/queries";

import { EvaluationForm } from "./evaluation-form";

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EvaluationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await getEvaluationData(id);
  const currentUser = await getCurrentUser();

  if (!data) {
    notFound();
  }

  const canManageEvaluation = hasPermission(
    currentUser,
    Permission.MANAGE_EVENT_OPERATIONS,
  );

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href={`/events/${data.event.id}`}
      >
        ← Zurück zum Event-Cockpit
      </Link>

      <PageHeader
        description={`Kennzahlen, Learnings und Wirkung für „${data.event.title}“ dokumentieren.`}
        eyebrow="Nachbereitung"
        title="Evaluation & Wirkung"
      />

      {firstValue(query.saved) === "1" ? (
        <div
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
          role="status"
        >
          Die Evaluation wurde gespeichert und das Event-Cockpit aktualisiert.
        </div>
      ) : null}

      {canManageEvaluation ? (
        <EvaluationForm initialValues={data.initialValues} />
      ) : (
        <Card className="p-5">
          <p className="text-sm leading-6 text-slate-600">
            Die Evaluation ist für deine Rolle schreibgeschützt. Gespeicherte
            Kennzahlen und Learnings sind im Event-Cockpit sichtbar.
          </p>
        </Card>
      )}
    </>
  );
}
