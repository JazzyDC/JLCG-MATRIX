import assert from "node:assert/strict";
import test from "node:test";
import { createRemoteDatabase } from "../db/d1-http.ts";

const configuration = {
  CLOUDFLARE_ACCOUNT_ID: "test-account",
  CLOUDFLARE_D1_DATABASE_ID: "test-database",
  CLOUDFLARE_D1_API_TOKEN: "test-token",
};

test("requires all database credentials before sending a request", () => {
  for (const key of Object.keys(configuration)) {
    assert.throws(
      () => createRemoteDatabase({ ...configuration, [key]: "" }),
      /Set CLOUDFLARE_ACCOUNT_ID/,
    );
  }
});

test("uses authenticated uncached requests and bound SQL parameters", async () => {
  const requests = [];
  const db = createRemoteDatabase(configuration, async (url, options) => {
    requests.push({ url, options });
    return Response.json({
      success: true,
      result: [{ success: true, results: [{ data: "saved task" }] }],
    });
  });
  const sql = "SELECT data FROM records WHERE id=?";
  const result = await db.prepare(sql).bind("task'1").all();
  assert.deepEqual(result.results, [{ data: "saved task" }]);
  assert.equal(
    requests[0].url,
    "https://api.cloudflare.com/client/v4/accounts/test-account/d1/database/test-database/query",
  );
  assert.equal(requests[0].options.headers.Authorization, "Bearer test-token");
  assert.equal(requests[0].options.cache, "no-store");
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    sql,
    params: ["task'1"],
  });
});

test("first returns null for missing workspace settings", async () => {
  const db = createRemoteDatabase(configuration, async () =>
    Response.json({ success: true, result: [{ success: true, results: [] }] }),
  );
  assert.equal(await db.prepare("SELECT data FROM preferences").first(), null);
});

test("propagates HTTP and query failures without exposing response secrets", async () => {
  for (const response of [
    new Response("private response", { status: 403 }),
    Response.json({ success: false }),
    Response.json({ success: true, result: [{ success: false }] }),
    Response.json({ success: true, result: [] }),
  ]) {
    const db = createRemoteDatabase(configuration, async () => response);
    await assert.rejects(db.prepare("SELECT data FROM records").all(), (error) => {
      assert.match(error.message, /D1/);
      assert.doesNotMatch(error.message, /private response|test-token/);
      return true;
    });
  }
});

test("runs idempotent table setup in order and stops on failure", async () => {
  const statements = [];
  const db = createRemoteDatabase(configuration, async (_url, options) => {
    const { sql } = JSON.parse(options.body);
    statements.push(sql);
    return Response.json({ success: true, result: [{ success: sql !== "fail" }] });
  });
  await db.batch([db.prepare("first"), db.prepare("second")]);
  assert.deepEqual(statements, ["first", "second"]);
  await assert.rejects(db.batch([db.prepare("fail"), db.prepare("not executed")]));
  assert.deepEqual(statements, ["first", "second", "fail"]);
});
