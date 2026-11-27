// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.

import React from "react";
import { QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import { queryClient } from "@/lib/queryClient";
import { apiFetch, getUser } from "@/lib/api";
import { getSelectedTaskId } from "@/lib/selectedTask";

const { Button, Input, Textarea, Label, Select } = UI;

const { Plus, Clock, ArrowLeft, AlertCircle, CheckCircle } = Icons;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_OPTIONS = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "in_review", label: "In review" },
  { value: "done", label: "Done" },
];

const DEFAULT_FORM = {
  title: "Untitled task",
  description: "",
  owner_id: "",
  due_date: "",
  status: "todo",
};

function fmtDate(iso) {
  if (!iso) return "—";
  const p = String(iso).split("-");
  if (p.length !== 3) return iso;
  return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
}

function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return (
    d.getDate() +
    " " +
    MONTHS[d.getMonth()] +
    " " +
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0")
  );
}

function clockNow() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function stampNow() {
  const d = new Date();
  return d.getDate() + " " + MONTHS[d.getMonth()] + " " + clockNow();
}

// ---- data hooks (follow docs/sdlc/architecture/api/openapi.yaml) ----------

function useTaskDetail(taskId) {
  return useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => apiFetch(`/tasks/${taskId}`),
    enabled: Boolean(taskId),
  });
}

function useTaskComments(taskId) {
  return useQuery({
    queryKey: ["tasks", taskId, "comments"],
    queryFn: () => apiFetch(`/tasks/${taskId}/comments`),
    enabled: Boolean(taskId),
  });
}

function useLabelsCatalog(taskId) {
  return useQuery({
    queryKey: ["labels"],
    queryFn: () => apiFetch("/labels"),
    enabled: Boolean(taskId),
  });
}

function useUpdateTaskDetail(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      apiFetch(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
  });
}

function usePostComment(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      apiFetch(`/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", taskId, "comments"] });
    },
  });
}

function useAddChecklistItem(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title) =>
      apiFetch(`/tasks/${taskId}/checklist`, {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
  });
}

function useToggleChecklistItem(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_complete }) =>
      apiFetch(`/checklist/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_complete }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
  });
}

function useAddLabel(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labelId) =>
      apiFetch(`/tasks/${taskId}/labels`, {
        method: "POST",
        body: JSON.stringify({ label_id: labelId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
  });
}

function useRemoveLabel(taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labelId) => apiFetch(`/tasks/${taskId}/labels/${labelId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
  });
}

function asArray(value, key) {
  if (Array.isArray(value)) return value;
  if (value && key && Array.isArray(value[key])) return value[key];
  return [];
}

function ScreenInner() {
  const navigate = useNavigate();
  const ink = brand.primaryColor;
  const neutral = brand.neutralColor;
  const bg = brand.backgroundColor;
  const radius = brand.radius;

  const [taskId] = React.useState(() => getSelectedTaskId());
  const sessionUser = getUser();

  const taskQuery = useTaskDetail(taskId);
  const commentsQuery = useTaskComments(taskId);
  const labelsCatalogQuery = useLabelsCatalog(taskId);

  const updateTaskMut = useUpdateTaskDetail(taskId);
  const postCommentMut = usePostComment(taskId);
  const addChecklistMut = useAddChecklistItem(taskId);
  const toggleChecklistMut = useToggleChecklistItem(taskId);
  const addLabelMut = useAddLabel(taskId);
  const removeLabelMut = useRemoveLabel(taskId);

  const loadedTask = taskQuery.data && taskQuery.data.task ? taskQuery.data.task : null;
  const checklist = taskQuery.data ? asArray(taskQuery.data.checklist) : [];
  const appliedLabels = taskQuery.data ? asArray(taskQuery.data.labels) : [];
  const comments = asArray(commentsQuery.data, "comments");
  const labelCatalog = asArray(labelsCatalogQuery.data, "labels");

  const [form, setForm] = React.useState(DEFAULT_FORM);
  const [saved, setSaved] = React.useState(DEFAULT_FORM);
  const [savedAt, setSavedAt] = React.useState("");
  const [saveState, setSaveState] = React.useState("idle"); // idle | saving | saved | error
  const [saveError, setSaveError] = React.useState("");
  const [titleError, setTitleError] = React.useState("");

  React.useEffect(() => {
    if (!loadedTask) return;
    const next = {
      title: loadedTask.title || "",
      description: loadedTask.description || "",
      owner_id: loadedTask.owner_id || "",
      due_date: loadedTask.due_date || "",
      status: loadedTask.status || "todo",
    };
    setForm(next);
    setSaved(next);
    setSavedAt(fmtDateTime(loadedTask.updated_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedTask && loadedTask.id, loadedTask && loadedTask.updated_at]);

  const [draft, setDraft] = React.useState("");
  const [commentError, setCommentError] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  const [newItem, setNewItem] = React.useState("");
  const [itemError, setItemError] = React.useState("");

  const [selectedLabelId, setSelectedLabelId] = React.useState("");

  const dirty =
    form.title !== saved.title ||
    form.description !== saved.description ||
    form.owner_id !== saved.owner_id ||
    form.due_date !== saved.due_date ||
    form.status !== saved.status;

  const setField = (k, v) => {
    setForm((f) => Object.assign({}, f, { [k]: v }));
    if (saveState === "saved" || saveState === "error") setSaveState("idle");
    if (k === "title" && v.trim()) setTitleError("");
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError("A task needs a title. Give it one before saving — nothing else was lost.");
      setSaveState("idle");
      return;
    }
    if (!taskId) return;
    setTitleError("");
    setSaveError("");
    setSaveState("saving");
    try {
      await updateTaskMut.mutateAsync({
        title: form.title,
        description: form.description,
        owner_id: form.owner_id || null,
        due_date: form.due_date || null,
        status: form.status,
      });
      setSaved(form);
      setSavedAt(stampNow());
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setSaveError("We couldn't save those changes. Try again — your edits are still here.");
    }
  };

  const revert = () => {
    setForm(saved);
    setSaveState("idle");
    setSaveError("");
    setTitleError("");
  };

  const toggleItem = (item) => {
    if (!taskId) return;
    toggleChecklistMut.mutate({ id: item.id, is_complete: !item.is_complete });
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) {
      setItemError("Give the step a short title, like “Flag pages to retire”.");
      return;
    }
    if (!taskId) return;
    setItemError("");
    try {
      await addChecklistMut.mutateAsync(newItem.trim());
      setNewItem("");
    } catch {
      setItemError("We couldn't add that item. Try again.");
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!draft.trim()) {
      setCommentError("There's nothing to post yet. Enter some text first.");
      return;
    }
    if (!taskId) return;
    setCommentError("");
    setPosting(true);
    try {
      await postCommentMut.mutateAsync(draft.trim());
      setDraft("");
    } catch {
      setCommentError("We couldn't post that comment. Try again.");
    } finally {
      setPosting(false);
    }
  };

  const onAddLabel = async (e) => {
    e.preventDefault();
    if (!selectedLabelId || !taskId) return;
    try {
      await addLabelMut.mutateAsync(selectedLabelId);
      setSelectedLabelId("");
    } catch {
      // surfaced via addLabelMut.isError if needed; nothing else to lose here
    }
  };

  const onRemoveLabel = async (labelId) => {
    if (!taskId) return;
    try {
      await removeLabelMut.mutateAsync(labelId);
    } catch {
      // keep the chip rather than silently dropping state on a failed request
    }
  };

  const authorLabel = (comment) => {
    if (sessionUser && comment && String(comment.author_id) === String(sessionUser.id)) {
      return sessionUser.name || sessionUser.email || "You";
    }
    return "Member";
  };

  const ownerOptions = [{ value: "", label: "Unassigned" }];
  if (sessionUser && sessionUser.id != null) {
    const id = String(sessionUser.id);
    ownerOptions.push({ value: id, label: sessionUser.name || sessionUser.email || "Me" });
  }
  if (form.owner_id && !ownerOptions.some((o) => o.value === form.owner_id)) {
    ownerOptions.push({ value: form.owner_id, label: form.owner_id });
  }

  const appliedLabelIds = appliedLabels.map((l) => l.id);
  const availableLabels = labelCatalog.filter((l) => appliedLabelIds.indexOf(l.id) === -1);

  const doneCount = checklist.filter((c) => c.is_complete).length;

  const fieldStyle = {
    border: "2px solid " + ink,
    borderRadius: radius,
    backgroundColor: bg,
    color: ink,
  };
  const labelCls = "block text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5";

  const css =
    ".pms-task :is(button,a,input,textarea,select,[tabindex]):focus-visible{outline:2px solid var(--pms-ink);outline-offset:2px;}" +
    ".pms-task .pms-hover:hover{background:rgba(17,17,17,0.04);}" +
    "@keyframes pmsPulse{0%,100%{opacity:1}50%{opacity:.35}}" +
    ".pms-task .pms-pulse{animation:pmsPulse 1.1s ease-in-out infinite;}" +
    "@media (prefers-reduced-motion: reduce){.pms-task .pms-pulse{animation:none!important;}}";

  const showLoading = Boolean(taskId) && taskQuery.isLoading;
  const showError = Boolean(taskId) && taskQuery.isError && !taskQuery.isLoading;

  if (showLoading) {
    return (
      <div
        className="pms-task min-h-full px-6 py-8 sm:px-10"
        style={{ backgroundColor: bg, color: ink, fontFamily: brand.fontBody }}
      >
        <style>{css}</style>
        <p className="flex items-center gap-2 text-[13px]" style={{ color: neutral }}>
          <Clock className="h-4 w-4 pms-pulse" aria-hidden="true" />
          Loading task…
        </p>
      </div>
    );
  }

  if (showError) {
    return (
      <div
        className="pms-task min-h-full px-6 py-8 sm:px-10"
        style={{ backgroundColor: bg, color: ink, fontFamily: brand.fontBody }}
      >
        <style>{css}</style>
        <p className="flex items-center gap-2 text-[13px]" role="alert" style={{ color: ink }}>
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          We couldn't load this task. Try reloading the page.
        </p>
      </div>
    );
  }

  return (
    <div
      className="pms-task min-h-full px-6 py-8 sm:px-10"
      style={{
        backgroundColor: bg,
        color: ink,
        fontFamily: brand.fontBody,
        "--pms-ink": ink,
      }}
    >
      <style>{css}</style>

      <div className="mx-auto w-full max-w-[1120px]">
        {/* ROW 1 */}
        <div className="grid grid-cols-12 gap-x-6 gap-y-4 items-start">
          <div className="col-span-12 md:col-span-4">
            <button
              type="button"
              onClick={() => navigate("project")}
              className="inline-flex items-center gap-2 px-2 py-2 -ml-2 text-[12px] font-bold uppercase tracking-[0.14em] pms-hover"
              style={{ color: ink, borderRadius: radius }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to project
            </button>
            {loadedTask ? (
              <p className="mt-2 ml-0 text-[11px] tabular-nums" style={{ color: neutral }}>
                {loadedTask.id} · created {fmtDateTime(loadedTask.created_at)}
              </p>
            ) : null}
            {!taskId ? (
              <p role="status" className="mt-2 text-[12px]" style={{ color: neutral }}>
                No task selected. Open one from the project board to edit it here.
              </p>
            ) : null}
          </div>

          <div className="col-span-12 md:col-span-8">
            <h1
              className="text-[28px] leading-[1.1] font-bold tracking-[-0.025em]"
              style={{ color: ink }}
            >
              {saved.title || "Untitled task"}
            </h1>
          </div>
        </div>

        {/* ROW 2 — task details */}
        <div className="mt-10 grid grid-cols-12 gap-6 items-start">
          <form className="col-span-12 lg:col-span-8" onSubmit={onSave} noValidate>
            <div
              className="flex flex-wrap items-end justify-between gap-3 pb-2 mb-4"
              style={{ borderBottom: "2px solid " + ink }}
            >
              <h2
                className="text-[12px] font-bold uppercase tracking-[0.18em]"
                style={{ color: ink }}
              >
                Task details
              </h2>
              <span aria-live="polite" className="inline-flex items-center gap-1.5 text-[11px]">
                {saveState === "saving" ? (
                  <span
                    className="pms-pulse inline-flex items-center gap-1.5"
                    style={{ color: ink }}
                  >
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Saving…
                  </span>
                ) : saveState === "error" ? (
                  <span
                    className="inline-flex items-center gap-1.5 font-bold"
                    style={{ color: ink }}
                  >
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> Not saved
                  </span>
                ) : dirty ? (
                  <span className="inline-flex items-center gap-1.5" style={{ color: ink }}>
                    <span
                      className="inline-block h-2 w-2"
                      style={{ backgroundColor: ink }}
                      aria-hidden="true"
                    />
                    Unsaved edits
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 tabular-nums"
                    style={{ color: neutral }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    All changes saved{savedAt ? " · " + savedAt : ""}
                  </span>
                )}
              </span>
            </div>

            {saveState === "error" ? (
              <div
                className="mb-5 flex items-start gap-2.5 p-3 text-[13px] leading-[1.5]"
                style={{ border: "2px solid " + ink, borderRadius: radius, color: ink }}
                role="alert"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
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
                  style={fieldStyle}
                />
                {titleError ? (
                  <p
                    id="task-title-error"
                    className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold"
                    style={{ color: ink }}
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
                    {ownerOptions.map((o) => (
                      <option key={o.value || "unassigned"} value={o.value}>
                        {o.label}
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
                    value={form.due_date}
                    onChange={(e) => setField("due_date", e.target.value)}
                    className="w-full px-3 py-2 text-[14px] tabular-nums"
                    style={fieldStyle}
                  />
                  <p className="mt-1.5 text-[11px] tabular-nums" style={{ color: neutral }}>
                    {form.due_date ? fmtDate(form.due_date) : "No due date set"}
                  </p>
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
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <div
              className="mt-6 flex flex-wrap items-center gap-3 pt-4"
              style={{ borderTop: "2px solid " + ink }}
            >
              <Button
                type="submit"
                disabled={saveState === "saving" || !dirty}
                className="px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] disabled:opacity-40"
                style={{
                  backgroundColor: ink,
                  color: bg,
                  borderRadius: radius,
                  border: "2px solid " + ink,
                }}
              >
                {saveState === "saving" ? "Saving…" : "Save changes"}
              </Button>
              <Button
                type="button"
                onClick={revert}
                disabled={!dirty || saveState === "saving"}
                className="px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] disabled:opacity-40 pms-hover"
                style={{
                  backgroundColor: bg,
                  color: ink,
                  border: "2px solid " + ink,
                  borderRadius: radius,
                }}
              >
                Discard edits
              </Button>
            </div>
          </form>

          {/* LABELS */}
          <section className="col-span-12 lg:col-span-4">
            <div
              className="flex flex-wrap items-end justify-between gap-3 pb-2 mb-4"
              style={{ borderBottom: "2px solid " + ink }}
            >
              <h2
                className="text-[12px] font-bold uppercase tracking-[0.18em]"
                style={{ color: ink }}
              >
                Labels
              </h2>
            </div>

            {appliedLabels.length === 0 ? (
              <p className="mb-4 text-[13px] leading-[1.5]" style={{ color: neutral }}>
                No labels yet.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2 mb-4">
                {appliedLabels.map((l) => (
                  <li
                    key={l.id}
                    className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1"
                    style={{ border: "2px solid " + ink, borderRadius: radius }}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
                      {l.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveLabel(l.id)}
                      aria-label={"Remove label " + l.name}
                      className="inline-flex h-6 w-6 items-center justify-center pms-hover"
                      style={{ borderRadius: radius, color: neutral }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={onAddLabel} className="flex flex-wrap items-end gap-2" noValidate>
              <div className="flex-1 min-w-[140px]">
                <Label htmlFor="add-label-select" className={labelCls} style={{ color: ink }}>
                  Add label
                </Label>
                <Select
                  id="add-label-select"
                  value={selectedLabelId}
                  onChange={(e) => setSelectedLabelId(e.target.value)}
                  className="w-full px-3 py-2 text-[14px]"
                  style={fieldStyle}
                >
                  <option value="">Choose a label…</option>
                  {availableLabels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] pms-hover"
                style={{
                  border: "2px solid " + ink,
                  borderRadius: radius,
                  backgroundColor: bg,
                  color: ink,
                }}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </form>
          </section>
        </div>

        {/* ROW 3 — CHECKLIST */}
        <section className="mt-12">
          <div
            className="flex flex-wrap items-end justify-between gap-3 pb-2 mb-4"
            style={{ borderBottom: "2px solid " + ink }}
          >
            <h2
              className="text-[12px] font-bold uppercase tracking-[0.18em]"
              style={{ color: ink }}
            >
              Checklist
            </h2>
          </div>

          {checklist.length === 0 ? (
            <p className="mb-4 text-[13px] leading-[1.5]" style={{ color: neutral }}>
              No steps on this task yet.
            </p>
          ) : (
            <React.Fragment>
              <p className="mb-3 text-[12px] tabular-nums" style={{ color: neutral }}>
                {doneCount + " of " + checklist.length + " done"}
              </p>
              <ul>
                {checklist.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderBottom: "1px solid rgba(17,17,17,0.14)" }}
                  >
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(c.is_complete)}
                        onChange={() => toggleItem(c)}
                        className="h-4 w-4"
                        style={{ accentColor: ink }}
                      />
                      <span
                        className="text-[14px] leading-[1.5]"
                        style={{
                          color: c.is_complete ? neutral : ink,
                          textDecoration: c.is_complete ? "line-through" : "none",
                        }}
                      >
                        {c.title}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </React.Fragment>
          )}
        </section>

        {/* ROW 4 — ADD CHECKLIST ITEM */}
        <form
          onSubmit={addItem}
          className="mt-5 grid grid-cols-12 gap-x-4 gap-y-2 items-end"
          noValidate
        >
          <div className="col-span-12 sm:col-span-9">
            <Label htmlFor="new-checklist-item" className={labelCls} style={{ color: ink }}>
              New item
            </Label>
            <Input
              id="new-checklist-item"
              value={newItem}
              placeholder="e.g. Draft the redirect map"
              onChange={(e) => {
                setNewItem(e.target.value);
                if (e.target.value.trim()) setItemError("");
              }}
              aria-invalid={itemError ? "true" : "false"}
              aria-describedby={itemError ? "new-item-error" : undefined}
              className="w-full px-3 py-2 text-[14px]"
              style={fieldStyle}
            />
          </div>
          <div className="col-span-12 sm:col-span-3">
            <Button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] pms-hover"
              style={{
                border: "2px solid " + ink,
                borderRadius: radius,
                backgroundColor: bg,
                color: ink,
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add item
            </Button>
          </div>
          {itemError ? (
            <p
              id="new-item-error"
              className="col-span-12 flex items-center gap-1.5 text-[12px] font-bold"
              style={{ color: ink }}
            >
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {itemError}
            </p>
          ) : null}
        </form>

        {/* ROW 5 — COMMENTS */}
        <section className="mt-12">
          <div
            className="flex flex-wrap items-end justify-between gap-3 pb-2 mb-4"
            style={{ borderBottom: "2px solid " + ink }}
          >
            <h2
              className="text-[12px] font-bold uppercase tracking-[0.18em]"
              style={{ color: ink }}
            >
              {"Comments (" + comments.length + ")"}
            </h2>
          </div>

          {comments.length === 0 ? (
            <p className="mb-4 text-[13px] leading-[1.5]" style={{ color: neutral }}>
              No one has commented yet.
            </p>
          ) : (
            <ul>
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="flex gap-3 py-4"
                  style={{ borderBottom: "1px solid rgba(17,17,17,0.14)" }}
                >
                  <div className="min-w-0">
                    <p className="text-[12px]">
                      <span className="font-bold" style={{ color: ink }}>
                        {authorLabel(c)}
                      </span>
                      <span className="mx-1.5" style={{ color: neutral }} aria-hidden="true">
                        ·
                      </span>
                      <span className="tabular-nums" style={{ color: neutral }}>
                        {fmtDateTime(c.created_at)}
                      </span>
                    </p>
                    <p
                      className="mt-1 text-[14px] leading-[1.55] max-w-[68ch]"
                      style={{ color: ink }}
                    >
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ROW 6 — WRITE A COMMENT */}
        <form
          onSubmit={postComment}
          className="mt-5 mb-4 grid grid-cols-12 gap-x-4 gap-y-2 items-end"
          noValidate
        >
          <div className="col-span-12 sm:col-span-9">
            <Label htmlFor="new-comment" className={labelCls} style={{ color: ink }}>
              Add a comment
            </Label>
            <Textarea
              id="new-comment"
              rows={3}
              value={draft}
              placeholder="Add context for the team…"
              onChange={(e) => {
                setDraft(e.target.value);
                if (e.target.value.trim()) setCommentError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment(e);
              }}
              aria-invalid={commentError ? "true" : "false"}
              aria-describedby={commentError ? "new-comment-error" : undefined}
              className="w-full px-3 py-2 text-[14px] leading-[1.55]"
              style={fieldStyle}
            />
            {commentError ? (
              <p
                id="new-comment-error"
                className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold"
                style={{ color: ink }}
              >
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {commentError}
              </p>
            ) : null}
          </div>
          <div className="col-span-12 sm:col-span-3">
            <Button
              type="submit"
              disabled={posting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] disabled:opacity-50"
              style={{
                backgroundColor: ink,
                color: bg,
                border: "2px solid " + ink,
                borderRadius: radius,
              }}
            >
              {posting ? "Posting…" : "Post comment"}
            </Button>
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
