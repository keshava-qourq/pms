// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Button, Input, Textarea, Label, Select, Avatar, Empty } = UI;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Plus, Check, X, Clock, ArrowLeft, ArrowRight, AlertCircle, CheckCircle } = Icons;

const TODAY = '2026-10-26';
const PROJECT_START = '2026-09-01';

const CURRENT_USER = { id: 'u-2', name: 'Tom Ek' };

const TEAM = [
  { id: 'u-1', name: 'Priya Nandakumar', email: 'priya.nandakumar@northfield.co' },
  { id: 'u-2', name: 'Tom Ek', email: 'tom.ek@northfield.co' },
  { id: 'u-3', name: 'Mia Oduya', email: 'mia.oduya@northfield.co' },
  { id: 'u-4', name: 'Daniel Rössler', email: 'daniel.rossler@northfield.co' },
  { id: 'u-5', name: 'Aisha Kone', email: 'aisha.kone@northfield.co' },
  { id: 'u-6', name: 'Henrik Vold', email: 'henrik.vold@northfield.co' }
];

const STATUSES = ['Backlog', 'In progress', 'Blocked', 'In review', 'Done'];

const ALL_LABELS = [
  { id: 'l-1', name: 'Research' },
  { id: 'l-2', name: 'Design' },
  { id: 'l-3', name: 'Content' },
  { id: 'l-4', name: 'SEO' },
  { id: 'l-5', name: 'Engineering' },
  { id: 'l-6', name: 'Accessibility' }
];

const INITIAL_TASK = {
  id: 'TSK-418',
  project: 'Website Redesign',
  title: 'Audit current sitemap',
  description: 'Map every live URL and flag pages to retire.',
  owner_id: 'u-1',
  due_date: '2026-11-03',
  status: 'In progress',
  created_at: '18 Oct 2026',
  updated_at: '26 Oct 08:05'
};

const INITIAL_LABELS = ['l-1', 'l-2'];

const INITIAL_CHECKLIST = [
  { id: 'c-1', title: 'Export current URL map', is_complete: true, position: 1 },
  { id: 'c-2', title: 'Interview content owners', is_complete: true, position: 2 },
  { id: 'c-3', title: 'Flag pages to retire', is_complete: false, position: 3 },
  { id: 'c-4', title: 'Share findings with the team', is_complete: false, position: 4 }
];

const INITIAL_COMMENTS = [
  { id: 'm-1', author: 'Priya Nandakumar', at: '24 Oct 09:12', body: 'Sitemap export is in the shared drive.' },
  { id: 'm-2', author: 'Tom Ek', at: '25 Oct 14:40', body: "About 40 pages look retireable, I'll confirm." },
  { id: 'm-3', author: 'Mia Oduya', at: '26 Oct 08:05', body: "Let's review together on Thursday." }
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(iso) {
  if (!iso) return '—';
  const p = iso.split('-');
  if (p.length !== 3) return iso;
  return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
}

function clockNow() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function stampNow() {
  const d = new Date();
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + clockNow();
}

export default function Screen() {
  const navigate = useNavigate();
  const ink = brand.primaryColor;
  const accent = brand.accentColor;
  const neutral = brand.neutralColor;
  const bg = brand.backgroundColor;
  const radius = brand.radius;

  const timers = React.useRef([]);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  const [form, setForm] = React.useState({
    title: INITIAL_TASK.title,
    description: INITIAL_TASK.description,
    owner_id: INITIAL_TASK.owner_id,
    due_date: INITIAL_TASK.due_date,
    status: INITIAL_TASK.status
  });
  const [saved, setSaved] = React.useState(form);
  const [saveState, setSaveState] = React.useState('idle'); // idle | saving | saved | error
  const [saveError, setSaveError] = React.useState('');
  const [titleError, setTitleError] = React.useState('');
  const [savedAt, setSavedAt] = React.useState(INITIAL_TASK.updated_at);

  const [labelIds, setLabelIds] = React.useState(INITIAL_LABELS);
  const [labelOpen, setLabelOpen] = React.useState(false);

  const [checklist, setChecklist] = React.useState(INITIAL_CHECKLIST);
  const [newItem, setNewItem] = React.useState('');
  const [itemError, setItemError] = React.useState('');
  const [justAdded, setJustAdded] = React.useState(null);

  const [comments, setComments] = React.useState(INITIAL_COMMENTS);
  const [draft, setDraft] = React.useState('');
  const [commentError, setCommentError] = React.useState('');
  const [posting, setPosting] = React.useState(false);

  const addLabelBtn = React.useRef(null);
  const firstLabelOpt = React.useRef(null);
  const itemInput = React.useRef(null);

  React.useEffect(() => {
    if (labelOpen && firstLabelOpt.current) firstLabelOpt.current.focus();
  }, [labelOpen]);

  const dirty =
    form.title !== saved.title ||
    form.description !== saved.description ||
    form.owner_id !== saved.owner_id ||
    form.due_date !== saved.due_date ||
    form.status !== saved.status;

  const owner = TEAM.find((t) => t.id === form.owner_id);
  const applied = labelIds.map((id) => ALL_LABELS.find((l) => l.id === id)).filter(Boolean);
  const available = ALL_LABELS.filter((l) => labelIds.indexOf(l.id) === -1);
  const doneCount = checklist.filter((c) => c.is_complete).length;
  const overdue = form.due_date && form.due_date < TODAY && form.status !== 'Done';
  const blocked = form.status === 'Blocked';

  const setField = (k, v) => {
    setForm((f) => Object.assign({}, f, { [k]: v }));
    if (saveState === 'saved' || saveState === 'error') setSaveState('idle');
    if (k === 'title' && v.trim()) setTitleError('');
    if (k === 'due_date') setSaveError('');
  };

  const onSave = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError('A task needs a title. Give it one before saving — nothing else was lost.');
      setSaveState('idle');
      return;
    }
    if (form.due_date && form.due_date < PROJECT_START) {
      setSaveState('error');
      setSaveError(
        'That due date falls before Website Redesign started on ' +
          fmtDate(PROJECT_START) +
          '. Nothing was saved and your edits are still here — pick a later date.'
      );
      return;
    }
    setSaveError('');
    setTitleError('');
    setSaveState('saving');
    later(() => {
      setSaved(form);
      setSavedAt(stampNow());
      setSaveState('saved');
    }, 700);
  };

  const revert = () => {
    setForm(saved);
    setSaveState('idle');
    setSaveError('');
    setTitleError('');
  };

  const toggleItem = (id) => {
    setChecklist((list) => list.map((c) => (c.id === id ? Object.assign({}, c, { is_complete: !c.is_complete }) : c)));
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!newItem.trim()) {
      setItemError("Give the step a short title, like “Flag pages to retire”.");
      return;
    }
    const id = 'c-' + (checklist.length + 1) + '-' + Date.now();
    setChecklist((list) => list.concat([{ id: id, title: newItem.trim(), is_complete: false, position: list.length + 1 }]));
    setNewItem('');
    setItemError('');
    setJustAdded(id);
    later(() => setJustAdded(null), 700);
    if (itemInput.current) itemInput.current.focus();
  };

  const postComment = (e) => {
    e.preventDefault();
    if (!draft.trim()) {
      setCommentError("There's nothing to post yet. Write a line first.");
      return;
    }
    setCommentError('');
    setPosting(true);
    const body = draft.trim();
    later(() => {
      setComments((cs) => cs.concat([{ id: 'm-' + Date.now(), author: CURRENT_USER.name, at: stampNow(), body: body, fresh: true }]));
      setDraft('');
      setPosting(false);
    }, 600);
  };

  const removeLabel = (id) => setLabelIds((ids) => ids.filter((x) => x !== id));
  const addLabel = (id) => {
    setLabelIds((ids) => ids.concat([id]));
    setLabelOpen(false);
    if (addLabelBtn.current) addLabelBtn.current.focus();
  };

  const css =
    '.pms-task :is(button,a,input,textarea,select,[tabindex]):focus-visible{outline:2px solid var(--pms-accent);outline-offset:2px;}' +
    '.pms-task input::placeholder,.pms-task textarea::placeholder{color:var(--pms-neutral);opacity:.75;}' +
    '.pms-task .pms-row{animation:pmsIn .28s ease-out both;}' +
    '.pms-task .pms-hover:hover{background:var(--pms-wash);}' +
    '@keyframes pmsIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}' +
    '@keyframes pmsPulse{0%,100%{opacity:1}50%{opacity:.35}}' +
    '.pms-task .pms-pulse{animation:pmsPulse 1.1s ease-in-out infinite;}' +
    '@media (prefers-reduced-motion: reduce){.pms-task .pms-row,.pms-task .pms-pulse{animation:none!important;}}';

  const fieldStyle = { border: '2px solid ' + ink, borderRadius: radius, backgroundColor: bg, color: ink };
  const labelCls = 'block text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5';

  const SectionHead = (props) => (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-2 mb-4" style={{ borderBottom: '2px solid ' + ink }}>
      <h2 className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: ink }}>
        <span className="mr-2 tabular-nums" style={{ color: neutral }}>{props.index}</span>
        {props.title}
        {props.suffix ? <span className="font-normal tabular-nums" style={{ color: neutral }}>{' '}{props.suffix}</span> : null}
      </h2>
      {props.right ? <div className="text-[11px]" style={{ color: neutral }}>{props.right}</div> : null}
    </div>
  );

  return (
    <div
      className="pms-task min-h-full px-6 py-8 sm:px-10"
      style={{
        backgroundColor: bg,
        color: ink,
        fontFamily: brand.fontBody,
        '--pms-accent': accent,
        '--pms-neutral': neutral,
        '--pms-wash': 'rgba(17,17,17,0.04)'
      }}
    >
      <style>{css}</style>

      <div className="mx-auto w-full max-w-[1120px]">

        {/* ROW 1 */}
        <div className="grid grid-cols-12 gap-x-6 gap-y-4 items-start">
          <div className="col-span-12 md:col-span-4">
            <button
              type="button"
              data-wf="b-0-0"
              onClick={() => navigate('project')}
              className="inline-flex items-center gap-2 px-2 py-2 -ml-2 text-[12px] font-bold uppercase tracking-[0.14em] pms-hover"
              style={{ color: ink, borderRadius: radius }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Website Redesign
            </button>
            <p className="mt-2 ml-0 text-[11px] tabular-nums" style={{ color: neutral }}>
              {INITIAL_TASK.id} · created {INITIAL_TASK.created_at}
            </p>
          </div>

          <div className="col-span-12 md:col-span-8" data-wf="b-0-1">
            <h1 className="text-[32px] leading-[1.1] font-bold tracking-[-0.025em]" style={{ color: ink }}>
              {saved.title || 'Untitled task'}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] uppercase tracking-[0.14em]">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-1 font-bold"
                style={{
                  border: '2px solid ' + (blocked ? accent : ink),
                  color: blocked ? accent : ink,
                  borderRadius: radius
                }}
              >
                {blocked ? <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {saved.status}
              </span>
              <span className="tabular-nums" style={{ color: neutral }}>
                Due {fmtDate(saved.due_date)}
              </span>
              <span style={{ color: neutral }}>Owner {TEAM.find((t) => t.id === saved.owner_id).name}</span>
              <span className="tabular-nums" style={{ color: neutral }}>Updated {savedAt}</span>
            </div>
          </div>
        </div>

        {/* ROW 2 */}
        <div className="mt-10 grid grid-cols-12 gap-6 items-start">

          <form className="col-span-12 lg:col-span-8" data-wf="b-1-0" onSubmit={onSave} noValidate>
            <SectionHead
              index="01"
              title="Task details"
              right={
                <span aria-live="polite" className="inline-flex items-center gap-1.5">
                  {saveState === 'saving' ? (
                    <span className="pms-pulse inline-flex items-center gap-1.5" style={{ color: ink }}>
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Saving changes…
                    </span>
                  ) : saveState === 'error' ? (
                    <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: accent }}>
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> Not saved
                    </span>
                  ) : dirty ? (
                    <span className="inline-flex items-center gap-1.5" style={{ color: accent }}>
                      <span className="inline-block h-2 w-2" style={{ backgroundColor: accent }} aria-hidden="true" />
                      Unsaved edits
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 tabular-nums" style={{ color: neutral }}>
                      <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> All changes saved · {savedAt}
                    </span>
                  )}
                </span>
              }
            />

            {saveState === 'error' ? (
              <div
                className="pms-row mb-5 flex items-start gap-2.5 p-3 text-[13px] leading-[1.5]"
                style={{ border: '2px solid ' + accent, borderRadius: radius, color: ink }}
                role="alert"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
                <span>{saveError}</span>
              </div>
            ) : null}

            <div className="space-y-5">
              <div>
                <Label htmlFor="task-title" className={labelCls} style={{ color: ink }}>Title</Label>
                <Input
                  id="task-title"
                  data-wf="i-1-0-0"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  aria-invalid={titleError ? 'true' : 'false'}
                  aria-describedby={titleError ? 'task-title-error' : undefined}
                  className="w-full px-3 py-2 text-[14px]"
                  style={Object.assign({}, fieldStyle, titleError ? { borderColor: accent } : null)}
                />
                {titleError ? (
                  <p id="task-title-error" className="pms-row mt-1.5 flex items-center gap-1.5 text-[12px]" style={{ color: accent }}>
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {titleError}
                  </p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="task-description" className={labelCls} style={{ color: ink }}>Description</Label>
                <Textarea
                  id="task-description"
                  data-wf="i-1-0-1"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  className="w-full px-3 py-2 text-[14px] leading-[1.55]"
                  style={fieldStyle}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <Label htmlFor="task-owner" className={labelCls} style={{ color: ink }}>Owner</Label>
                  <Select
                    id="task-owner"
                    data-wf="i-1-0-2"
                    value={form.owner_id}
                    onChange={(e) => setField('owner_id', e.target.value)}
                    className="w-full px-3 py-2 text-[14px]"
                    style={fieldStyle}
                  >
                    {TEAM.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </Select>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: neutral }}>
                    <Avatar name={owner.name} className="h-4 w-4 text-[8px]" />
                    {owner.email}
                  </p>
                </div>

                <div>
                  <Label htmlFor="task-due" className={labelCls} style={{ color: ink }}>Due date</Label>
                  <Input
                    id="task-due"
                    data-wf="i-1-0-3"
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setField('due_date', e.target.value)}
                    className="w-full px-3 py-2 text-[14px] tabular-nums"
                    style={Object.assign({}, fieldStyle, overdue ? { borderColor: accent } : null)}
                  />
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] tabular-nums" style={{ color: overdue ? accent : neutral }}>
                    {overdue ? <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                    {overdue ? 'Overdue — was due ' + fmtDate(form.due_date) : fmtDate(form.due_date)}
                  </p>
                </div>

                <div>
                  <Label htmlFor="task-status" className={labelCls} style={{ color: ink }}>Status</Label>
                  <Select
                    id="task-status"
                    data-wf="i-1-0-4"
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value)}
                    className="w-full px-3 py-2 text-[14px]"
                    style={Object.assign({}, fieldStyle, blocked ? { borderColor: accent, color: accent } : null)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                  <p className="mt-1.5 text-[11px]" style={{ color: blocked ? accent : neutral }}>
                    {blocked ? 'Flagged on the board until it is unblocked.' : 'Shown on the board and the task list.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: '2px solid ' + ink }}>
              <Button
                type="submit"
                disabled={saveState === 'saving' || !dirty}
                className="px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] disabled:opacity-40"
                style={{ backgroundColor: ink, color: bg, borderRadius: radius, border: '2px solid ' + ink }}
              >
                {saveState === 'saving' ? 'Saving…' : 'Save changes'}
              </Button>
              <Button
                type="button"
                onClick={revert}
                disabled={!dirty || saveState === 'saving'}
                className="px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] disabled:opacity-40 pms-hover"
                style={{ backgroundColor: bg, color: ink, border: '2px solid ' + ink, borderRadius: radius }}
              >
                Discard edits
              </Button>
              <span className="text-[11px]" style={{ color: neutral }}>
                Every member can edit this task.
              </span>
            </div>
          </form>

          {/* LABELS */}
          <section className="col-span-12 lg:col-span-4" data-wf="b-1-1">
            <SectionHead index="02" title="Labels" right={<span className="tabular-nums">{applied.length} of {ALL_LABELS.length}</span>} />

            {applied.length === 0 ? (
              <p className="mb-4 text-[13px] leading-[1.5]" style={{ color: neutral }}>
                No labels yet. Labels group this task on the board and in the list.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2 mb-4">
                {applied.map((l, idx) => (
                  <li
                    key={l.id}
                    className="pms-row inline-flex items-center gap-1 pl-2.5 pr-1 py-1"
                    style={{ border: '2px solid ' + ink, borderRadius: radius }}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em]">{l.name}</span>
                    <button
                      type="button"
                      data-wf={idx < 2 ? 'i-1-1-' + idx : undefined}
                      onClick={() => removeLabel(l.id)}
                      aria-label={'Remove label ' + l.name}
                      className="inline-flex h-6 w-6 items-center justify-center pms-hover"
                      style={{ borderRadius: radius, color: neutral }}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              ref={addLabelBtn}
              data-wf="i-1-1-2"
              onClick={() => setLabelOpen((o) => !o)}
              aria-expanded={labelOpen}
              aria-controls="label-picker"
              className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-bold uppercase tracking-[0.14em] pms-hover"
              style={{ border: '2px solid ' + ink, borderRadius: radius, color: ink }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add label
            </button>

            {labelOpen ? (
              <div
                id="label-picker"
                className="pms-row mt-3 p-3"
                style={{ border: '2px solid ' + ink, borderRadius: radius }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setLabelOpen(false);
                    if (addLabelBtn.current) addLabelBtn.current.focus();
                  }
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: neutral }}>
                  Workspace labels
                </p>
                {available.length === 0 ? (
                  <p className="text-[12px] leading-[1.5]" style={{ color: neutral }}>
                    Every workspace label is already on this task.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {available.map((l, i) => (
                      <li key={l.id}>
                        <button
                          type="button"
                          ref={i === 0 ? firstLabelOpt : null}
                          onClick={() => addLabel(l.id)}
                          className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] pms-hover"
                          style={{ border: '2px solid ' + neutral, borderRadius: radius, color: ink }}
                        >
                          {l.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => { setLabelOpen(false); if (addLabelBtn.current) addLabelBtn.current.focus(); }}
                  className="mt-3 text-[11px] uppercase tracking-[0.14em] underline underline-offset-2"
                  style={{ color: neutral }}
                >
                  Close
                </button>
              </div>
            ) : null}
          </section>
        </div>

        {/* ROW 3 — CHECKLIST */}
        <section className="mt-12" data-wf="b-2-0">
          <SectionHead
            index="03"
            title="Checklist"
            suffix={'— ' + doneCount + ' of ' + checklist.length + ' done'}
            right={
              checklist.length ? (
                <span className="flex items-center gap-2">
                  <span className="flex gap-1" aria-hidden="true">
                    {checklist.map((c) => (
                      <span
                        key={c.id}
                        className="inline-block"
                        style={{
                          width: 16,
                          height: 7,
                          border: '1px solid ' + ink,
                          backgroundColor: c.is_complete ? ink : 'transparent'
                        }}
                      />
                    ))}
                  </span>
                  <span className="tabular-nums">
                    {checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0}%
                  </span>
                </span>
              ) : null
            }
          />

          {checklist.length === 0 ? (
            <Empty
              title="No steps on this task yet"
              description="Break the audit into steps so progress is visible on the board. Add the first item below — it starts out unticked."
            />
          ) : (
            <ul>
              {checklist.map((c, idx) => (
                <li
                  key={c.id}
                  className={'flex items-center gap-3 py-2.5 ' + (justAdded === c.id ? 'pms-row' : '')}
                  style={{ borderBottom: '1px solid rgba(17,17,17,0.14)' }}
                >
                  <button
                    type="button"
                    data-wf={idx < 4 ? 'i-2-0-' + idx : undefined}
                    onClick={() => toggleItem(c.id)}
                    aria-pressed={c.is_complete}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center pms-hover"
                    style={{
                      border: '2px solid ' + ink,
                      borderRadius: radius,
                      backgroundColor: c.is_complete ? ink : 'transparent',
                      color: c.is_complete ? bg : ink
                    }}
                  >
                    {c.is_complete ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                    <span className="sr-only">
                      {c.is_complete ? 'Mark “' + c.title + '” as not done' : 'Mark “' + c.title + '” as done'}
                    </span>
                  </button>
                  <span className="text-[11px] tabular-nums w-6 shrink-0" style={{ color: neutral }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="text-[14px] leading-[1.5]"
                    style={{ color: c.is_complete ? neutral : ink, textDecoration: c.is_complete ? 'line-through' : 'none' }}
                  >
                    {c.title}
                  </span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: neutral }}>
                    {c.is_complete ? 'Done' : 'Open'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ROW 4 — ADD CHECKLIST ITEM */}
        <form onSubmit={addItem} className="mt-5 grid grid-cols-12 gap-x-4 gap-y-2 items-end" noValidate>
          <div className="col-span-12 sm:col-span-9">
            <Label htmlFor="new-checklist-item" className={labelCls} style={{ color: ink }}>Add checklist item</Label>
            <Input
              id="new-checklist-item"
              data-wf="b-3-0"
              ref={itemInput}
              value={newItem}
              placeholder="e.g. Draft the redirect map"
              onChange={(e) => { setNewItem(e.target.value); if (e.target.value.trim()) setItemError(''); }}
              aria-invalid={itemError ? 'true' : 'false'}
              aria-describedby={itemError ? 'new-item-error' : undefined}
              className="w-full px-3 py-2 text-[14px]"
              style={Object.assign({}, fieldStyle, itemError ? { borderColor: accent } : null)}
            />
          </div>
          <div className="col-span-12 sm:col-span-3">
            <Button
              type="submit"
              data-wf="b-3-1"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] pms-hover"
              style={{ border: '2px solid ' + ink, borderRadius: radius, backgroundColor: bg, color: ink }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add item
            </Button>
          </div>
          {itemError ? (
            <p id="new-item-error" className="col-span-12 pms-row flex items-center gap-1.5 text-[12px]" style={{ color: accent }}>
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {itemError}
            </p>
          ) : null}
        </form>

        {/* ROW 5 — COMMENTS */}
        <section className="mt-12" data-wf="b-4-0">
          <SectionHead
            index="04"
            title={'Comments (' + comments.length + ')'}
            right={<span>Oldest first</span>}
          />

          {comments.length === 0 ? (
            <Empty
              title="No one has commented yet"
              description="Start the thread — say what changed on the sitemap and who needs to act on it."
            />
          ) : (
            <ul>
              {comments.map((c, idx) => (
                <li
                  key={c.id}
                  data-wf={idx < 3 ? 'i-4-0-' + idx : undefined}
                  className={'flex gap-3 py-4 ' + (c.fresh ? 'pms-row' : '')}
                  style={{ borderBottom: '1px solid rgba(17,17,17,0.14)' }}
                >
                  <Avatar name={c.author} className="h-8 w-8 shrink-0 text-[10px]" />
                  <div className="min-w-0">
                    <p className="text-[12px]">
                      <span className="font-bold" style={{ color: ink }}>{c.author}</span>
                      <span className="mx-1.5" style={{ color: neutral }} aria-hidden="true">·</span>
                      <span className="tabular-nums" style={{ color: neutral }}>{c.at}</span>
                      {c.author === CURRENT_USER.name ? (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: neutral }}>You</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-[14px] leading-[1.55] max-w-[68ch]" style={{ color: ink }}>{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ROW 6 — WRITE A COMMENT */}
        <form onSubmit={postComment} className="mt-5 mb-4 grid grid-cols-12 gap-x-4 gap-y-2 items-end" noValidate>
          <div className="col-span-12 sm:col-span-9">
            <Label htmlFor="new-comment" className={labelCls} style={{ color: ink }}>Write a comment</Label>
            <Textarea
              id="new-comment"
              data-wf="b-5-0"
              rows={3}
              value={draft}
              placeholder="Add context for the team…"
              onChange={(e) => { setDraft(e.target.value); if (e.target.value.trim()) setCommentError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment(e); }}
              aria-invalid={commentError ? 'true' : 'false'}
              aria-describedby={commentError ? 'new-comment-error' : 'new-comment-hint'}
              className="w-full px-3 py-2 text-[14px] leading-[1.55]"
              style={Object.assign({}, fieldStyle, commentError ? { borderColor: accent } : null)}
            />
            {commentError ? (
              <p id="new-comment-error" className="pms-row mt-1.5 flex items-center gap-1.5 text-[12px]" style={{ color: accent }}>
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {commentError}
              </p>
            ) : (
              <p id="new-comment-hint" className="mt-1.5 text-[11px]" style={{ color: neutral }}>
                Posting as {CURRENT_USER.name}. ⌘/Ctrl + Enter posts.
              </p>
            )}
          </div>
          <div className="col-span-12 sm:col-span-3">
            <Button
              type="submit"
              data-wf="b-5-1"
              disabled={posting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] disabled:opacity-50"
              style={{ backgroundColor: ink, color: bg, border: '2px solid ' + ink, borderRadius: radius }}
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              {posting ? 'Posting…' : 'Post comment'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
