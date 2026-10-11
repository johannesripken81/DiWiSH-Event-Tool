import assert from "node:assert/strict";
import { it } from "node:test";
import { getDistinctReviewerId } from "./assignment";
import { getEmptyTaskFormValues, taskFormSchema } from "./task-form";

it("erhält eine von der Verantwortung getrennte Prüfung", () => {
  assert.equal(
    getDistinctReviewerId("reviewer", "responsible", [{ id: "reviewer" }]),
    "reviewer",
  );
});

it("verhindert Selbstprüfung auch bei gleichlautenden Vorlagenrollen", () => {
  assert.equal(
    getDistinctReviewerId("person-1", "person-1", [
      { id: "person-1" },
      { id: "person-2" },
    ]),
    "person-2",
  );
  assert.equal(
    getDistinctReviewerId("person-1", "person-1", [{ id: "person-1" }]),
    null,
  );
});

it("lässt Aufgaben ohne vorgesehene Prüfung unzugewiesen", () => {
  assert.equal(
    getDistinctReviewerId(null, "person-1", [{ id: "person-2" }]),
    null,
  );
});

it("weist Selbstprüfung beim manuellen Speichern zurück", () => {
  const values = {
    ...getEmptyTaskFormValues("event-1"),
    title: "Aufgabe prüfen",
    responsibleUserId: "person-1",
    reviewerUserId: "person-1",
  };
  const result = taskFormSchema.safeParse(values);
  assert.equal(result.success, false);
  if (!result.success)
    assert.ok(
      result.error.issues.some((issue) => issue.path[0] === "reviewerUserId"),
    );
  assert.equal(
    taskFormSchema.safeParse({ ...values, reviewerUserId: "person-2" }).success,
    true,
  );
});
