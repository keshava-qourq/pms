// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Button, Input, Textarea, Label, Select, Checkbox, Badge, Table, THead, TBody, TR, TH, TD, Empty } = UI;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Plus, Check, X, ChevronRight, ChevronLeft, Clock, Edit, ArrowLeft, ArrowRight, AlertCircle, CheckCircle } = Icons;

const TODAY = "2026-10-26";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUSES = [
  { key: "todo", label: "To do", wf: "b-3-0" },
  { key: "in_progress", label: "In progress", wf: "b-3-1" },
  { key: "done", label: "Done", wf: "b-3-2" },
];

const TEAM = [
  { id: "u1", name: "Priya Nandakumar", short: "Priya N" },
  { id: "u2", name: "Tom Ek", short: "Tom Ek" },
  { id: "u3", name: "Mia Oduya", short: "Mia Oduya" },
  { id: "u4", name: "Dan Whitlock", short: "Dan W" },
  { id: "u5", name: "Sara Lindqvist", short: "Sara L" },
];

const LABELS = [
  { id: "l1", name: "Research", color: "neutral" },
  { id: "l2", name: "Design", color: "neutral" },
  { id: "l3", name: "Content", color: "neutral" },
  { id: "l4", name: "Engineering", color: "neutral" },
  { id: "l5", name: "Blocked", color: "accent" },
  { id: "l6", name: "SEO", color: "neutral" },
];

const SEED_TASKS = [
  { id: "t-204", wf: "i-3-0-0", title: "Audit current sitemap", owner_id: "u1", due_date: "2026-11-03", status: "todo", labels: ["l1"] },
  { id: "t-207", wf: "i-3-0-1", title: "Draft new nav structure", owner_id: "u2", due_date: "2026-11-06", status: "todo", labels: ["l2"] },
  { id: "t-211", wf: "i-3-0-2", title: "Collect brand assets", owner_id: null, due_date: "2026-11-10", status: "todo", labels: [] },
  { id: "t-213", wf: null, title: "Set up 301 redirect map", owner_id: "u4", due_date: "2026-10-24", status: "todo", labels: ["l6", "l5"] },
  { id: "t-198", wf: "i-3-1-0", title: "Build component library", owner_id: "u3", due_date: "2026-11-12", status: "in_progress", labels: ["l2", "l4"] },
  { id: "t-201", wf: "i-3-1-1", title: "Rewrite pricing copy", owner_id: "u2", due_date: "2026-11-05", status: "in_progress", labels: ["l3"] },
  { id: "t-160", wf: "i-3-2-0", title: "Stakeholder interviews", owner_id: "u1", due_date: "2026-10-20", status: "done", labels: ["l1"] },
  { id: "t-166", wf: "i-3-2-1", title: "Analytics baseline", owner_id: "u3", due_date: "2026-10-22", status: "done", labels: [] },
  { id: "t-141", wf: null, title: "Competitor teardown", owner_id: "u1", due_date: "2026-10-09", status: "done", labels: ["l1"] },
  { id: "t-145", wf: null, title: "Content inventory", owner_id: "u2", due_date: "2026-10-12", status: "done", labels: ["l3"] },
  { id: "t-149", wf: null, title: "Design tokens defined", owner_id: "u3", due_date: "2026-10-14", status: "done", labels: ["l2"] },
  { id: "t-151", wf: null, title: "Accessibility audit of current site", owner_id: "u5", due_date: "2026-10-15", status: "done", labels: ["l1"] },
  { id: "t-153", wf: null, title: "Hosting and CDN decision", owner_id: "u4", due_date: "2026-10-16", status: "done", labels: ["l4"] },
  { id: "t-157", wf: null, title: "Homepage wireframes", owner_id: "u3", due_date: "2026-10-19", status: "done", labels: ["l2"] },
  { id: "t-163", wf: null, title: "Typography scale sign-off", owner_id: "u5", due_date: "2026-10-21", status: "done", labels: ["l2"] },
  { id: "t-132", wf: null, title: "Legal review of product claims", owner_id: "u5", due_date: "2026-10-02", status: "done", labels: ["l3"] },
  { id: "t-170", wf: null, title: "Migrate blog archive", owner_id: "u4", due_date: "2026-10-23", status: "done", labels: ["l4"] },
  { id: "t-120", wf: null, title: "Kickoff brief approved", owner_id: "u1", due_date: "2026-09-30", status: "done", labels: [] },
];

const SEED_PROJECT = {
  id: "p-12",
  code: "PRJ-204",
  name: "Website Redesign",
  description:
    "Full redesign of the marketing site, including new information architecture and a shared component library.",
  created_by: "Priya Nandakumar",
  created_at: "2026-09-14",
};

const hexToRgba = (hex, alpha) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const shortDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const longDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const ownerName = (id) => {
  const u = TEAM.find((m) => m.id === id);
  return u ? u.name : "Unassigned";
};

const ownerShort = (id) => {
  const u = TEAM.find((m) => m.id === id);
  return u ? u.short : "Unassigned";
};

const labelById = (id) => LABELS.find((l) => l.id === id);

export default function Screen() {
  const navigate = useNavigate();
  const INK = brand.primaryColor;
  const ACCENT = brand.accentColor;
  const MUTED = brand.neutralColor;
  const RULE = hexToRgba(INK, 0.14);
  const RADIUS = brand.radius;

  const [project, setProject] = React.useState(SEED_PROJECT);
  const [tasks, setTasks] = React.useState(SEED_TASKS);
  const [view, setView] = React.useState("board");
  const [modal, setModal] = React.useState(null); // 'task' | 'project' | null
  const [flashId, setFlashId] = React.useState(null);
  const [saveState, setSaveState] = React.useState({ mode: "synced", message: "All changes saved · synced 09:41" });
  const [dragId, setDragId] = React.useState(null);
  const [dragCol, setDragCol] = React.useState(null);

  const timers = React.useRef([]);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };

  const announce = (message) => {
    setSaveState({ mode: "saving", message: "Saving…" });
    later(() => setSaveState({ mode: "saved", message }), 450);
  };

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  /* ---------- task mutations (shared by board + list) ---------- */
  const setStatus = (id, status) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    const t = tasks.find((x) => x.id === id);
    const label = STATUSES.find((s) => s.key === status).label;
    setFlashId(id);
    later(() => setFlashId(null), 1700);
    announce(`“${t ? t.title : "Task"}” moved to ${label}`);
  };

  const setOwner = (id, owner_id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, owner_id: owner_id || null } : t)));
    const t = tasks.find((x) => x.id === id);
    announce(`“${t ? t.title : "Task"}” assigned to ${ownerName(owner_id)}`);
  };

  /* ---------- modals ---------- */
  const taskTriggerRef = React.useRef(null);
  const projectTriggerRef = React.useRef(null);
  const firstFieldRef = React.useRef(null);

  React.useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    const f = later(() => firstFieldRef.current && firstFieldRef.current.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(f);
    };
  }, [modal]);

  const closeModal = () => {
    const was = modal;
    setModal(null);
    later(() => {
      const ref = was === "task" ? taskTriggerRef : projectTriggerRef;
      if (ref.current) ref.current.focus();
    }, 10);
  };

  /* ---------- new task form ---------- */
  const emptyForm = {
    title: "",
    description: "",
    owner_id: "u1",
    due_date: "2026-11-03",
    status: "todo",
    labels: [],
  };
  const [form, setForm] = React.useState(emptyForm);
  const [formError, setFormError] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const openTaskModal = () => {
    setForm(emptyForm);
    setFormError("");
    setModal("task");
  };

  const submitTask = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("A task needs a title before it can join the board.");
      if (firstFieldRef.current) firstFieldRef.current.focus();
      return;
    }
    setCreating(true);
    later(() => {
      const id = "t-" + Math.floor(220 + Math.random() * 60);
      const created = {
        id,
        wf: null,
        title: form.title.trim(),
        description: form.description.trim(),
        owner_id: form.owner_id || null,
        due_date: form.due_date,
        status: form.status,
        labels: form.labels,
      };
      setTasks((prev) => [created, ...prev]);
      setCreating(false);
      setFlashId(id);
      later(() => setFlashId(null), 1700);
      setSaveState({
        mode: "saved",
        message: `“${created.title}” added to ${STATUSES.find((s) => s.key === created.status).label}`,
      });
      closeModal();
    }, 520);
  };

  /* ---------- edit project form ---------- */
  const [pForm, setPForm] = React.useState({ name: project.name, description: project.description });
  const [pError, setPError] = React.useState("");
  const [pSaving, setPSaving] = React.useState(false);

  const openProjectModal = () => {
    setPForm({ name: project.name, description: project.description });
    setPError("");
    setModal("project");
  };

  const submitProject = (e) => {
    e.preventDefault();
    if (!pForm.name.trim()) {
      setPError("Give the project a name so the team can find it.");
      if (firstFieldRef.current) firstFieldRef.current.focus();
      return;
    }
    setPSaving(true);
    later(() => {
      setProject((p) => ({ ...p, name: pForm.name.trim(), description: pForm.description.trim() }));
      setPSaving(false);
      setSaveState({ mode: "saved", message: "Project details saved for the whole team" });
      closeModal();
    }, 480);
  };

  /* ---------- styles ---------- */
  const css = `
    @keyframes obs-fade { from { opacity: 0 } to { opacity: 1 } }
    @keyframes obs-rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
    @keyframes obs-flash { 0% { background-color: ${hexToRgba(ACCENT, 0.16)} } 100% { background-color: transparent } }
    .obs-fade { animation: obs-fade .16s ease-out both }
    .obs-rise { animation: obs-rise .2s cubic-bezier(.2,.7,.3,1) both }
    .obs-flash { animation: obs-flash 1.6s ease-out both }
    .obs-focus:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px }
    .obs-card:hover .obs-move { opacity: 1 }
    .obs-card:focus-within .obs-move { opacity: 1 }
    .obs-row:hover { background-color: ${hexToRgba(INK, 0.035)} }
    @media (prefers-reduced-motion: reduce) {
      .obs-fade, .obs-rise, .obs-flash { animation: none !important }
    }
  `;

  const labelStyle = { fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 };
  const primaryBtn = {
    backgroundColor: INK,
    color: brand.backgroundColor,
    borderRadius: RADIUS,
    border: `2px solid ${INK}`,
    fontWeight: 700,
    letterSpacing: "0.02em",
  };
  const ghostBtn = {
    backgroundColor: "transparent",
    color: INK,
    borderRadius: RADIUS,
    border: `2px solid ${INK}`,
    fontWeight: 700,
    letterSpacing: "0.02em",
  };
  const fieldStyle = { border: `2px solid ${INK}`, borderRadius: RADIUS, backgroundColor: brand.backgroundColor, color: INK };
  const miniSelect = {
    border: `1px solid ${hexToRgba(INK, 0.35)}`,
    borderRadius: RADIUS,
    backgroundColor: "transparent",
    color: INK,
    fontSize: 12,
    padding: "3px 6px",
    height: 28,
  };

  const LabelChip = ({ id }) => {
    const l = labelById(id);
    if (!l) return null;
    const isAccent = l.color === "accent";
    return (
      <Badge
        className="inline-flex items-center"
        style={{
          ...labelStyle,
          borderRadius: RADIUS,
          border: `1px solid ${isAccent ? ACCENT : hexToRgba(INK, 0.45)}`,
          color: isAccent ? ACCENT : INK,
          backgroundColor: "transparent",
          padding: "1px 5px",
          lineHeight: "15px",
        }}
      >
        {l.name}
      </Badge>
    );
  };

  const overdue = (t) => t.status !== "done" && t.due_date < TODAY;

  /* ---------- board column ---------- */
  const BoardColumn = ({ status, idx }) => {
    const colTasks = tasks.filter((t) => t.status === status.key);
    const wfLimits = { todo: 3, in_progress: 2, done: 2 };
    const sIndex = STATUSES.findIndex((s) => s.key === status.key);
    const isOver = dragCol === status.key;

    return (
      <section
        data-wf={status.wf}
        className="flex min-w-0 flex-col"
        style={{
          borderRight: idx < 2 ? `2px solid ${INK}` : "none",
          backgroundColor: isOver ? hexToRgba(ACCENT, 0.06) : "transparent",
          transition: "background-color .15s ease",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragCol(status.key);
        }}
        onDragLeave={() => setDragCol((c) => (c === status.key ? null : c))}
        onDrop={(e) => {
          e.preventDefault();
          setDragCol(null);
          if (dragId) {
            const t = tasks.find((x) => x.id === dragId);
            if (t && t.status !== status.key) setStatus(dragId, status.key);
          }
          setDragId(null);
        }}
      >
        <header
          className="flex items-baseline justify-between px-3 py-2"
          style={{ borderBottom: `2px solid ${INK}` }}
        >
          <h3 style={{ ...labelStyle, fontFamily: brand.fontHeading }}>{status.label}</h3>
          <span
            className="tabular-nums"
            style={{ fontSize: 11, fontWeight: 700, color: colTasks.length ? INK : MUTED }}
          >
            {String(colTasks.length).padStart(2, "0")}
          </span>
        </header>

        {colTasks.length === 0 ? (
          <p
            className="m-3 px-3 py-6 text-center"
            style={{
              border: `2px dashed ${hexToRgba(INK, 0.25)}`,
              borderRadius: RADIUS,
              color: MUTED,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Nothing in {status.label.toLowerCase()}.
            <br />
            Drag a card here, or use the arrows on a card.
          </p>
        ) : (
          <ul className="flex flex-col">
            {colTasks.map((t, i) => (
              <li
                key={t.id}
                draggable
                onDragStart={() => setDragId(t.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setDragCol(null);
                }}
                className={`obs-card px-3 py-3 ${flashId === t.id ? "obs-flash" : ""}`}
                style={{
                  borderBottom: `1px solid ${RULE}`,
                  cursor: "grab",
                  opacity: dragId === t.id ? 0.45 : 1,
                }}
              >
                <div className="flex items-start gap-2">
                  {t.status === "done" ? (
                    <Check aria-hidden="true" className="mt-[2px] h-3.5 w-3.5 shrink-0" style={{ color: MUTED }} />
                  ) : null}
                  <button
                    type="button"
                    data-wf={t.wf && i < wfLimits[status.key] ? t.wf : undefined}
                    onClick={() => navigate("task")}
                    className="obs-focus min-w-0 flex-1 text-left"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      color: t.status === "done" ? MUTED : INK,
                      background: "none",
                      border: "none",
                      padding: 0,
                    }}
                  >
                    {t.title}
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="tabular-nums truncate" style={{ fontSize: 11, color: MUTED }}>
                    {ownerShort(t.owner_id)} · {shortDate(t.due_date)}
                    {overdue(t) ? (
                      <span style={{ color: ACCENT, fontWeight: 700 }}> · Overdue</span>
                    ) : null}
                  </span>
                  <span className="obs-move flex shrink-0 gap-1 opacity-0 transition-opacity">
                    <button
                      type="button"
                      aria-label={`Move “${t.title}” to ${sIndex > 0 ? STATUSES[sIndex - 1].label : "the previous column"}`}
                      disabled={sIndex === 0}
                      onClick={() => setStatus(t.id, STATUSES[sIndex - 1].key)}
                      className="obs-focus flex h-7 w-7 items-center justify-center"
                      style={{
                        border: `1px solid ${hexToRgba(INK, sIndex === 0 ? 0.15 : 0.4)}`,
                        borderRadius: RADIUS,
                        color: sIndex === 0 ? hexToRgba(INK, 0.25) : INK,
                        cursor: sIndex === 0 ? "not-allowed" : "pointer",
                        backgroundColor: "transparent",
                      }}
                    >
                      <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move “${t.title}” to ${sIndex < 2 ? STATUSES[sIndex + 1].label : "the next column"}`}
                      disabled={sIndex === STATUSES.length - 1}
                      onClick={() => setStatus(t.id, STATUSES[sIndex + 1].key)}
                      className="obs-focus flex h-7 w-7 items-center justify-center"
                      style={{
                        border: `1px solid ${hexToRgba(INK, sIndex === STATUSES.length - 1 ? 0.15 : 0.4)}`,
                        borderRadius: RADIUS,
                        color: sIndex === STATUSES.length - 1 ? hexToRgba(INK, 0.25) : INK,
                        cursor: sIndex === STATUSES.length - 1 ? "not-allowed" : "pointer",
                        backgroundColor: "transparent",
                      }}
                    >
                      <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>

                {t.labels.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.labels.map((lid) => (
                      <LabelChip key={lid} id={lid} />
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  /* ---------- tabs (hand-built for wireframe ids + full ARIA) ---------- */
  const tabDefs = [
    { key: "board", label: "Board", wf: "i-2-0-0" },
    { key: "list", label: "List", wf: "i-2-0-1" },
  ];
  const tabRefs = React.useRef({});
  const onTabKey = (e) => {
    const i = tabDefs.findIndex((t) => t.key === view);
    let next = null;
    if (e.key === "ArrowRight") next = tabDefs[(i + 1) % tabDefs.length];
    if (e.key === "ArrowLeft") next = tabDefs[(i - 1 + tabDefs.length) % tabDefs.length];
    if (next) {
      e.preventDefault();
      setView(next.key);
      const el = tabRefs.current[next.key];
      if (el) el.focus();
    }
  };

  return (
    <div
      className="w-full"
      style={{ backgroundColor: brand.backgroundColor, color: INK, fontFamily: brand.fontBody }}
    >
      <style>{css}</style>

      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8 sm:py-8">
        {/* ---------- Row 1 ---------- */}
        <div className="grid grid-cols-12 items-center gap-x-4 gap-y-3">
          <div className="col-span-12 md:col-span-3">
            <button
              type="button"
              data-wf="b-0-0"
              onClick={() => navigate("projects")}
              className="obs-focus inline-flex items-center gap-1.5"
              style={{ ...labelStyle, color: MUTED, background: "none", border: "none", padding: "4px 0" }}
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              All projects
            </button>
          </div>

          <div className="col-span-12 md:col-span-5">
            <p className="tabular-nums" style={{ ...labelStyle, color: MUTED }}>
              {project.code} · opened {longDate(project.created_at)} · {project.created_by}
            </p>
            <h1
              data-wf="b-0-1"
              className="mt-1"
              style={{
                fontFamily: brand.fontHeading,
                fontSize: 34,
                lineHeight: 1.05,
                fontWeight: 700,
                letterSpacing: "-0.025em",
              }}
            >
              {project.name}
            </h1>
          </div>

          <div className="col-span-6 md:col-span-2">
            <Button
              data-wf="b-0-2"
              ref={projectTriggerRef}
              type="button"
              onClick={openProjectModal}
              className="obs-focus h-9 w-full px-3 text-[12px] uppercase"
              style={ghostBtn}
            >
              Edit project
            </Button>
          </div>

          <div className="col-span-6 md:col-span-2">
            <Button
              data-wf="b-0-3"
              ref={taskTriggerRef}
              type="button"
              onClick={openTaskModal}
              className="obs-focus flex h-9 w-full items-center justify-center gap-1.5 px-3 text-[12px] uppercase"
              style={primaryBtn}
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              New task
            </Button>
          </div>
        </div>

        {/* ---------- Row 2 ---------- */}
        <section data-wf="b-1-0" className="mt-6" style={{ borderTop: `2px solid ${INK}`, paddingTop: 16 }}>
          <div className="grid grid-cols-12 gap-x-6 gap-y-4">
            <p
              className="col-span-12 lg:col-span-7"
              style={{ fontSize: 14, lineHeight: 1.6, maxWidth: "68ch", color: INK }}
            >
              {project.description}{" "}
              <span className="tabular-nums" style={{ fontWeight: 700 }}>
                {doneCount} of {total} tasks complete.
              </span>
            </p>

            <div className="col-span-12 lg:col-span-5">
              {/* signature: one segment per task, in board order */}
              <div className="flex gap-[2px]" aria-hidden="true">
                {tasks
                  .slice()
                  .sort(
                    (a, b) =>
                      STATUSES.findIndex((s) => s.key === b.status) -
                      STATUSES.findIndex((s) => s.key === a.status)
                  )
                  .map((t) => (
                    <span
                      key={t.id}
                      className="h-2 flex-1"
                      style={{
                        backgroundColor:
                          t.status === "done" ? INK : t.status === "in_progress" ? ACCENT : hexToRgba(INK, 0.14),
                        transition: "background-color .2s ease",
                      }}
                    />
                  ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="tabular-nums" style={{ ...labelStyle, color: MUTED }}>
                  {tasks.filter((t) => t.status === "todo").length} to do ·{" "}
                  <span style={{ color: ACCENT }}>{tasks.filter((t) => t.status === "in_progress").length} in progress</span> ·{" "}
                  {doneCount} done
                </p>
                <p
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-1.5 truncate"
                  style={{ fontSize: 11, color: saveState.mode === "saving" ? ACCENT : MUTED }}
                >
                  {saveState.mode === "saving" ? (
                    <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {saveState.message}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Row 3 ---------- */}
        <div data-wf="b-2-0" className="mt-6">
          <div
            role="tablist"
            aria-label="Task views"
            onKeyDown={onTabKey}
            className="flex gap-6"
            style={{ borderBottom: `2px solid ${INK}` }}
          >
            {tabDefs.map((t) => {
              const active = view === t.key;
              return (
                <button
                  key={t.key}
                  data-wf={t.wf}
                  ref={(el) => (tabRefs.current[t.key] = el)}
                  role="tab"
                  type="button"
                  id={`tab-${t.key}`}
                  aria-selected={active}
                  aria-controls={`panel-${t.key}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setView(t.key)}
                  className="obs-focus -mb-[2px] px-1 pb-2 pt-1"
                  style={{
                    ...labelStyle,
                    fontSize: 12,
                    color: active ? INK : MUTED,
                    borderBottom: `3px solid ${active ? ACCENT : "transparent"}`,
                    background: "none",
                  }}
                >
                  {t.label}
                  <span className="tabular-nums" style={{ marginLeft: 6, color: MUTED, fontWeight: 400 }}>
                    {t.key === "board" ? "3 columns" : `${total}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------- Row 4: Board ---------- */}
        <div
          role="tabpanel"
          id="panel-board"
          aria-labelledby="tab-board"
          hidden={view !== "board"}
          className="mt-5"
        >
          {view === "board" ? (
            total === 0 ? (
              <div style={{ border: `2px solid ${INK}`, borderRadius: RADIUS }} className="py-6">
                <Empty
                  title="This board is empty"
                  description="Website Redesign has no tasks yet. Use New task at the top of this workspace to add the first one, with an owner and a due date."
                />
              </div>
            ) : (
              <div
                className="obs-fade grid grid-cols-1 md:grid-cols-3"
                style={{ border: `2px solid ${INK}`, borderRadius: RADIUS }}
              >
                {STATUSES.map((s, i) => (
                  <BoardColumn key={s.key} status={s} idx={i} />
                ))}
              </div>
            )
          ) : null}
          {view === "board" ? (
            <p className="mt-2" style={{ fontSize: 11, color: MUTED }}>
              Drag a card to another column, or focus a card and use its arrow buttons to change status.
            </p>
          ) : null}
        </div>

        {/* ---------- Row 5: List ---------- */}
        <div
          role="tabpanel"
          id="panel-list"
          aria-labelledby="tab-list"
          hidden={view !== "list"}
          className="mt-5"
        >
          {view === "list" ? (
            <section data-wf="b-4-0" className="obs-fade">
              <div className="mb-2 flex items-baseline justify-between">
                <h2
                  className="tabular-nums"
                  style={{ fontFamily: brand.fontHeading, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}
                >
                  Tasks ({total})
                </h2>
                <p style={{ ...labelStyle, color: MUTED }}>Status and owner are editable in place</p>
              </div>

              {total === 0 ? (
                <div style={{ border: `2px solid ${INK}`, borderRadius: RADIUS }} className="py-6">
                  <Empty
                    title="No tasks in this project"
                    description="Nothing has been added to Website Redesign yet. Use New task at the top of this workspace — the first task sets the pace for the rest."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto" style={{ border: `2px solid ${INK}`, borderRadius: RADIUS }}>
                  <Table className="w-full min-w-[760px]" style={{ borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
                    <THead>
                      <TR style={{ borderBottom: `2px solid ${INK}` }}>
                        <TH data-wf="i-4-0-0" scope="col" className="px-3 py-2 text-left" style={labelStyle}>
                          Title
                        </TH>
                        <TH data-wf="i-4-0-1" scope="col" className="px-3 py-2 text-left" style={labelStyle}>
                          Owner
                        </TH>
                        <TH data-wf="i-4-0-2" scope="col" className="px-3 py-2 text-left" style={labelStyle}>
                          Due date
                        </TH>
                        <TH data-wf="i-4-0-3" scope="col" className="px-3 py-2 text-left" style={labelStyle}>
                          Status
                        </TH>
                        <TH data-wf="i-4-0-4" scope="col" className="px-3 py-2 text-left" style={labelStyle}>
                          Labels
                        </TH>
                      </TR>
                    </THead>
                    <TBody>
                      {tasks.map((t) => (
                        <TR
                          key={t.id}
                          onClick={() => navigate("task")}
                          className={`obs-row ${flashId === t.id ? "obs-flash" : ""}`}
                          style={{ borderBottom: `1px solid ${RULE}`, cursor: "pointer" }}
                        >
                          <TD className="px-3 py-2 align-middle">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate("task");
                              }}
                              className="obs-focus w-full text-left"
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: INK,
                                background: "none",
                                border: "none",
                                padding: 0,
                              }}
                            >
                              {t.title}
                            </button>
                            <span className="tabular-nums block" style={{ fontSize: 11, color: MUTED }}>
                              {t.id.toUpperCase()}
                            </span>
                          </TD>

                          <TD className="px-3 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                            <Label htmlFor={`owner-${t.id}`} className="sr-only">
                              Owner for {t.title}
                            </Label>
                            <Select
                              id={`owner-${t.id}`}
                              value={t.owner_id || ""}
                              onChange={(e) => setOwner(t.id, e.target.value)}
                              className="obs-focus w-[150px]"
                              style={miniSelect}
                            >
                              <option value="">Unassigned</option>
                              {TEAM.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </Select>
                          </TD>

                          <TD className="px-3 py-2 align-middle tabular-nums" style={{ fontSize: 12 }}>
                            {longDate(t.due_date)}
                            {overdue(t) ? (
                              <span
                                className="ml-2 inline-flex items-center gap-1"
                                style={{ color: ACCENT, fontWeight: 700, fontSize: 11 }}
                              >
                                <AlertCircle aria-hidden="true" className="h-3 w-3" />
                                Overdue
                              </span>
                            ) : null}
                          </TD>

                          <TD className="px-3 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                            <Label htmlFor={`status-${t.id}`} className="sr-only">
                              Status for {t.title}
                            </Label>
                            <Select
                              id={`status-${t.id}`}
                              value={t.status}
                              onChange={(e) => setStatus(t.id, e.target.value)}
                              className="obs-focus w-[130px]"
                              style={miniSelect}
                            >
                              {STATUSES.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </Select>
                          </TD>

                          <TD className="px-3 py-2 align-middle">
                            {t.labels.length ? (
                              <span className="flex flex-wrap gap-1">
                                {t.labels.map((lid) => (
                                  <LabelChip key={lid} id={lid} />
                                ))}
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: MUTED }}>No labels</span>
                            )}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}

              {total > 0 ? (
                <p className="mt-2 tabular-nums" style={{ fontSize: 11, color: MUTED }}>
                  {total} tasks · {doneCount} complete · {tasks.filter((t) => overdue(t)).length} overdue · updated in both views
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      {/* ---------- Row 6a: New task modal ---------- */}
      {modal === "task" ? (
        <div
          className="obs-fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          style={{ backgroundColor: hexToRgba(INK, 0.45) }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            data-wf="b-5-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-task-title"
            className="obs-rise w-full max-w-[560px]"
            style={{ backgroundColor: brand.backgroundColor, border: `2px solid ${INK}`, borderRadius: RADIUS }}
          >
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `2px solid ${INK}` }}>
              <h2 id="new-task-title" style={{ fontFamily: brand.fontHeading, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
                New task
              </h2>
              <button
                type="button"
                aria-label="Close new task form"
                onClick={closeModal}
                className="obs-focus flex h-8 w-8 items-center justify-center"
                style={{ border: `1px solid ${hexToRgba(INK, 0.35)}`, borderRadius: RADIUS, background: "none", color: INK }}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitTask} className="px-5 py-5">
              <p style={{ ...labelStyle, color: MUTED }}>In {project.name}</p>

              {formError ? (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 px-3 py-2"
                  style={{ border: `2px solid ${ACCENT}`, borderRadius: RADIUS, color: ACCENT, fontSize: 12, lineHeight: 1.5 }}
                >
                  <AlertCircle aria-hidden="true" className="mt-[1px] h-4 w-4 shrink-0" />
                  <span>{formError} Everything else you typed is still here.</span>
                </div>
              ) : null}

              <div className="mt-4">
                <Label htmlFor="task-title" style={{ ...labelStyle, display: "block", marginBottom: 6 }}>
                  Title <span style={{ color: ACCENT }}>(required)</span>
                </Label>
                <Input
                  data-wf="i-5-0-0"
                  id="task-title"
                  ref={firstFieldRef}
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value });
                    if (formError) setFormError("");
                  }}
                  placeholder="Audit current sitemap"
                  aria-invalid={formError ? "true" : "false"}
                  aria-describedby={formError ? "task-title-error" : undefined}
                  className="obs-focus h-10 w-full px-3 text-[14px]"
                  style={{ ...fieldStyle, borderColor: formError ? ACCENT : INK }}
                />
                {formError ? (
                  <p id="task-title-error" className="mt-1" style={{ fontSize: 11, color: ACCENT }}>
                    Enter a title to continue.
                  </p>
                ) : null}
              </div>

              <div className="mt-4">
                <Label htmlFor="task-desc" style={{ ...labelStyle, display: "block", marginBottom: 6 }}>
                  Description
                </Label>
                <Textarea
                  data-wf="i-5-0-1"
                  id="task-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does done look like?"
                  className="obs-focus w-full px-3 py-2 text-[14px]"
                  style={fieldStyle}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="task-owner" style={{ ...labelStyle, display: "block", marginBottom: 6 }}>
                    Owner
                  </Label>
                  <Select
                    data-wf="i-5-0-2"
                    id="task-owner"
                    value={form.owner_id}
                    onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
                    className="obs-focus h-10 w-full px-2 text-[13px]"
                    style={fieldStyle}
                  >
                    <option value="">Unassigned</option>
                    {TEAM.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="task-due" style={{ ...labelStyle, display: "block", marginBottom: 6 }}>
                    Due date
                  </Label>
                  <Input
                    data-wf="i-5-0-3"
                    id="task-due"
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="obs-focus h-10 w-full px-2 text-[13px] tabular-nums"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <Label htmlFor="task-status" style={{ ...labelStyle, display: "block", marginBottom: 6 }}>
                    Status
                  </Label>
                  <Select
                    data-wf="i-5-0-4"
                    id="task-status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="obs-focus h-10 w-full px-2 text-[13px]"
                    style={fieldStyle}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <fieldset data-wf="i-5-0-5" className="mt-4">
                <legend style={{ ...labelStyle, marginBottom: 6 }}>Labels</legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {LABELS.map((l) => {
                    const checked = form.labels.includes(l.id);
                    return (
                      <span key={l.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`new-label-${l.id}`}
                          checked={checked}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              labels: e.target.checked
                                ? [...form.labels, l.id]
                                : form.labels.filter((x) => x !== l.id),
                            })
                          }
                          className="obs-focus h-4 w-4"
                          style={{ accentColor: INK, borderRadius: RADIUS }}
                        />
                        <Label
                          htmlFor={`new-label-${l.id}`}
                          style={{ fontSize: 13, color: l.color === "accent" ? ACCENT : INK }}
                        >
                          {l.name}
                        </Label>
                      </span>
                    );
                  })}
                </div>
                <p className="mt-2" style={{ fontSize: 11, color: MUTED }}>
                  Labels show on the card and in the task list.
                </p>
              </fieldset>

              <div className="mt-6 flex items-center justify-end gap-3" style={{ borderTop: `2px solid ${INK}`, paddingTop: 16 }}>
                <Button
                  type="button"
                  onClick={closeModal}
                  className="obs-focus h-10 px-4 text-[12px] uppercase"
                  style={{ ...ghostBtn, border: `2px solid ${hexToRgba(INK, 0.3)}`, color: MUTED }}
                >
                  Cancel
                </Button>
                <Button
                  data-wf="i-5-0-6"
                  type="submit"
                  disabled={creating}
                  className="obs-focus h-10 px-5 text-[12px] uppercase"
                  style={{ ...primaryBtn, opacity: creating ? 0.6 : 1, cursor: creating ? "wait" : "pointer" }}
                >
                  {creating ? "Creating…" : "Create task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ---------- Row 6b: Edit project modal ---------- */}
      {modal === "project" ? (
        <div
          className="obs-fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          style={{ backgroundColor: hexToRgba(INK, 0.45) }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            data-wf="b-5-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-project-title"
            className="obs-rise w-full max-w-[560px]"
            style={{ backgroundColor: brand.backgroundColor, border: `2px solid ${INK}`, borderRadius: RADIUS }}
          >
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `2px solid ${INK}` }}>
              <h2 id="edit-project-title" style={{ fontFamily: brand.fontHeading, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
                Edit project details
              </h2>
              <button
                type="button"
                aria-label="Close project details form"
                onClick={closeModal}
                className="obs-focus flex h-8 w-8 items-center justify-center"
                style={{ border: `1px solid ${hexToRgba(INK, 0.35)}`, borderRadius: RADIUS, background: "none", color: INK }}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitProject} className="px-5 py-5">
              <p style={{ ...labelStyle, color: MUTED }}>
                {project.code} · every member can edit this project
              </p>

              {pError ? (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 px-3 py-2"
                  style={{ border: `2px solid ${ACCENT}`, borderRadius: RADIUS, color: ACCENT, fontSize: 12, lineHeight: 1.5 }}
                >
                  <AlertCircle aria-hidden="true" className="mt-[1px] h-4 w-4 shrink-0" />
                  <span>{pError}</span>
                </div>
              ) : null}

              <div className="mt-4">
                <Label htmlFor="project-name" style={{ ...labelStyle, display: "block", marginBottom: 6 }}>
                  Name <span style={{ color: ACCENT }}>(required)</span>
                </Label>
                <Input
                  data-wf="i-5-1-0"
                  id="project-name"
                  ref={firstFieldRef}
                  value={pForm.name}
                  onChange={(e) => {
                    setPForm({ ...pForm, name: e.target.value });
                    if (pError) setPError("");
                  }}
                  aria-invalid={pError ? "true" : "false"}
                  className="obs-focus h-10 w-full px-3 text-[14px]"
                  style={{ ...fieldStyle, borderColor: pError ? ACCENT : INK }}
                />
              </div>

              <div className="mt-4">
                <Label htmlFor="project-desc" style={{ ...labelStyle, display: "block", marginBottom: 6 }}>
                  Description
                </Label>
                <Textarea
                  data-wf="i-5-1-1"
                  id="project-desc"
                  rows={4}
                  value={pForm.description}
                  onChange={(e) => setPForm({ ...pForm, description: e.target.value })}
                  className="obs-focus w-full px-3 py-2 text-[14px]"
                  style={fieldStyle}
                />
                <p className="mt-1" style={{ fontSize: 11, color: MUTED }}>
                  Shown on the projects overview and at the top of this workspace.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3" style={{ borderTop: `2px solid ${INK}`, paddingTop: 16 }}>
                <Button
                  type="button"
                  onClick={closeModal}
                  className="obs-focus h-10 px-4 text-[12px] uppercase"
                  style={{ ...ghostBtn, border: `2px solid ${hexToRgba(INK, 0.3)}`, color: MUTED }}
                >
                  Discard
                </Button>
                <Button
                  data-wf="i-5-1-2"
                  type="submit"
                  disabled={pSaving}
                  className="obs-focus h-10 px-5 text-[12px] uppercase"
                  style={{ ...primaryBtn, opacity: pSaving ? 0.6 : 1, cursor: pSaving ? "wait" : "pointer" }}
                >
                  {pSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
