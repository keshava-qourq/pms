// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Button, Input, Textarea, Label, Empty } = UI;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Plus, Search, X, ChevronRight, Clock, AlertCircle, CheckCircle } = Icons;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const INITIAL_PROJECTS = [
  {
    id: "p-1041",
    wf: "i-2-0-0",
    name: "Website Redesign",
    description: "Marketing site rebuilt on the Obsidian design system. Copy freeze is 06 Nov.",
    total: 18,
    done: 12,
    overdue: 2,
    created_by: "Dana Whitfield",
    created_at: "2026-08-14",
  },
  {
    id: "p-1042",
    wf: "i-2-0-1",
    name: "Mobile App v2",
    description: "Offline task sync, push notifications and the new board gestures for iOS and Android.",
    total: 21,
    done: 5,
    overdue: 3,
    created_by: "Marcus Lee",
    created_at: "2026-09-02",
  },
  {
    id: "p-1043",
    wf: "i-2-0-2",
    name: "Q4 Marketing Campaign",
    description: "Paid, lifecycle and field activity for the October through December push.",
    total: 9,
    done: 9,
    overdue: 0,
    created_by: "Imogen Castellanos",
    created_at: "2026-07-21",
  },
  {
    id: "p-1044",
    wf: "i-2-0-3",
    name: "Internal Wiki Migration",
    description: "Move 340 Confluence pages to the handbook repo. Kick-off meeting booked for 29 Oct.",
    total: 7,
    done: 0,
    overdue: 0,
    created_by: "Dana Whitfield",
    created_at: "2026-10-20",
  },
  {
    id: "p-1045",
    wf: null,
    name: "Billing Migration — Adyen",
    description: "Cut invoicing and dunning over from Stripe without a gap in revenue reporting.",
    total: 23,
    done: 14,
    overdue: 1,
    created_by: "Priya Raghunathan",
    created_at: "2026-06-30",
  },
  {
    id: "p-1046",
    wf: null,
    name: "SOC 2 Evidence Pack",
    description: "Collect control evidence for the Type II window closing 31 Jan 2027.",
    total: 40,
    done: 31,
    overdue: 0,
    created_by: "Marcus Lee",
    created_at: "2026-05-11",
  },
  {
    id: "p-1047",
    wf: null,
    name: "Onboarding Revamp",
    description: "First-run checklist, sample project seeding and the invite email rewrite.",
    total: 11,
    done: 6,
    overdue: 0,
    created_by: "Søren Krogh",
    created_at: "2026-09-28",
  },
];

function formatDate(iso) {
  const parts = iso.split("-");
  return Number(parts[2]) + " " + MONTHS[Number(parts[1]) - 1] + " " + parts[0];
}

function statusOf(p) {
  if (p.total > 0 && p.done === p.total) return { word: "Complete", kind: "done" };
  if (p.overdue > 0) return { word: "At risk", kind: "risk" };
  if (p.done === 0) return { word: "Not started", kind: "idle" };
  return { word: "In progress", kind: "active" };
}

export default function Screen() {
  const navigate = useNavigate();
  const primary = brand.primaryColor;
  const accent = brand.accentColor;
  const neutral = brand.neutralColor;
  const hair = primary + "24";

  const [projects, setProjects] = React.useState(INITIAL_PROJECTS);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [error, setError] = React.useState(null);
  const [creating, setCreating] = React.useState(false);
  const [created, setCreated] = React.useState(null);

  const timers = React.useRef([]);
  const triggerRef = React.useRef(null);
  const nameRef = React.useRef(null);
  const panelRef = React.useRef(null);

  const addTimer = (t) => {
    timers.current.push(t);
    return t;
  };

  React.useEffect(() => {
    addTimer(setTimeout(() => setLoading(false), 650));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  React.useEffect(() => {
    if (open) addTimer(setTimeout(() => nameRef.current && nameRef.current.focus(), 30));
  }, [open]);

  const closeModal = () => {
    setOpen(false);
    setError(null);
    setCreating(false);
    addTimer(setTimeout(() => triggerRef.current && triggerRef.current.focus(), 20));
  };

  const onPanelKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeModal();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const nodes = panelRef.current.querySelectorAll(
      'button:not([disabled]), input, textarea, [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError({ field: "name", message: "Give the project a name before you create it." });
      if (nameRef.current) nameRef.current.focus();
      return;
    }
    const clash = projects.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (clash) {
      setError({
        field: "name",
        message: "“" + clash.name + "” already exists in this workspace. Pick another name, or open the one you have.",
      });
      if (nameRef.current) nameRef.current.focus();
      return;
    }
    setError(null);
    setCreating(true);
    addTimer(
      setTimeout(() => {
        const fresh = {
          id: "p-" + (1048 + projects.length),
          wf: null,
          name: trimmed,
          description: desc.trim() || "No description yet — add one from the project workspace.",
          total: 0,
          done: 0,
          overdue: 0,
          created_by: "You (Priya Raghunathan)",
          created_at: "2026-10-26",
          isNew: true,
        };
        setProjects((prev) => [fresh, ...prev]);
        setCreated(fresh);
        setCreating(false);
        setOpen(false);
        setName("");
        setDesc("");
        setQuery("");
        addTimer(setTimeout(() => triggerRef.current && triggerRef.current.focus(), 20));
      }, 620)
    );
  };

  const q = query.trim().toLowerCase();
  const filtered = projects.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.created_by.toLowerCase().includes(q)
  );

  const atRisk = projects.filter((p) => statusOf(p).kind === "risk").length;
  const done = projects.filter((p) => statusOf(p).kind === "done").length;

  const css = `
    .ob-focus:focus-visible { outline: 2px solid ${accent}; outline-offset: 2px; }
    .ledger-cell { transition: background-color 140ms ease; }
    .ledger-cell:hover { background-color: ${primary}08; }
    @keyframes ob-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
    @keyframes ob-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ob-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes ob-pulse { 0%,100% { opacity: .5; } 50% { opacity: .2; } }
    .ob-enter { animation: ob-in 260ms ease-out both; }
    .ob-fade { animation: ob-fade 160ms ease-out both; }
    .ob-rise { animation: ob-rise 200ms ease-out both; }
    .ob-pulse { animation: ob-pulse 1.3s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .ob-enter, .ob-fade, .ob-rise, .ob-pulse, .ledger-cell { animation: none !important; transition: none !important; }
    }
  `;

  const badgeStyle = (kind) => {
    if (kind === "risk") return { color: accent, borderColor: accent };
    if (kind === "done") return { color: primary, borderColor: primary, backgroundColor: primary + "0f" };
    if (kind === "idle") return { color: neutral, borderColor: hair };
    return { color: primary, borderColor: primary };
  };

  const Ticks = ({ p }) => {
    const cap = Math.min(p.total, 40);
    const items = [];
    for (let i = 0; i < cap; i++) {
      const complete = i < p.done;
      const late = !complete && i >= p.total - p.overdue;
      items.push(
        <span
          key={i}
          style={{
            width: "4px",
            height: "14px",
            backgroundColor: complete ? primary : late ? accent : "transparent",
            border: complete || late ? "none" : "1px solid " + hair,
          }}
        />
      );
    }
    if (!cap) {
      return (
        <div className="flex items-center" style={{ height: "14px" }}>
          <span className="block w-full" style={{ height: "1px", backgroundColor: hair }} />
        </div>
      );
    }
    return (
      <div className="flex items-end gap-[2px]" aria-hidden="true">
        {items}
      </div>
    );
  };

  return (
    <div className="min-h-full px-6 py-8 md:px-10 md:py-10" style={{ backgroundColor: brand.backgroundColor, fontFamily: brand.fontBody, color: primary }}>
      <style>{css}</style>

      <div className="mx-auto w-full max-w-[1180px]">
        {/* Row 1 — title + primary action */}
        <div className="grid grid-cols-12 items-end gap-4">
          <div className="col-span-12 md:col-span-8" data-wf="b-0-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: neutral }}>
              Northgate Ops workspace
            </p>
            <h1
              className="mt-2 text-[34px] md:text-[38px] font-bold leading-none tracking-[-0.02em]"
              style={{ fontFamily: brand.fontHeading }}
            >
              Projects
            </h1>
            <p className="mt-3 max-w-[64ch] text-[13px] leading-[1.6]" style={{ color: neutral }}>
              Every project in the workspace, open to every signed-in member.{" "}
              <span className="tabular-nums">{projects.length}</span> total ·{" "}
              <span className="tabular-nums">{atRisk}</span> at risk ·{" "}
              <span className="tabular-nums">{done}</span> complete.
            </p>
          </div>

          <div className="col-span-12 md:col-span-4 flex md:justify-end">
            <Button
              ref={triggerRef}
              data-wf="b-0-1"
              onClick={() => {
                setError(null);
                setOpen(true);
              }}
              className="ob-focus inline-flex h-11 items-center gap-2 px-5 text-[13px] font-bold uppercase tracking-[0.12em]"
              style={{ backgroundColor: primary, color: brand.backgroundColor, borderRadius: brand.radius, border: "2px solid " + primary }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New project
            </Button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3" style={{ height: "2px", backgroundColor: primary }} />

        {/* Success feedback for a created project */}
        {created && (
          <div
            className="ob-rise mt-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            style={{ border: "2px solid " + primary, borderRadius: brand.radius }}
            role="status"
          >
            <p className="flex items-center gap-2 text-[13px]">
              <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-bold">{created.name}</span> is saved and visible to the whole team. It is first in the grid below.
              </span>
            </p>
          </div>
        )}

        {/* Row 2 — search */}
        <div className="mt-6" data-wf="b-1-0">
          <Label htmlFor="project-search" className="block text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: neutral }}>
            Search projects
          </Label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: neutral }} aria-hidden="true" />
            <Input
              id="project-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, description or owner — e.g. “billing” or “Dana”"
              className="ob-focus h-11 w-full pl-10 pr-24 text-[14px]"
              style={{ border: "2px solid " + primary, borderRadius: brand.radius, backgroundColor: brand.backgroundColor, color: primary }}
            />
            {query && (
              <Button
                onClick={() => setQuery("")}
                className="ob-focus absolute right-2 top-1/2 h-8 -translate-y-1/2 bg-transparent px-3 text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: primary, border: "1px solid " + hair, borderRadius: brand.radius }}
              >
                Clear
              </Button>
            )}
          </div>
          <p className="mt-2 text-[12px] tabular-nums" style={{ color: neutral }} aria-live="polite">
            {loading
              ? "Loading the workspace…"
              : query
              ? filtered.length + " of " + projects.length + " projects match “" + query.trim() + "”"
              : "Showing all " + projects.length + " projects · synced 09:41"}
          </p>
        </div>

        {/* Row 3 — project ledger */}
        <section className="mt-8" data-wf="b-2-0" aria-labelledby="all-projects-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="all-projects-heading" className="text-[13px] font-bold uppercase tracking-[0.18em]">
              All projects (<span className="tabular-nums">{loading ? projects.length : filtered.length}</span>)
            </h2>
            <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: neutral }}>
              Task progress
            </p>
          </div>

          {loading ? (
            <div className="mt-3 overflow-hidden" style={{ border: "2px solid " + primary, borderRadius: brand.radius }}>
              <div className="-mb-[2px] -mr-[2px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="border-b-2 border-r-2 p-5" style={{ borderColor: primary }}>
                    <div className="ob-pulse space-y-3">
                      <div style={{ height: "10px", width: "28%", backgroundColor: hair }} />
                      <div style={{ height: "18px", width: "66%", backgroundColor: hair }} />
                      <div style={{ height: "10px", width: "90%", backgroundColor: hair }} />
                      <div style={{ height: "14px", width: "100%", backgroundColor: hair }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filtered.length > 0 ? (
            <div className="mt-3 overflow-hidden" style={{ border: "2px solid " + primary, borderRadius: brand.radius }}>
              <ul className="-mb-[2px] -mr-[2px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p, idx) => {
                  const st = statusOf(p);
                  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
                  return (
                    <li
                      key={p.id}
                      className={"ledger-cell relative flex flex-col gap-3 border-b-2 border-r-2 p-5 " + (p.isNew ? "ob-enter" : "")}
                      style={{ borderColor: primary }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[11px] font-bold tabular-nums tracking-[0.18em]" style={{ color: neutral }}>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.14em]"
                          style={{ ...badgeStyle(st.kind), border: "1px solid " + (badgeStyle(st.kind).borderColor || hair), borderRadius: brand.radius }}
                        >
                          {st.kind === "risk" && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
                          {st.kind === "done" && <CheckCircle className="h-3 w-3" aria-hidden="true" />}
                          {st.kind === "idle" && <Clock className="h-3 w-3" aria-hidden="true" />}
                          {st.word}
                        </span>
                      </div>

                      <h3 className="text-[17px] font-bold leading-snug tracking-[-0.01em]" style={{ fontFamily: brand.fontHeading }}>
                        <button
                          type="button"
                          data-wf={p.wf || undefined}
                          onClick={() => navigate("project")}
                          className="ob-focus group text-left"
                          style={{ color: primary }}
                        >
                          <span className="absolute inset-0" aria-hidden="true" />
                          <span className="decoration-2 underline-offset-4 group-hover:underline">{p.name}</span>
                        </button>
                      </h3>

                      <p className="max-w-[44ch] text-[13px] leading-[1.55]" style={{ color: neutral }}>
                        {p.description}
                      </p>

                      <div className="mt-auto space-y-2 pt-3" style={{ borderTop: "1px solid " + hair }}>
                        <Ticks p={p} />
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[12px] tabular-nums">
                            <span className="font-bold">
                              {p.done} of {p.total}
                            </span>{" "}
                            tasks complete
                          </p>
                          <span className="text-[12px] font-bold tabular-nums" style={{ color: p.total ? primary : neutral }}>
                            {p.total ? pct + "%" : "—"}
                          </span>
                        </div>
                        {p.overdue > 0 ? (
                          <p className="flex items-center gap-1 text-[12px] font-bold tabular-nums" style={{ color: accent }}>
                            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            {p.overdue} task{p.overdue > 1 ? "s" : ""} past due
                          </p>
                        ) : (
                          <p className="text-[12px]" style={{ color: neutral }}>
                            Nothing past due
                          </p>
                        )}
                        <p className="flex items-center justify-between gap-2 text-[11px]" style={{ color: neutral }}>
                          <span className="truncate">
                            {p.created_by} · {formatDate(p.created_at)}
                          </span>
                          <span className="flex shrink-0 items-center gap-1 uppercase tracking-[0.12em]" aria-hidden="true">
                            Open
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Row 4 — empty states */}
        {!loading && filtered.length === 0 && (
          <div
            className="ob-fade mt-3 px-6 py-12"
            data-wf="b-3-0"
            style={{ border: "2px solid " + primary, borderRadius: brand.radius }}
          >
            {projects.length === 0 ? (
              <Empty
                title="No projects yet"
                description="No projects yet. Create the first project to start organizing the team's work."
                action={
                  <Button
                    onClick={() => setOpen(true)}
                    className="ob-focus inline-flex h-11 items-center gap-2 px-5 text-[13px] font-bold uppercase tracking-[0.12em]"
                    style={{ backgroundColor: primary, color: brand.backgroundColor, borderRadius: brand.radius }}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New project
                  </Button>
                }
              />
            ) : (
              <Empty
                title={"Nothing matches “" + query.trim() + "”"}
                description="No project name, description or owner contains that word. Try a shorter term, or clear the search to see all projects."
                action={
                  <Button
                    onClick={() => setQuery("")}
                    className="ob-focus inline-flex h-11 items-center gap-2 px-5 text-[13px] font-bold uppercase tracking-[0.12em]"
                    style={{ backgroundColor: primary, color: brand.backgroundColor, borderRadius: brand.radius }}
                  >
                    Clear search
                  </Button>
                }
              />
            )}
          </div>
        )}

        <p className="mt-8 max-w-[70ch] text-[12px] leading-[1.6]" style={{ color: neutral }}>
          Access is flat: every signed-in member can open and edit every project and task here. Only workspace admins — Dana Whitfield and Marcus Lee — can invite new members; ask one of them to send an invitation.
        </p>
      </div>

      {/* Row 5 — new project modal */}
      {open && (
        <div
          className="ob-fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-10"
          data-wf="b-4-0"
          style={{ backgroundColor: primary + "99" }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            onKeyDown={onPanelKeyDown}
            className="ob-rise mt-10 w-full max-w-[560px]"
            style={{
              backgroundColor: brand.backgroundColor,
              border: "2px solid " + primary,
              borderRadius: brand.radius,
              boxShadow: "0 24px 60px " + primary + "40",
            }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: neutral }}>
                  Northgate Ops workspace
                </p>
                <h2 id="new-project-title" className="mt-1 text-[24px] font-bold tracking-[-0.02em]" style={{ fontFamily: brand.fontHeading }}>
                  New project
                </h2>
              </div>
              <Button
                onClick={closeModal}
                aria-label="Close new project dialog"
                className="ob-focus flex h-9 w-9 items-center justify-center bg-transparent"
                style={{ color: primary, border: "1px solid " + hair, borderRadius: brand.radius }}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div style={{ height: "2px", backgroundColor: primary }} />

            <form onSubmit={handleCreate} noValidate>
              <div className="space-y-5 px-6 py-6">
                <div>
                  <Label htmlFor="project-name" className="block text-[11px] font-bold uppercase tracking-[0.18em]">
                    Name <span style={{ color: accent }}>(required)</span>
                  </Label>
                  <Input
                    id="project-name"
                    ref={nameRef}
                    data-wf="i-4-0-0"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(null);
                    }}
                    aria-invalid={error && error.field === "name" ? "true" : undefined}
                    aria-describedby={error && error.field === "name" ? "project-name-error" : "project-name-hint"}
                    placeholder="e.g. Partner Portal Launch"
                    className="ob-focus mt-2 h-11 w-full text-[14px]"
                    style={{
                      border: "2px solid " + (error && error.field === "name" ? accent : primary),
                      borderRadius: brand.radius,
                      backgroundColor: brand.backgroundColor,
                      color: primary,
                    }}
                  />
                  {error && error.field === "name" ? (
                    <p id="project-name-error" className="mt-2 flex items-start gap-1.5 text-[12px] font-bold leading-[1.5]" style={{ color: accent }}>
                      <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {error.message}
                    </p>
                  ) : (
                    <p id="project-name-hint" className="mt-2 text-[12px]" style={{ color: neutral }}>
                      Everyone on the team will see this name in the projects overview.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="project-description" className="block text-[11px] font-bold uppercase tracking-[0.18em]">
                    Description
                  </Label>
                  <Textarea
                    id="project-description"
                    data-wf="i-4-0-1"
                    rows={4}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="What this project covers, and when it has to land."
                    aria-describedby="project-description-hint"
                    className="ob-focus mt-2 w-full p-3 text-[14px] leading-[1.55]"
                    style={{ border: "2px solid " + primary, borderRadius: brand.radius, backgroundColor: brand.backgroundColor, color: primary }}
                  />
                  <p id="project-description-hint" className="mt-2 text-[12px]" style={{ color: neutral }}>
                    Optional. You can edit it later from the project workspace.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-1" style={{ borderTop: "1px solid " + hair }}>
                <p className="text-[12px] pt-4" style={{ color: neutral }}>
                  Created by you · 26 Oct 2026
                </p>
                <div className="flex items-center gap-2 pt-4">
                  <Button
                    type="button"
                    onClick={closeModal}
                    className="ob-focus h-11 bg-transparent px-4 text-[13px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: primary, border: "2px solid " + primary, borderRadius: brand.radius }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    data-wf="i-4-0-2"
                    disabled={creating}
                    className="ob-focus inline-flex h-11 items-center gap-2 px-5 text-[13px] font-bold uppercase tracking-[0.12em] disabled:opacity-60"
                    style={{ backgroundColor: primary, color: brand.backgroundColor, border: "2px solid " + primary, borderRadius: brand.radius }}
                  >
                    {creating ? (
                      <React.Fragment>
                        <Clock className="h-4 w-4 ob-pulse" aria-hidden="true" />
                        Creating…
                      </React.Fragment>
                    ) : (
                      <React.Fragment>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Create project
                      </React.Fragment>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
