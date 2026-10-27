// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.

import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import { queryClient } from "@/lib/queryClient";
import { getSelectedTaskId } from "@/lib/selectedTask";
import { getUser } from "@/lib/api";
import { useTask, useUpdateTask } from "@/lib/projects";

const { Button, Input, Textarea, Label, Select, Empty } = UI;

const { ArrowLeft, AlertCircle, CheckCircle, Clock } = Icons;

const STATUSES = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso) {
  if (!iso) return "—";
  const p = iso.split("T")[0].split("-");
  if (p.length !== 3) return iso;
  return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
}

function statusLabel(key) {
  const s = STATUSES.find((x) => x.key === key);
  return s ? s.label : key;
}

function ScreenInner() {
  const navigate = useNavigate();
  const ink = brand.primaryColor;
  const accent = brand.accentColor;
  const neutral = brand.neutralColor;
  const bg = brand.backgroundColor;
  const radius = brand.radius;

  const [taskId] = React.useState(() => getSelectedTaskId());
  const taskQuery = useTask(taskId);
  const detail = taskQuery.data || null;
  const task = detail ? detail.task : null;

  const updateTaskMut = useUpdateTask(task ? task.project_id : null);
  const currentUser = React.useMemo(() => getUser(), []);

  const ownerOptions = React.useMemo(() => {
    const options = new Map();
    if (currentUser && currentUser.id !== undefined && currentUser.id !== null) {
      const id = String(currentUser.id);
      options.set(id, currentUser.name || currentUser.email || id);
    }
    if (task && task.owner_id !== undefined && task.owner_id !== null && task.owner_id !== "") {
      const id = String(task.owner_id);
      if (!options.has(id)) options.set(id, id);
    }
    return Array.from(options, ([id, name]) => ({ id, name }));
  }, [task, currentUser]);

  const emptyForm = { title: "", description: "", owner_id: "", due_date: "", status: "todo" };
  const [form, setForm] = React.useState(emptyForm);
  const [titleError, setTitleError] = React.useState("");
  const [saveError, setSaveError] = React.useState("");

  // Seed the editable form once the task has loaded, and whenever a fresh
  // server copy lands after a successful PATCH (list/board/detail stay in
  // sync via the shared react-query cache, NFR-007).
  React.useEffect(() => {
    if (!task) return;
    setForm({
      title: task.title || "",
      description: task.description || "",
      owner_id: task.owner_id || "",
      due_date: task.due_date || "",
      status: task.status || "todo",
    });
  }, [task]);

  const dirty =
    !!task &&
    (form.title !== (task.title || "") ||
      form.description !== (task.description || "") ||
      form.owner_id !== (task.owner_id || "") ||
      form.due_date !== (task.due_date || "") ||
      form.status !== (task.status || "todo"));

  const setField = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "title" && v.trim()) setTitleError("");
    setSaveError("");
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError("A task needs a title. Give it one before saving — nothing else was lost.");
      return;
    }
    setTitleError("");
    setSaveError("");
    try {
      await updateTaskMut.mutateAsync({
        id: task.id,
        title: form.title.trim(),
        description: form.description,
        owner_id: form.owner_id || null,
        due_date: form.due_date || null,
        status: form.status,
      });
    } catch {
      setSaveError("We couldn't save those changes. Try again.");
    }
  };

  const revert = () => {
    if (!task) return;
    setForm({
      title: task.title || "",
      description: task.description || "",
      owner_id: task.owner_id || "",
      due_date: task.due_date || "",
      status: task.status || "todo",
    });
    setSaveError("");
    setTitleError("");
  };

  const saving = updateTaskMut.isPending;
  const fieldStyle = { border: "2px solid " + ink, borderRadius: radius, backgroundColor: bg, color: ink };
  const labelCls = "block text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5";

  if (!taskId) {
    return (
      <div className="w-full p-10">
        <Empty title="No task selected" description="Open a task from a project to see its detail." />
      </div>
    );
  }

  if (taskQuery.isLoading) {
    return (
      <div className="w-full p-10" role="status" aria-live="polite">
        Loading task…
      </div>
    );
  }

  if (taskQuery.isError || !task) {
    return (
      <div className="w-full p-10">
        <Empty title="Couldn't load this task" description="Check your connection and try again." />
      </div>
    );
  }

  return (
    <div
      className="min-h-full px-6 py-8 sm:px-10"
      style={{ backgroundColor: bg, color: ink, fontFamily: brand.fontBody }}
    >
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="grid grid-cols-12 gap-x-6 gap-y-4 items-start">
          <div className="col-span-12 md:col-span-4">
            <button
              type="button"
              onClick={() => navigate("project")}
              className="inline-flex items-center gap-2 px-2 py-2 -ml-2 text-[12px] font-bold uppercase tracking-[0.14em]"
              style={{ color: ink, borderRadius: radius }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to project
            </button>
          </div>

          <div className="col-span-12 md:col-span-8">
            <h1 className="text-[32px] leading-[1.1] font-bold tracking-[-0.025em]" style={{ color: ink }}>
              {task.title || "Untitled task"}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] uppercase tracking-[0.14em]">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-1 font-bold"
                style={{ border: "2px solid " + ink, color: ink, borderRadius: radius }}
              >
                {statusLabel(task.status)}
              </span>
              <span className="tabular-nums" style={{ color: neutral }}>
                Due {fmtDate(task.due_date)}
              </span>
              <span style={{ color: neutral }}>
                Owner {task.owner_id ? (ownerOptions.find((o) => o.id === String(task.owner_id)) || {}).name || task.owner_id : "Unassigned"}
              </span>
            </div>
          </div>
        </div>

        <form className="mt-10" onSubmit={onSave} noValidate>
          <div
            className="flex flex-wrap items-end justify-between gap-3 pb-2 mb-4"
            style={{ borderBottom: "2px solid " + ink }}
          >
            <h2 className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: ink }}>
              Task details
            </h2>
            <span aria-live="polite" className="inline-flex items-center gap-1.5 text-[11px]">
              {saving ? (
                <span className="inline-flex items-center gap-1.5" style={{ color: ink }}>
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Saving changes…
                </span>
              ) : dirty ? (
                <span className="inline-flex items-center gap-1.5" style={{ color: accent }}>
                  Unsaved edits
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5" style={{ color: neutral }}>
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> All changes saved
                </span>
              )}
            </span>
          </div>

          {saveError ? (
            <div
              className="mb-5 flex items-start gap-2.5 p-3 text-[13px] leading-[1.5]"
              style={{ border: "2px solid " + accent, borderRadius: radius, color: ink }}
              role="alert"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
              <span>{saveError}</span>
            </div>
          ) : null}

          <div className="space-y-5">
            <div>
              <Label htmlFor="task-title" className={labelCls} style={{ color: ink }}>
                Title
              </Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                aria-invalid={titleError ? "true" : "false"}
                aria-describedby={titleError ? "task-title-error" : undefined}
                className="w-full px-3 py-2 text-[14px]"
                style={{ ...fieldStyle, ...(titleError ? { borderColor: accent } : null) }}
              />
              {titleError ? (
                <p
                  id="task-title-error"
                  className="mt-1.5 flex items-center gap-1.5 text-[12px]"
                  style={{ color: accent }}
                >
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {titleError}
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="task-description" className={labelCls} style={{ color: ink }}>
                Description
              </Label>
              <Textarea
                id="task-description"
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="w-full px-3 py-2 text-[14px] leading-[1.55]"
                style={fieldStyle}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <Label htmlFor="task-owner" className={labelCls} style={{ color: ink }}>
                  Owner
                </Label>
                <Select
                  id="task-owner"
                  value={form.owner_id}
                  onChange={(e) => setField("owner_id", e.target.value)}
                  className="w-full px-3 py-2 text-[14px]"
                  style={fieldStyle}
                >
                  <option value="">Unassigned</option>
                  {ownerOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="task-due" className={labelCls} style={{ color: ink }}>
                  Due date
                </Label>
                <Input
                  id="task-due"
                  type="date"
                  value={form.due_date || ""}
                  onChange={(e) => setField("due_date", e.target.value)}
                  className="w-full px-3 py-2 text-[14px] tabular-nums"
                  style={fieldStyle}
                />
              </div>

              <div>
                <Label htmlFor="task-status" className={labelCls} style={{ color: ink }}>
                  Status
                </Label>
                <Select
                  id="task-status"
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="w-full px-3 py-2 text-[14px]"
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
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "2px solid " + ink }}>
            <Button
              type="submit"
              disabled={saving || !dirty}
              className="px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] disabled:opacity-40"
              style={{ backgroundColor: ink, color: bg, borderRadius: radius, border: "2px solid " + ink }}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              onClick={revert}
              disabled={!dirty || saving}
              className="px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] disabled:opacity-40"
              style={{ backgroundColor: bg, color: ink, border: "2px solid " + ink, borderRadius: radius }}
            >
              Discard edits
            </Button>
            <span className="text-[11px]" style={{ color: neutral }}>
              Every member can edit this task.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Screen() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScreenInner />
    </QueryClientProvider>
  );
}
