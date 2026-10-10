"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { TaskStatus } from "@/generated/prisma/enums";

type ToggleTask = {
  id: string;
  status: TaskStatus;
  title: string;
};

type ChangeStatusAction = (formData: FormData) => Promise<void> | void;

function getNextStatus(status: TaskStatus) {
  return status === TaskStatus.COMPLETED
    ? TaskStatus.OPEN
    : TaskStatus.COMPLETED;
}

function getCheckboxClass({
  canChangeStatus,
  hasError,
  isPending,
  status,
}: {
  canChangeStatus: boolean;
  hasError: boolean;
  isPending: boolean;
  status: TaskStatus;
}) {
  const interaction = canChangeStatus ? "cursor-pointer" : "cursor-default";
  const base = `mt-0.5 inline-flex size-5 shrink-0 ${interaction} items-center justify-center rounded border text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700`;
  const pending = isPending ? "opacity-80 ring-2 ring-emerald-100" : "";

  if (hasError) {
    return `${base} border-red-500 bg-red-50 text-red-700 ${pending}`;
  }

  if (status === TaskStatus.COMPLETED) {
    return `${base} border-emerald-600 bg-emerald-600 text-white ${pending}`;
  }

  if (status === TaskStatus.CANCELLED) {
    return `${base} border-slate-300 bg-slate-100 text-slate-400 ${pending}`;
  }

  return `${base} border-slate-300 bg-white text-transparent hover:border-emerald-500 hover:bg-emerald-50 ${pending}`;
}

export function TaskDoneToggle({
  canChangeStatus,
  changeStatusAction,
  eventId,
  task,
}: {
  canChangeStatus: boolean;
  changeStatusAction: ChangeStatusAction;
  eventId: string;
  task: ToggleTask;
}) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useState(task.status);
  const [hasError, setHasError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isCompleted = optimisticStatus === TaskStatus.COMPLETED;
  const isCancelled = optimisticStatus === TaskStatus.CANCELLED;
  const label = isCompleted
    ? "Aufgabe wieder \u00f6ffnen"
    : "Aufgabe als erledigt markieren";

  if (!canChangeStatus || isCancelled) {
    return (
      <span
        aria-label={
          isCompleted
            ? "Aufgabe ist erledigt"
            : isCancelled
              ? "Aufgabe entf\u00e4llt"
              : "Status kann nicht ge\u00e4ndert werden"
        }
        className={getCheckboxClass({
          canChangeStatus: false,
          hasError: false,
          isPending: false,
          status: optimisticStatus,
        })}
        title={
          isCompleted
            ? "Erledigt"
            : isCancelled
              ? "Entf\u00e4llt"
              : "Keine Berechtigung zum \u00c4ndern"
        }
      >
        {isCompleted ? "\u2713" : isCancelled ? "-" : ""}
      </span>
    );
  }

  function handleToggle() {
    if (isPending) {
      return;
    }

    const previousStatus = optimisticStatus;
    const nextStatus = getNextStatus(optimisticStatus);
    const formData = new FormData();

    formData.set("eventId", eventId);
    formData.set("taskId", task.id);
    formData.set("status", nextStatus);
    setOptimisticStatus(nextStatus);
    setHasError(false);

    startTransition(async () => {
      try {
        await changeStatusAction(formData);
        router.refresh();
      } catch {
        setOptimisticStatus(previousStatus);
        setHasError(true);
      }
    });
  }

  return (
    <button
      aria-busy={isPending}
      aria-disabled={isPending}
      aria-label={`${label}: ${task.title}`}
      aria-pressed={isCompleted}
      className={getCheckboxClass({
        canChangeStatus: true,
        hasError,
        isPending,
        status: optimisticStatus,
      })}
      onClick={handleToggle}
      title={
        hasError
          ? "\u00c4nderung konnte nicht gespeichert werden. Bitte erneut versuchen."
          : label
      }
      type="button"
    >
      {isCompleted ? "\u2713" : ""}
      {hasError ? (
        <span className="sr-only">
          {"\u00c4nderung konnte nicht gespeichert werden."}
        </span>
      ) : null}
    </button>
  );
}
