import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getTaskHref,
  getTaskListHref,
  getTaskOrderBy,
  getTaskReturnTo,
  getTaskSort,
} from "./list-state";

describe("Aufgabenansicht und Rückkehr", () => {
  it("erhält Filter, Sortierung und Seite über Details und Bearbeitung", () => {
    const list = getTaskListHref("event-1", {
      status: "OPEN",
      phase: "CONCEPTION",
      responsibleUserId: "person-1",
      priority: "HIGH",
      due: "next7",
      critical: "true",
      readinessArea: "concept",
      page: "3",
      sort: "priority",
      direction: "desc",
      shifted: "2",
    });
    const detail = new URL(
      getTaskHref("event-1", "task-1", list),
      "https://event-tool.invalid",
    );
    const returnTo = getTaskReturnTo(
      "event-1",
      detail.searchParams.get("returnTo"),
    );
    const edit = new URL(
      getTaskHref("event-1", "task-1", returnTo, true),
      detail.origin,
    );
    assert.equal(edit.pathname, "/events/event-1/tasks/task-1/edit");
    assert.equal(
      getTaskReturnTo("event-1", edit.searchParams.get("returnTo")),
      list,
    );
    const query = new URL(list, detail.origin).searchParams;
    assert.equal(query.get("responsibleUserId"), "person-1");
    assert.equal(query.get("page"), "3");
    assert.equal(query.get("sort"), "priority");
    assert.equal(query.get("direction"), "desc");
    assert.equal(query.has("shifted"), false);
  });

  it("erlaubt Rückkehr zum Dashboard und zum zugehörigen Event", () => {
    assert.equal(
      getTaskReturnTo("event-1", "/?responsibleUserId=person-1"),
      "/?responsibleUserId=person-1",
    );
    assert.equal(
      getTaskReturnTo("event-1", "/events/event-1"),
      "/events/event-1",
    );
  });

  it("verhindert externe oder fremde Rücksprungziele", () => {
    for (const value of [
      undefined,
      ["/"],
      "https://example.com",
      "//example.com",
      "/\\example.com",
      "/events/event-2/tasks",
      "/settings",
      "/events/event-1/tasks/../edit",
    ]) {
      assert.equal(getTaskReturnTo("event-1", value), "/events/event-1/tasks");
    }
  });
});

describe("Aufgabensortierung", () => {
  it("fällt bei unbekannten Sortierwerten auf Fälligkeit aufsteigend zurück", () => {
    assert.deepEqual(getTaskSort("unknown", "invalid"), {
      key: "dueDate",
      direction: "asc",
    });
  });

  it("setzt Aufgaben ohne Fälligkeit in beiden Richtungen ans Ende", () => {
    for (const direction of ["asc", "desc"] as const) {
      assert.deepEqual(getTaskOrderBy({ key: "dueDate", direction })[0], {
        dueDate: { sort: direction, nulls: "last" },
      });
    }
  });

  it("sortiert Personen nach Namen und stabilisiert gleiche Werte für Listenseiten", () => {
    assert.deepEqual(getTaskOrderBy({ key: "responsible", direction: "asc" }), [
      { responsibleUser: { name: "asc" } },
      { title: "asc" },
      { id: "asc" },
    ]);
    assert.deepEqual(
      getTaskOrderBy({ key: "reviewer", direction: "desc" })[0],
      { reviewerUser: { name: "desc" } },
    );
    assert.deepEqual(
      getTaskOrderBy({ key: "priority", direction: "desc" })[0],
      { priority: "desc" },
    );
  });
});
