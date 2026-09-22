import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://localhost:3000";
const post = async (body) => {
  const r = await fetch(base + "/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(r.status, 200);
  return r.json();
};
const id = "verification-" + crypto.randomUUID();
const task = {
  id,
  title: "Verification task",
  category: "Operations",
  owner: "QA",
  due: "2026-09-21",
  status: "Not started",
  important: true,
  urgent: true,
  notes: "Temporary verification record",
};
try {
  await post({ task });
  let data = await (await fetch(base + "/api/workspace")).json();
  assert.equal(data.tasks.find((t) => t.id === id).title, task.title);
  await post({ task: { ...task, status: "Completed" } });
  data = await (await fetch(base + "/api/workspace")).json();
  assert.equal(data.tasks.find((t) => t.id === id).status, "Completed");
  const invalid = await fetch(base + "/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task: { ...task, title: "" } }),
  });
  assert.equal(invalid.status, 400);
  for (const page of [
    "/",
    "/tasks",
    "/matrix",
    "/calendar",
    "/reports",
    "/settings",
    "/guide",
  ]) {
    const r = await fetch(base + page);
    assert.equal(r.status, 200, page);
    assert.match(await r.text(), /JLCG/);
  }
  console.log(
    "PASS: saved task creation, read-back, completion update, validation, and all 7 routes",
  );
} finally {
  await post({ action: "delete", id });
  const data = await (await fetch(base + "/api/workspace")).json();
  assert.equal(
    data.tasks.some((t) => t.id === id),
    false,
  );
  console.log("PASS: deletion persisted; verification record removed");
}
