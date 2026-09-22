"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
type Task = {
  id: string;
  title: string;
  category: string;
  owner: string;
  due: string;
  status: string;
  important: boolean;
  urgent: boolean;
  notes: string;
};
type Settings = { categories: string[]; weekStart: string; name: string };
const defaults: Settings = {
  categories: [
    "Operations",
    "Projects",
    "Finance",
    "Sales & marketing",
    "Administration",
    "Personal",
  ],
  weekStart: "Monday",
  name: "JLCG Workspace",
};
const statuses = ["Not started", "In progress", "On hold", "Completed"];
const priorities = ["Do now", "Schedule", "Delegate", "Eliminate"];
const descriptions = [
  "Important & urgent",
  "Important, not urgent",
  "Urgent, not important",
  "Neither urgent nor important",
];
const nav = [
  ["dashboard", "◫", "Overview"],
  ["tasks", "☷", "All tasks"],
  ["matrix", "⊞", "Priority matrix"],
  ["calendar", "▦", "Calendar"],
  ["reports", "▥", "Reports"],
];
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const priority = (t: Task) =>
  t.important ? (t.urgent ? 0 : 1) : t.urgent ? 2 : 3;
const done = (t: Task) => t.status === "Completed";
const format = (s: string) =>
  s
    ? new Date(s + "T12:00:00").toLocaleDateString("en", {
        month: "short",
        day: "numeric",
      })
    : "No due date";
export default function Tracker({ page }: { page: string }) {
  const [tasks, setTasks] = useState<Task[]>([]),
    [settings, setSettings] = useState(defaults),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All categories"),
    [status, setStatus] = useState("All statuses"),
    [pFilter, setPFilter] = useState("All priorities"),
    [scope, setScope] = useState("All tasks");
  const [month, setMonth] = useState(new Date()),
    [selectedDay, setSelectedDay] = useState(""),
    [editor, setEditor] = useState<Task | null>(null),
    [deleteConfirm, setDeleteConfirm] = useState(false),
    [menu, setMenu] = useState(false),
    [newCategory, setNewCategory] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const today = dateKey(new Date());
  useEffect(() => {
    fetch("/api/workspace")
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            "Unable to load your workspace. Refresh to try again.",
          );
        return r.json() as Promise<{
          tasks: Task[];
          settings: Settings | null;
        }>;
      })
      .then((d) => {
        setTasks(d.tasks);
        if (d.settings) setSettings(d.settings);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const s = new URLSearchParams(window.location.search).get("view");
    setScope(s || "All tasks");
  }, [page]);
  useEffect(() => {
    if (editor) dialog.current?.showModal();
    else dialog.current?.close();
  }, [editor]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  async function write(body: unknown) {
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
      return false;
    } finally {
      setSaving(false);
    }
  }
  async function saveTask(t: Task) {
    if (await write({ task: t })) {
      setTasks((old) =>
        old.some((x) => x.id === t.id)
          ? old.map((x) => (x.id === t.id ? t : x))
          : [...old, t],
      );
      setEditor(null);
      setNotice("Task saved");
    }
  }
  function create(due = "") {
    setDeleteConfirm(false);
    setEditor({
      id: crypto.randomUUID(),
      title: "",
      category: settings.categories[0] || "General",
      owner: "",
      due,
      status: "Not started",
      important: true,
      urgent: false,
      notes: "",
    });
  }
  function edit(t: Task) {
    setDeleteConfirm(false);
    setEditor({ ...t });
  }
  const completed = tasks.filter(done).length,
    overdue = tasks.filter((t) => !done(t) && t.due && t.due < today),
    dueToday = tasks.filter((t) => !done(t) && t.due === today),
    progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const filtered = tasks
    .filter(
      (t) =>
        (!search ||
          [t.title, t.owner, t.notes]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (category === "All categories" || t.category === category) &&
        (status === "All statuses" || t.status === status) &&
        (pFilter === "All priorities" || priorities[priority(t)] === pFilter) &&
        (scope === "All tasks" ||
          (scope === "Overdue" && !done(t) && t.due && t.due < today) ||
          (scope === "Today" && !done(t) && t.due === today) ||
          (scope === "Completed" && done(t)) ||
          (scope === "Open" && !done(t))),
    )
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const openTasks = tasks
    .filter((t) => !done(t))
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const categories = Array.from(
    new Set([...settings.categories, ...tasks.map((t) => t.category)]),
  );
  function exportTasks() {
    const fields = [
      "title",
      "category",
      "owner",
      "due",
      "status",
      "important",
      "urgent",
      "notes",
    ] as const;
    const csv = [
      fields.join(","),
      ...filtered.map((t) =>
        fields
          .map((f) => '"' + String(t[f]).replaceAll('"', '""') + '"')
          .join(","),
      ),
    ].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "JLCG-tasks.csv";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Task export downloaded");
  }
  const FilterBar = () => (
    <div className="filters">
      <div className="search">
        <span>⌕</span>
        <input
          aria-label="Search tasks"
          placeholder="Search tasks or assignees…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <select
        aria-label="Category filter"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option>All categories</option>
        {categories.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select
        aria-label="Priority filter"
        value={pFilter}
        onChange={(e) => setPFilter(e.target.value)}
      >
        <option>All priorities</option>
        {priorities.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select
        aria-label="Status filter"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option>All statuses</option>
        {statuses.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </div>
  );
  function row(t: Task) {
    return (
      <div className="task-row" key={t.id}>
        <input
          aria-label={`Complete ${t.title}`}
          type="checkbox"
          checked={done(t)}
          disabled={saving}
          onChange={() =>
            saveTask({ ...t, status: done(t) ? "Not started" : "Completed" })
          }
        />
        <button
          className={`task-title ${done(t) ? "completed" : ""}`}
          onClick={() => edit(t)}
        >
          {t.title}
          <small>
            {t.category}
            {t.owner ? " · " + t.owner : ""}
          </small>
        </button>
        <span className={`pill p${priority(t)}`}>
          {priorities[priority(t)]}
        </span>
        <span className={!done(t) && t.due && t.due < today ? "late" : "due"}>
          {format(t.due)}
        </span>
      </div>
    );
  }
  const empty = (text = "No tasks here yet.") => (
    <div className="empty">
      <span>✓</span>
      <h3>{text}</h3>
      <p>Add a task to start planning your next move.</p>
      <button className="primary" onClick={() => create()}>
        ＋ Create a task
      </button>
    </div>
  );
  const stats = [
    [
      "Open tasks",
      tasks.length - completed,
      "Everything still in motion",
      "Open",
    ],
    ["Due today", dueToday.length, "Your focus for the day", "Today"],
    ["Overdue", overdue.length, "A little attention needed", "Overdue"],
    ["Completed", completed, "Every step counts", "Completed"],
  ];
  const titles: Record<string, string> = {
    dashboard: "Workspace overview",
    tasks: "All tasks",
    matrix: "Priority matrix",
    calendar: "Task calendar",
    reports: "Progress & insights",
    settings: "Workspace settings",
    guide: "Your planning guide",
  };
  return (
    <div className="app-shell">
      <aside className={menu ? "sidebar show" : "sidebar"}>
        <Link className="brand" href="/">
          <span className="logo-crop">
            <img src="/logo.png" alt="JLCG" />
          </span>
          <span>
            JLCG<small>TASK WORKSPACE</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-avatar">J</span>
          <div>
            {settings.name}
            <small>Your planning space</small>
          </div>
          <span>⌄</span>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {nav.map(([id, icon, label]) => (
            <Link
              className={page === id ? "active" : ""}
              key={id}
              href={id === "dashboard" ? "/" : "/" + id}
            >
              <span className="nav-icon">{icon}</span>
              {label}
              {id === "tasks" && <b>{tasks.length}</b>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="focus-note">
            <span>✧</span>
            <strong>Make room for what matters.</strong>
            <p>A clear plan. A focused day.</p>
            <Link href="/matrix">Find your focus →</Link>
          </div>
          <Link
            className={
              page === "settings" ? "bottom-link active" : "bottom-link"
            }
            href="/settings"
          >
            ⚙ <span>Settings</span>
          </Link>
          <Link className="bottom-link" href="/guide">
            ⓘ <span>Getting started</span>
          </Link>
          <div className="profile">
            <span className="workspace-avatar">JG</span>
            <div>
              JLCG Workspace<small>Plan. Prioritize. Progress.</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setMenu(!menu)}
            >
              ☰
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span> <b>{titles[page]}</b>
            </span>
          </div>
          <div className="topbar-right">
            <span className="save-indicator">●</span>
            {saving ? "Saving…" : "Connected workspace"}
            <span className="avatar">JG</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR DAY, WITH DIRECTION</div>
              <h1>
                {page === "dashboard"
                  ? "A little clarity. A lot of progress."
                  : titles[page]}
              </h1>
              <p>
                {page === "dashboard"
                  ? "Welcome to JLCG. Let’s make space for your most important work."
                  : page === "calendar"
                    ? "See your deadlines, find your balance, and plan ahead."
                    : page === "matrix"
                      ? "Turn a long to-do list into four clear decisions."
                      : "Everything you need to keep your work moving forward."}
              </p>
            </div>
            <button className="primary" onClick={() => create()}>
              ＋ New task
            </button>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              ✓ {notice}
            </div>
          )}
          {loading ? (
            <div className="loading">Loading your workspace…</div>
          ) : (
            <>
              {page === "dashboard" && (
                <>
                  <div className="overview-bar">
                    <span>
                      <span className="gold-dot" />{" "}
                      {new Date().toLocaleDateString("en", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <Link href="/calendar">View calendar ↗</Link>
                  </div>
                  <div className="stats-grid">
                    {stats.map(([label, count, sub, view], i) => (
                      <Link
                        href={"/tasks?view=" + view}
                        className="stat-card"
                        key={label}
                      >
                        <div>
                          {label}
                          <span className={"stat-icon s" + i}>
                            {["☷", "▦", "◷", "✓"][i]}
                          </span>
                        </div>
                        <strong>{count}</strong>
                        <small>{sub}</small>
                      </Link>
                    ))}
                  </div>
                  <div className="dashboard-grid">
                    <section className="panel focus-panel">
                      <div className="section-heading">
                        <div>
                          <h2>Your next moves</h2>
                          <p>Small steps toward a productive day.</p>
                        </div>
                        <Link href="/tasks">View all tasks →</Link>
                      </div>
                      <div className="mini-tabs">
                        <button className="selected">
                          Upcoming tasks <b>{openTasks.length}</b>
                        </button>
                        <Link href="/tasks?view=Today">
                          Due today <b>{dueToday.length}</b>
                        </Link>
                      </div>
                      {openTasks.length
                        ? openTasks.slice(0, 6).map(row)
                        : empty("Your next chapter starts here.")}
                    </section>
                    <section className="panel progress-panel">
                      <div className="section-heading">
                        <h2>Overall progress</h2>
                        <span>↗</span>
                      </div>
                      <div
                        className="ring"
                        style={{
                          background: `conic-gradient(#f5ab16 ${progress}%, #f0eee8 0)`,
                        }}
                      >
                        <div>
                          <strong>{progress}%</strong>
                          <span>completed</span>
                        </div>
                      </div>
                      <p>
                        <b>{completed}</b> of <b>{tasks.length}</b> tasks
                        complete
                      </p>
                      <div className="progress-legend">
                        <span>
                          <i />
                          Completed
                        </span>
                        <b>{completed}</b>
                      </div>
                      <div className="progress-legend">
                        <span>
                          <i className="gray" />
                          Remaining
                        </span>
                        <b>{tasks.length - completed}</b>
                      </div>
                      <div className="gentle-note">
                        Progress begins with one clear priority.
                      </div>
                    </section>
                  </div>
                  <section className="panel priority-preview">
                    <div className="section-heading">
                      <div>
                        <h2>A place for every priority</h2>
                        <p>Your Eisenhower matrix at a glance.</p>
                      </div>
                      <Link href="/matrix">Open matrix →</Link>
                    </div>
                    <div className="priority-grid">
                      {priorities.map((p, i) => (
                        <Link
                          href="/matrix"
                          className={"priority-tile p" + i}
                          key={p}
                        >
                          <span>
                            0{i + 1} <b>↗</b>
                          </span>
                          <h3>
                            {p}
                            <strong>
                              {
                                tasks.filter(
                                  (t) => priority(t) === i && !done(t),
                                ).length
                              }
                            </strong>
                          </h3>
                          <p>{descriptions[i]}</p>
                          <div className="tile-line" />
                        </Link>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {page === "tasks" && (
                <>
                  <div className="tabs">
                    {["All tasks", "Today", "Overdue", "Open", "Completed"].map(
                      (s) => (
                        <button
                          key={s}
                          onClick={() => setScope(s)}
                          className={s === scope ? "selected" : ""}
                        >
                          {s}
                        </button>
                      ),
                    )}
                    <button className="export-button" onClick={exportTasks}>
                      ↓ Export CSV
                    </button>
                  </div>
                  {FilterBar()}
                  <section className="panel table-panel">
                    <div className="table-summary">
                      {filtered.length} tasks{" "}
                      <span>Click a task to view or edit its details</span>
                    </div>
                    {filtered.length ? (
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th aria-label="Completion" />
                              <th>Task name</th>
                              <th>Category</th>
                              <th>Priority</th>
                              <th>Due date</th>
                              <th>Assignee</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((t) => (
                              <tr key={t.id}>
                                <td>
                                  <input
                                    type="checkbox"
                                    aria-label={`Complete ${t.title}`}
                                    checked={done(t)}
                                    disabled={saving}
                                    onChange={() =>
                                      saveTask({
                                        ...t,
                                        status: done(t)
                                          ? "Not started"
                                          : "Completed",
                                      })
                                    }
                                  />
                                </td>
                                <td>
                                  <button
                                    className={
                                      "task-title " +
                                      (done(t) ? "completed" : "")
                                    }
                                    onClick={() => edit(t)}
                                  >
                                    {t.title}
                                  </button>
                                </td>
                                <td>{t.category}</td>
                                <td>
                                  <span className={"pill p" + priority(t)}>
                                    {priorities[priority(t)]}
                                  </span>
                                </td>
                                <td
                                  className={
                                    !done(t) && t.due && t.due < today
                                      ? "late"
                                      : ""
                                  }
                                >
                                  {format(t.due)}
                                </td>
                                <td>{t.owner || "Unassigned"}</td>
                                <td>
                                  <select
                                    aria-label={`Status for ${t.title}`}
                                    disabled={saving}
                                    value={t.status}
                                    onChange={(e) =>
                                      saveTask({ ...t, status: e.target.value })
                                    }
                                  >
                                    {statuses.map((s) => (
                                      <option key={s}>{s}</option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      empty(
                        scope === "All tasks"
                          ? "A fresh start for your work."
                          : "No tasks match this view.",
                      )
                    )}
                  </section>
                </>
              )}
              {page === "matrix" && (
                <>
                  {FilterBar()}
                  <div className="matrix">
                    {priorities.map((p, i) => {
                      const list = filtered.filter((t) => priority(t) === i);
                      return (
                        <section key={p} className={"quadrant p" + i}>
                          <header>
                            <div>
                              <span className="eyebrow">{descriptions[i]}</span>
                              <h2>
                                {p} <span>{list.length}</span>
                              </h2>
                            </div>
                            <span className="quadrant-symbol">
                              {["↗", "▦", "⇢", "−"][i]}
                            </span>
                          </header>
                          <p>
                            {
                              [
                                "Handle these first. They need your attention.",
                                "Protect time for meaningful, long-term work.",
                                "Assign an owner and follow up on progress.",
                                "Reconsider, reduce, or remove these tasks.",
                              ][i]
                            }
                          </p>
                          <div className="quadrant-tasks">
                            {list.length ? (
                              list.map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => edit(t)}
                                  className={
                                    "matrix-task " +
                                    (done(t) ? "completed" : "")
                                  }
                                >
                                  <strong>
                                    {done(t) ? "✓ " : ""}
                                    {t.title}
                                  </strong>
                                  <span>
                                    {t.category}
                                    <small>{format(t.due)}</small>
                                  </span>
                                  {t.owner && <em>Assigned to {t.owner}</em>}
                                </button>
                              ))
                            ) : (
                              <div className="quiet-empty">
                                No tasks in this quadrant
                              </div>
                            )}
                          </div>
                          <button
                            className="add-quadrant"
                            onClick={() => {
                              setDeleteConfirm(false);
                              setEditor({
                                id: crypto.randomUUID(),
                                title: "",
                                category: settings.categories[0] || "General",
                                due: "",
                                owner: "",
                                notes: "",
                                status: "Not started",
                                important: i < 2,
                                urgent: i === 0 || i === 2,
                              });
                            }}
                          >
                            ＋ Add task
                          </button>
                        </section>
                      );
                    })}
                  </div>
                </>
              )}
              {page === "calendar" && (
                <>
                  {FilterBar()}
                  <section className="panel calendar-panel">
                    <div className="calendar-toolbar">
                      <div className="calendar-controls">
                        <button
                          aria-label="Previous month"
                          onClick={() => {
                            setMonth(
                              new Date(
                                month.getFullYear(),
                                month.getMonth() - 1,
                                1,
                              ),
                            );
                            setSelectedDay("");
                          }}
                        >
                          ‹
                        </button>
                        <h2>
                          {month.toLocaleDateString("en", {
                            month: "long",
                            year: "numeric",
                          })}
                        </h2>
                        <button
                          aria-label="Next month"
                          onClick={() => {
                            setMonth(
                              new Date(
                                month.getFullYear(),
                                month.getMonth() + 1,
                                1,
                              ),
                            );
                            setSelectedDay("");
                          }}
                        >
                          ›
                        </button>
                        <button
                          onClick={() => {
                            setMonth(new Date());
                            setSelectedDay(today);
                          }}
                        >
                          Today
                        </button>
                      </div>
                      <input
                        type="month"
                        aria-label="Choose month and year"
                        value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
                        onChange={(e) => {
                          if (e.target.value) {
                            setMonth(new Date(e.target.value + "-01T12:00:00"));
                            setSelectedDay("");
                          }
                        }}
                      />
                    </div>
                    <div className="calendar-scroll">
                      <div className="calendar-grid">
                        {(settings.weekStart === "Monday"
                          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                          : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                        ).map((d) => (
                          <div className="weekday" key={d}>
                            {d}
                          </div>
                        ))}
                        {Array.from({ length: 42 }, (_, i) => {
                          const first = new Date(
                            month.getFullYear(),
                            month.getMonth(),
                            1,
                          );
                          const offset =
                            (first.getDay() +
                              (settings.weekStart === "Monday" ? 6 : 0)) %
                            7;
                          const date = new Date(
                            month.getFullYear(),
                            month.getMonth(),
                            i - offset + 1,
                          );
                          const key = dateKey(date);
                          const dayTasks = filtered.filter(
                            (t) => t.due === key,
                          );
                          return (
                            <div
                              key={key}
                              className={`calendar-day ${date.getMonth() !== month.getMonth() ? "muted-day" : ""} ${key === today ? "today" : ""} ${key === selectedDay ? "selected-day" : ""}`}
                            >
                              <button
                                className="day-number"
                                aria-label={`View tasks for ${key}`}
                                onClick={() => setSelectedDay(key)}
                              >
                                {date.getDate()}
                              </button>
                              <button
                                className="day-add"
                                aria-label={`Add task on ${key}`}
                                onClick={() => create(key)}
                              >
                                +
                              </button>
                              {dayTasks.slice(0, 3).map((t) => (
                                <button
                                  className={`calendar-task p${priority(t)} ${done(t) ? "completed" : ""}`}
                                  key={t.id}
                                  onClick={() => edit(t)}
                                >
                                  {done(t) ? "✓ " : ""}
                                  {t.title}
                                </button>
                              ))}
                              {dayTasks.length > 3 && (
                                <button
                                  className="more-tasks"
                                  onClick={() => setSelectedDay(key)}
                                >
                                  +{dayTasks.length - 3} more
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="calendar-legend">
                      {priorities.map((p, i) => (
                        <span key={p}>
                          <i className={"p" + i} />
                          {p}
                        </span>
                      ))}
                      <span>✓ Completed</span>
                    </div>
                  </section>
                  <section className="panel agenda">
                    <div className="section-heading">
                      <h2>
                        {selectedDay
                          ? `Tasks for ${format(selectedDay)}`
                          : "This month’s agenda"}
                      </h2>
                      <span>
                        {
                          filtered.filter((t) =>
                            selectedDay
                              ? t.due === selectedDay
                              : t.due.startsWith(dateKey(month).slice(0, 7)),
                          ).length
                        }{" "}
                        tasks
                      </span>
                    </div>
                    {filtered
                      .filter((t) =>
                        selectedDay
                          ? t.due === selectedDay
                          : t.due.startsWith(dateKey(month).slice(0, 7)),
                      )
                      .map(row)}
                    {!filtered.some((t) =>
                      selectedDay
                        ? t.due === selectedDay
                        : t.due.startsWith(dateKey(month).slice(0, 7)),
                    ) && (
                      <p className="quiet-empty">
                        No scheduled tasks. Use + on a day to plan something.
                      </p>
                    )}
                  </section>
                </>
              )}
              {page === "reports" && (
                <>
                  <div className="stats-grid">
                    {stats.map(([label, count, sub, view]) => (
                      <Link
                        href={"/tasks?view=" + view}
                        className="stat-card"
                        key={label}
                      >
                        <div>{label}</div>
                        <strong>{count}</strong>
                        <small>{sub}</small>
                      </Link>
                    ))}
                  </div>
                  <div className="reports-grid">
                    <section className="panel">
                      <h2>Progress by priority</h2>
                      <p className="muted">
                        Completed tasks out of the total in each quadrant.
                      </p>
                      {priorities.map((p, i) => {
                        const ts = tasks.filter((t) => priority(t) === i),
                          n = ts.filter(done).length;
                        return (
                          <div className="report-row" key={p}>
                            <div>
                              <b>{p}</b>
                              <span>
                                {n} / {ts.length}
                              </span>
                            </div>
                            <div className="bar">
                              <i
                                className={"p" + i}
                                style={{
                                  width: `${ts.length ? (n / ts.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </section>
                    <section className="panel">
                      <h2>Status breakdown</h2>
                      <p className="muted">
                        A clear picture of how work is moving.
                      </p>
                      {statuses.map((s, i) => {
                        const count = tasks.filter(
                          (t) => t.status === s,
                        ).length;
                        return (
                          <div className="report-row" key={s}>
                            <div>
                              <b>{s}</b>
                              <span>{count}</span>
                            </div>
                            <div className="bar">
                              <i
                                className={"p" + i}
                                style={{
                                  width: `${tasks.length ? (count / tasks.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </section>
                    <section className="panel">
                      <h2>Category distribution</h2>
                      {categories.map((c) => {
                        const count = tasks.filter(
                          (t) => t.category === c,
                        ).length;
                        return (
                          <div className="category-report" key={c}>
                            <span>{c}</span>
                            <div className="bar">
                              <i
                                style={{
                                  width: `${tasks.length ? (count / tasks.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <b>{count}</b>
                          </div>
                        );
                      })}
                    </section>
                    <section className="panel insight">
                      <span>✧</span>
                      <h2>{progress}% of the way there.</h2>
                      <p>
                        {overdue.length
                          ? `${overdue.length} overdue tasks could use your attention. Review them and choose your next move.`
                          : "Keep your priorities clear and give important work a place on your calendar."}
                      </p>
                      <Link className="primary" href="/tasks?view=Overdue">
                        Review your tasks →
                      </Link>
                    </section>
                  </div>
                </>
              )}
              {page === "settings" && (
                <div className="settings-grid">
                  <section className="panel">
                    <h2>Make this workspace yours</h2>
                    <p className="muted">Personalize how you plan your work.</p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (await write({ action: "settings", settings }))
                          setNotice("Workspace settings saved");
                      }}
                    >
                      <label>
                        Workspace name
                        <input
                          required
                          maxLength={60}
                          value={settings.name}
                          onChange={(e) =>
                            setSettings({ ...settings, name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Calendar week starts on
                        <select
                          value={settings.weekStart}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              weekStart: e.target.value,
                            })
                          }
                        >
                          <option>Monday</option>
                          <option>Sunday</option>
                        </select>
                      </label>
                      <h3>Task categories</h3>
                      <p className="muted">
                        Existing tasks keep their category when you remove it
                        here.
                      </p>
                      <div className="category-chips">
                        {settings.categories.map((c) => (
                          <span key={c}>
                            {c}
                            <button
                              type="button"
                              aria-label={`Remove ${c}`}
                              onClick={() =>
                                setSettings({
                                  ...settings,
                                  categories: settings.categories.filter(
                                    (x) => x !== c,
                                  ),
                                })
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="category-add">
                        <input
                          aria-label="New category"
                          maxLength={60}
                          placeholder="Add a category"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={
                            !newCategory.trim() ||
                            settings.categories.length >= 30
                          }
                          onClick={() => {
                            if (
                              !settings.categories.includes(newCategory.trim())
                            )
                              setSettings({
                                ...settings,
                                categories: [
                                  ...settings.categories,
                                  newCategory.trim(),
                                ],
                              });
                            setNewCategory("");
                          }}
                        >
                          Add
                        </button>
                      </div>
                      <button className="primary" disabled={saving}>
                        Save settings
                      </button>
                    </form>
                  </section>
                  <section className="panel brand-panel">
                    <span className="logo-crop large">
                      <img src="/logo.png" alt="JLCG logo" />
                    </span>
                    <h2>Distinctly JLCG.</h2>
                    <p>
                      A workspace inspired by your identity.
                      <br />
                      Warm gold. Clean white. Clear direction.
                    </p>
                    <div className="swatches">
                      <span style={{ background: "#f5ab16" }} />
                      <span style={{ background: "#272a25" }} />
                      <span style={{ background: "#faf9f6" }} />
                    </div>
                    <hr />
                    <h3>Your data, organized</h3>
                    <p>
                      Your tasks and settings are saved to this workspace.
                      Export your task list whenever you need a spreadsheet
                      copy.
                    </p>
                    <button onClick={exportTasks}>↓ Export tasks as CSV</button>
                  </section>
                </div>
              )}
              {page === "guide" && (
                <section className="panel guide">
                  <h2>A simpler way to plan your day</h2>
                  <p>
                    JLCG brings your tasks, priorities, and calendar into one
                    connected workspace.
                  </p>
                  {[
                    [
                      "01",
                      "Capture your work",
                      "Open All tasks or select New task. Add a title, category, assignee, due date, and notes.",
                    ],
                    [
                      "02",
                      "Choose what matters",
                      "Mark a task as important and/or urgent. It automatically appears in the corresponding Eisenhower quadrant.",
                    ],
                    [
                      "03",
                      "Give your work a date",
                      "Tasks with a due date appear on your calendar. Filter by category, priority, or status. Change the week’s start day in Settings.",
                    ],
                    [
                      "04",
                      "Keep your progress visible",
                      "Update a status or check off a task. The overview and reports update automatically. Use CSV export for a spreadsheet copy.",
                    ],
                  ].map(([n, title, desc]) => (
                    <div className="guide-step" key={n}>
                      <b>{n}</b>
                      <div>
                        <h3>{title}</h3>
                        <p>{desc}</p>
                      </div>
                    </div>
                  ))}
                  <div className="guide-note">
                    “Eliminate” corresponds to “Delete” in your reference. It is
                    a priority category, so tasks stay saved until you
                    explicitly delete them.
                  </div>
                  <button className="primary" onClick={() => create()}>
                    Create your first task →
                  </button>
                </section>
              )}
            </>
          )}
          <footer>
            JLCG TASK WORKSPACE <span>A clear plan for what comes next.</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        onCancel={() => setEditor(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setEditor(null);
        }}
      >
        {editor && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveTask({ ...editor, title: editor.title.trim() });
            }}
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">MAKE IT HAPPEN</span>
                <h2>
                  {tasks.some((t) => t.id === editor.id)
                    ? "Task details"
                    : "Create a new task"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close task editor"
                onClick={() => setEditor(null)}
              >
                ×
              </button>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <label>
              Task name
              <input
                autoFocus
                required
                maxLength={200}
                placeholder="What needs to get done?"
                value={editor.title}
                onChange={(e) =>
                  setEditor({ ...editor, title: e.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label>
                Category
                <select
                  value={editor.category}
                  onChange={(e) =>
                    setEditor({ ...editor, category: e.target.value })
                  }
                >
                  {Array.from(new Set([...categories, editor.category])).map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Status
                <select
                  value={editor.status}
                  onChange={(e) =>
                    setEditor({ ...editor, status: e.target.value })
                  }
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={editor.due}
                  onChange={(e) =>
                    setEditor({ ...editor, due: e.target.value })
                  }
                />
              </label>
              <label>
                Assignee
                <input
                  maxLength={100}
                  placeholder="Name of the person responsible"
                  value={editor.owner}
                  onChange={(e) =>
                    setEditor({ ...editor, owner: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="priority-options">
              <label>
                <input
                  type="checkbox"
                  checked={editor.important}
                  onChange={(e) =>
                    setEditor({ ...editor, important: e.target.checked })
                  }
                />{" "}
                Important
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={editor.urgent}
                  onChange={(e) =>
                    setEditor({ ...editor, urgent: e.target.checked })
                  }
                />{" "}
                Urgent
              </label>
              <span className={"pill p" + priority(editor)}>
                {priorities[priority(editor)]}
              </span>
            </div>
            <label>
              Notes
              <textarea
                rows={3}
                maxLength={5000}
                placeholder="Details, next steps, or useful context…"
                value={editor.notes}
                onChange={(e) =>
                  setEditor({ ...editor, notes: e.target.value })
                }
              />
            </label>
            <div className="dialog-actions">
              {tasks.some((t) => t.id === editor.id) &&
                (deleteConfirm ? (
                  <button
                    type="button"
                    className="danger"
                    disabled={saving}
                    onClick={async () => {
                      if (await write({ action: "delete", id: editor.id })) {
                        setTasks(tasks.filter((t) => t.id !== editor.id));
                        setEditor(null);
                        setNotice("Task deleted");
                      }
                    }}
                  >
                    Confirm delete
                  </button>
                ) : (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    Delete task
                  </button>
                ))}
              <button
                type="button"
                className="cancel"
                onClick={() => setEditor(null)}
              >
                Cancel
              </button>
              <button
                className="primary"
                disabled={saving || !editor.title.trim()}
              >
                {saving ? "Saving…" : "Save task"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
