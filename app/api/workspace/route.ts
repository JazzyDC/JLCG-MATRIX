import { database } from "../../../db/store";
export async function GET() {
  try {
    const db = await database();
    const result = await db.prepare("SELECT data FROM records").all();
    const prefs = await db
      .prepare("SELECT data FROM preferences WHERE id = 'workspace'")
      .first<{ data: string }>();
    return Response.json({
      tasks: result.results.map((r: any) => JSON.parse(r.data)),
      settings: prefs ? JSON.parse(prefs.data) : null,
    });
  } catch {
    return Response.json(
      { error: "Unable to load your workspace. Please try again." },
      { status: 500 },
    );
  }
}
export async function POST(req: Request) {
  try {
    const body: any = await req.json();
    const db = await database();
    if (body.action === "settings") {
      const s = body.settings;
      if (
        !s ||
        !Array.isArray(s.categories) ||
        s.categories.length > 30 ||
        s.categories.some(
          (c: unknown) => typeof c !== "string" || !c.trim() || c.length > 60,
        ) ||
        !["Monday", "Sunday"].includes(s.weekStart)
      )
        return Response.json({ error: "Invalid settings" }, { status: 400 });
      await db
        .prepare(
          "INSERT INTO preferences(id,data) VALUES ('workspace',?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .bind(JSON.stringify(s))
        .run();
    } else if (body.action === "delete") {
      if (typeof body.id !== "string")
        return Response.json({ error: "Invalid task" }, { status: 400 });
      await db.prepare("DELETE FROM records WHERE id=?").bind(body.id).run();
    } else {
      const t = body.task;
      if (
        !t ||
        typeof t.id !== "string" ||
        typeof t.title !== "string" ||
        !t.title.trim() ||
        t.title.length > 200 ||
        !["Not started", "In progress", "On hold", "Completed"].includes(
          t.status,
        ) ||
        typeof t.important !== "boolean" ||
        typeof t.urgent !== "boolean" ||
        typeof t.category !== "string" ||
        typeof t.owner !== "string" ||
        typeof t.notes !== "string" ||
        typeof t.due !== "string" ||
        (t.due && !/^\d{4}-\d{2}-\d{2}$/.test(t.due))
      )
        return Response.json(
          { error: "Please check the task details." },
          { status: 400 },
        );
      await db
        .prepare(
          "INSERT INTO records(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .bind(t.id, JSON.stringify(t))
        .run();
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Your changes could not be saved. Please retry." },
      { status: 500 },
    );
  }
}
