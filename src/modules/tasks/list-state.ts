import type { Prisma } from "@/generated/prisma/client";

export type TaskSortKey =
  | "title"
  | "phase"
  | "workPackage"
  | "responsible"
  | "reviewer"
  | "status"
  | "priority"
  | "dueDate"
  | "isCritical";
export type TaskSort = { key: TaskSortKey; direction: "asc" | "desc" };
export type TaskListQuery = Record<string, string | string[] | undefined>;

export function getTaskSort(key?: string, direction?: string): TaskSort {
  const keys: TaskSortKey[] = [
    "title",
    "phase",
    "workPackage",
    "responsible",
    "reviewer",
    "status",
    "priority",
    "dueDate",
    "isCritical",
  ];
  return {
    key: keys.includes(key as TaskSortKey) ? (key as TaskSortKey) : "dueDate",
    direction: direction === "desc" ? "desc" : "asc",
  };
}

export function getTaskOrderBy(
  sort: TaskSort,
): Prisma.EventTaskOrderByWithRelationInput[] {
  let primary: Prisma.EventTaskOrderByWithRelationInput;
  switch (sort.key) {
    case "responsible":
      primary = { responsibleUser: { name: sort.direction } };
      break;
    case "reviewer":
      primary = { reviewerUser: { name: sort.direction } };
      break;
    case "dueDate":
      primary = { dueDate: { sort: sort.direction, nulls: "last" } };
      break;
    default:
      primary = { [sort.key]: sort.direction };
  }
  return [
    primary,
    ...(sort.key === "title" ? [] : [{ title: "asc" as const }]),
    { id: "asc" },
  ];
}

export function getTaskListHref(eventId: string, query: TaskListQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "shifted" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item) params.append(key, item);
    }
  }
  const suffix = params.toString();
  return `/events/${eventId}/tasks${suffix ? `?${suffix}` : ""}`;
}

export function getTaskReturnTo(eventId: string, value: unknown) {
  const fallback = `/events/${eventId}/tasks`;
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return fallback;
  try {
    const url = new URL(value, "https://event-tool.invalid");
    if (
      url.origin !== "https://event-tool.invalid" ||
      !["/", `/events/${eventId}`, fallback].includes(url.pathname)
    )
      return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function getTaskHref(
  eventId: string,
  taskId: string,
  returnTo: string,
  edit = false,
) {
  return `/events/${eventId}/tasks/${taskId}${edit ? "/edit" : ""}?${new URLSearchParams({ returnTo })}`;
}
