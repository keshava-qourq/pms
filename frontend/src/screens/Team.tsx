// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import { apiFetch, ApiError } from "@/lib/api";

const { Button, Input, Label, Badge, Table, THead, TBody, TR, TH, TD, Avatar, Empty } = UI;

const { Check, ChevronDown, User, Clock, ArrowRight, AlertCircle, CheckCircle } = Icons;

const MEMBERS = [
  {
    id: "u-01",
    name: "Anna Reed",
    email: "anna.reed@northbay.co",
    is_admin: true,
    created_at: "2024-02-04",
    joined: "4 Feb 2024",
  },
  {
    id: "u-02",
    name: "Marcus Oyelaran",
    email: "marcus.oyelaran@northbay.co",
    is_admin: true,
    created_at: "2024-02-04",
    joined: "4 Feb 2024",
  },
  {
    id: "u-03",
    name: "Priya Raghunathan",
    email: "priya.raghunathan@northbay.co",
    is_admin: false,
    created_at: "2024-03-19",
    joined: "19 Mar 2024",
  },
];

const MEMBER_COLUMNS = [
  { key: "name", label: "Name", wf: "i-1-0-0", align: "left" },
  { key: "email", label: "Email", wf: "i-1-0-1", align: "left" },
  { key: "role", label: "Role", wf: "i-1-0-2", align: "left" },
  { key: "joined", label: "Joined", wf: "i-1-0-3", align: "right" },
];

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function Screen() {
  const navigate = useNavigate();
  const ink = brand.primaryColor;
  const accent = brand.accentColor;
  const muted = brand.neutralColor;
  const paper = brand.backgroundColor;
  const r = brand.radius;
  const hair = "rgba(17,17,17,0.14)";

  // Admin visibility is driven only by GET /auth/me's is_admin flag, never guessed client-side.
  // null while loading: nothing invite-related renders until we know for certain.
  const [isAdmin, setIsAdmin] = React.useState(null);
  const [invites, setInvites] = React.useState([]);
  const [email, setEmail] = React.useState("");
  const [feedback, setFeedback] = React.useState({ kind: "idle" });
  const [sending, setSending] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(null);
  const [sortKey, setSortKey] = React.useState("joined");
  const [sortDir, setSortDir] = React.useState("asc");

  const inputRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch("/auth/me")
      .then((me) => {
        if (!cancelled) setIsAdmin(Boolean(me && me.is_admin));
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedMembers = React.useMemo(() => {
    const rows = MEMBERS.slice();
    rows.sort((a, b) => {
      let va;
      let vb;
      if (sortKey === "role") {
        va = a.is_admin ? 0 : 1;
        vb = b.is_admin ? 0 : 1;
      } else if (sortKey === "joined") {
        va = a.created_at;
        vb = b.created_at;
      } else {
        va = String(a[sortKey]).toLowerCase();
        vb = String(b[sortKey]).toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [sortKey, sortDir]);

  function toggleSort(key) {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isAdmin || sending) return;

    const value = email.trim();

    if (!value) {
      setFeedback({
        kind: "error",
        title: "Enter an email address",
        body: "Type your colleague's work email address, then send the invitation.",
      });
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setFeedback({
        kind: "error",
        title: "That address looks incomplete",
        body:
          "“" +
          value +
          "” isn't a valid email address. Check for a missing @ or domain and send again — we kept what you typed.",
      });
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    setSending(true);
    setFeedback({ kind: "sending", body: "Sending the invitation to " + value + "…" });

    try {
      const invitation = await apiFetch("/invitations", {
        method: "POST",
        body: JSON.stringify({ email: value }),
      });
      setInvites((prev) => [invitation, ...prev]);
      setJustAdded(invitation && invitation.id);
      setEmail("");
      setFeedback({
        kind: "success",
        title: "Invitation sent",
        body: value + " can set a password from the link in the email.",
      });
    } catch (err) {
      let title = "Could not send the invitation";
      let body = "Something went wrong sending the invitation. Try again.";
      if (err instanceof ApiError && err.status === 409) {
        title = "Already a member";
        body = value + " already has an account in this workspace, so no new invitation was sent.";
      } else if (err instanceof ApiError && err.status === 403) {
        title = "Not permitted";
        body = "Only administrators can send invitations, so nothing was sent to " + value + ".";
      }
      setFeedback({ kind: "error", title, body });
      if (inputRef.current) inputRef.current.focus();
    } finally {
      setSending(false);
    }
  }

  const labelStyle = {
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: muted,
    fontWeight: 600,
  };

  const css = [
    "@keyframes obRowIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}",
    "@keyframes obBar{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}",
    "@keyframes obPulse{0%,100%{opacity:1}50%{opacity:.35}}",
    ".ob-row-in{animation:obRowIn .3s ease-out both}",
    ".ob-bar{position:relative;overflow:hidden}",
    '.ob-bar:after{content:"";position:absolute;inset:0;background:var(--ob-ink);animation:obBar 1.1s linear infinite}',
    ".ob-pulse{animation:obPulse 1.2s ease-in-out infinite}",
    ".ob-focus:focus-visible{outline:2px solid var(--ob-ink);outline-offset:2px}",
    ".ob-focus-accent:focus-visible{outline:2px solid var(--ob-accent);outline-offset:2px}",
    ".ob-row:hover{background:rgba(17,17,17,0.035)}",
    "@media (prefers-reduced-motion: reduce){.ob-row-in{animation:none}.ob-bar:after{animation:none}.ob-pulse{animation:none}}",
  ].join("\n");

  const feedbackTone = feedback.kind === "error" ? accent : ink;

  return (
    <div
      className="w-full"
      style={{
        backgroundColor: paper,
        color: ink,
        fontFamily: brand.fontBody,
        ["--ob-ink"]: ink,
        ["--ob-accent"]: accent,
      }}
    >
      <style>{css}</style>

      <div className="mx-auto w-full max-w-[1120px] px-6 py-8 md:px-10 md:py-12">
        {/* Row 1 — page title */}
        <header data-wf="b-0-0" className="mb-10">
          <h1
            className="text-[34px] md:text-[40px] font-bold leading-[1.05]"
            style={{ fontFamily: brand.fontHeading, letterSpacing: "-0.03em", color: ink }}
          >
            Team
          </h1>
          <p className="mt-3 max-w-[62ch] text-[14px] leading-[1.55]" style={{ color: muted }}>
            Everyone signed into the workspace can see and edit every project and task.
            Administrators are the only members who can invite someone new.
          </p>
        </header>

        {/* Row 2 — members table */}
        <section data-wf="b-1-0" className="mb-12" aria-labelledby="members-heading">
          <div
            className="flex items-end justify-between gap-4 pb-2"
            style={{ borderBottom: "2px solid " + ink }}
          >
            <div className="flex items-baseline gap-3">
              <span style={{ ...labelStyle, fontVariantNumeric: "tabular-nums" }}>01</span>
              <h2
                id="members-heading"
                className="text-[19px] font-bold leading-none"
                style={{
                  fontFamily: brand.fontHeading,
                  letterSpacing: "-0.015em",
                  color: ink,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                Members ({MEMBERS.length})
              </h2>
            </div>
          </div>

          <Table className="w-full" style={{ fontVariantNumeric: "tabular-nums" }}>
            <THead>
              <TR style={{ borderBottom: "1px solid " + hair }}>
                {MEMBER_COLUMNS.map((col) => {
                  const active = sortKey === col.key;
                  return (
                    <TH
                      key={col.key}
                      scope="col"
                      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                      className={
                        "px-3 py-2 " + (col.align === "right" ? "text-right" : "text-left")
                      }
                      style={{ backgroundColor: paper }}
                    >
                      <button
                        type="button"
                        data-wf={col.wf}
                        onClick={() => toggleSort(col.key)}
                        className={
                          "ob-focus inline-flex items-center gap-1.5 py-1 " +
                          (col.align === "right" ? "flex-row-reverse" : "")
                        }
                        style={{
                          ...labelStyle,
                          color: active ? ink : muted,
                          background: "transparent",
                        }}
                      >
                        <span>{col.label}</span>
                        <ChevronDown
                          className="h-3 w-3 transition-transform duration-200"
                          aria-hidden="true"
                          style={{
                            opacity: active ? 1 : 0.3,
                            transform: active && sortDir === "desc" ? "rotate(180deg)" : "none",
                          }}
                        />
                        <span className="sr-only">
                          {active
                            ? ", sorted " +
                              (sortDir === "asc" ? "ascending" : "descending") +
                              ", activate to reverse"
                            : ", activate to sort by " + col.label.toLowerCase()}
                        </span>
                      </button>
                    </TH>
                  );
                })}
              </TR>
            </THead>
            <TBody>
              {sortedMembers.map((m) => (
                <TR
                  key={m.id}
                  className="ob-row transition-colors duration-150"
                  style={{ borderBottom: "1px solid " + hair }}
                >
                  <TD className="px-3 py-2.5">
                    <span className="flex items-center gap-3">
                      <Avatar name={m.name} className="rounded-none h-7 w-7 text-[11px]" />
                      <span
                        className="text-[14px] font-semibold"
                        style={{ color: ink, letterSpacing: "-0.01em" }}
                      >
                        {m.name}
                      </span>
                    </span>
                  </TD>
                  <TD className="px-3 py-2.5 text-[13px]" style={{ color: muted }}>
                    {m.email}
                  </TD>
                  <TD className="px-3 py-2.5">
                    <Badge
                      className="rounded-none px-1.5 py-0.5"
                      style={{
                        ...labelStyle,
                        color: m.is_admin ? accent : muted,
                        backgroundColor: "transparent",
                        border: m.is_admin ? "2px solid " + accent : "1px solid " + hair,
                        borderRadius: r,
                      }}
                    >
                      {m.is_admin ? "Administrator" : "Member"}
                    </Badge>
                  </TD>
                  <TD className="px-3 py-2.5 text-right text-[13px]" style={{ color: muted }}>
                    {m.joined}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>

        {/* Focal block: invite — only ever rendered for a confirmed administrator (AC-005) */}
        {isAdmin ? (
          <div
            className="mb-12"
            style={{ border: "2px solid " + ink, borderRadius: r, backgroundColor: paper }}
          >
            {/* Row 3 — invite form (8/12) + send button (4/12) */}
            <form onSubmit={handleSubmit} noValidate className="p-6 md:p-8">
              <div className="grid grid-cols-12 gap-x-6 gap-y-5">
                <div data-wf="b-2-0" className="col-span-12 md:col-span-8">
                  <h2
                    className="text-[19px] font-bold leading-none"
                    style={{ fontFamily: brand.fontHeading, letterSpacing: "-0.015em", color: ink }}
                  >
                    Invite a team member{" "}
                    <span className="font-normal" style={{ color: muted }}>
                      (administrators only)
                    </span>
                  </h2>

                  <div className="mt-5">
                    <Label htmlFor="invite-email" className="mb-2 block" style={labelStyle}>
                      Email address
                    </Label>
                    <Input
                      id="invite-email"
                      ref={inputRef}
                      data-wf="i-2-0-0"
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={email}
                      disabled={sending}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (feedback.kind === "error") setFeedback({ kind: "idle" });
                      }}
                      placeholder="colleague@example.com"
                      aria-describedby="invite-help invite-feedback"
                      aria-invalid={feedback.kind === "error"}
                      className="ob-focus w-full h-11 px-3 text-[15px]"
                      style={{
                        border: "2px solid " + (feedback.kind === "error" ? accent : ink),
                        borderRadius: r,
                        backgroundColor: paper,
                        color: ink,
                        opacity: sending ? 0.6 : 1,
                      }}
                    />
                    <p
                      id="invite-help"
                      className="mt-2 text-[12px] leading-[1.5]"
                      style={{ color: muted }}
                    >
                      The invitee sets their own password from the emailed link.
                    </p>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-4 flex md:items-end">
                  <div className="w-full md:pb-[26px]">
                    <Button
                      type="submit"
                      data-wf="b-2-1"
                      disabled={sending}
                      aria-disabled={sending}
                      className="ob-focus w-full h-11 inline-flex items-center justify-center gap-2 text-[14px] font-semibold uppercase transition-opacity duration-150"
                      style={{
                        backgroundColor: ink,
                        color: paper,
                        border: "2px solid " + ink,
                        borderRadius: r,
                        letterSpacing: "0.08em",
                        cursor: sending ? "not-allowed" : "pointer",
                        opacity: sending ? 0.85 : 1,
                      }}
                    >
                      {sending ? (
                        <React.Fragment>
                          <Clock className="h-4 w-4 ob-pulse" aria-hidden="true" />
                          <span>Sending…</span>
                        </React.Fragment>
                      ) : (
                        <React.Fragment>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          <span>Send invitation</span>
                        </React.Fragment>
                      )}
                    </Button>
                    {sending ? (
                      <div
                        className="ob-bar mt-2 h-[2px] w-full"
                        style={{ backgroundColor: hair }}
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </form>

            <div style={{ borderTop: "1px solid " + hair }} />

            {/* Row 4 — result / message */}
            <div
              data-wf="b-3-0"
              id="invite-feedback"
              role="status"
              aria-live="polite"
              className="px-6 py-4 md:px-8"
              style={{ borderLeft: feedback.kind === "idle" ? "none" : "2px solid " + feedbackTone }}
            >
              {feedback.kind === "idle" && (
                <p className="text-[13px] leading-[1.55] max-w-[72ch]" style={{ color: muted }}>
                  Nothing sent yet. Invitations appear in the pending list below until the colleague
                  sets a password.
                </p>
              )}
              {feedback.kind === "sending" && (
                <p className="flex items-center gap-2 text-[13px]" style={{ color: ink }}>
                  <Clock className="h-4 w-4 ob-pulse" aria-hidden="true" />
                  <span>{feedback.body}</span>
                </p>
              )}
              {feedback.kind === "success" && (
                <div className="flex items-start gap-3">
                  <CheckCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                    style={{ color: ink }}
                  />
                  <p className="text-[13px] leading-[1.55] max-w-[72ch]" style={{ color: ink }}>
                    <span className="font-bold">{feedback.title}.</span>{" "}
                    <span style={{ color: muted }}>{feedback.body}</span>
                  </p>
                </div>
              )}
              {feedback.kind === "error" && (
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                    style={{ color: accent }}
                  />
                  <p className="text-[13px] leading-[1.55] max-w-[72ch]">
                    <span className="font-bold" style={{ color: accent }}>
                      {feedback.title}.
                    </span>{" "}
                    <span style={{ color: ink }}>{feedback.body}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : isAdmin === false ? (
          <div
            className="mb-12 flex items-start gap-3 p-4"
            style={{
              border: "1px solid " + hair,
              borderLeft: "2px solid " + ink,
              borderRadius: r,
            }}
          >
            <User className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" style={{ color: muted }} />
            <p className="text-[13px] leading-[1.55] max-w-[60ch]" style={{ color: muted }}>
              <span className="font-semibold" style={{ color: ink }}>
                Inviting is an administrator task.
              </span>{" "}
              Your account can see and edit every project and task, but not send invitations. Ask an
              administrator to invite your colleague.
            </p>
          </div>
        ) : null}

        {/* Row 5 — pending invitations (this session) — only shown to administrators */}
        {isAdmin ? (
          <section data-wf="b-4-0" className="mb-12" aria-labelledby="pending-heading">
            <div
              className="flex items-end justify-between gap-4 pb-2"
              style={{ borderBottom: "2px solid " + ink }}
            >
              <div className="flex items-baseline gap-3">
                <span style={{ ...labelStyle, fontVariantNumeric: "tabular-nums" }}>02</span>
                <h2
                  id="pending-heading"
                  className="text-[19px] font-bold leading-none"
                  style={{
                    fontFamily: brand.fontHeading,
                    letterSpacing: "-0.015em",
                    color: ink,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  Pending invitations ({invites.length})
                </h2>
              </div>
            </div>

            {invites.length === 0 ? (
              <div className="py-6">
                <Empty
                  title="No invitations waiting"
                  description="Send an invitation above to add a new teammate to the workspace."
                />
              </div>
            ) : (
              <Table className="w-full" style={{ fontVariantNumeric: "tabular-nums" }}>
                <THead>
                  <TR style={{ borderBottom: "1px solid " + hair }}>
                    <TH scope="col" data-wf="i-4-0-0" className="px-3 py-2 text-left" style={labelStyle}>
                      Email
                    </TH>
                    <TH scope="col" data-wf="i-4-0-1" className="px-3 py-2 text-left" style={labelStyle}>
                      Sent
                    </TH>
                    <TH scope="col" data-wf="i-4-0-2" className="px-3 py-2 text-right" style={labelStyle}>
                      Expires
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {invites.map((inv) => (
                    <TR
                      key={inv.id || inv.email}
                      className={
                        "ob-row transition-colors duration-150" +
                        (justAdded === inv.id ? " ob-row-in" : "")
                      }
                      style={{ borderBottom: "1px solid " + hair }}
                    >
                      <TD className="px-3 py-2.5 text-[14px] font-semibold" style={{ color: ink }}>
                        {inv.email}
                        {justAdded === inv.id && (
                          <span className="ml-2 align-middle" style={{ ...labelStyle, color: ink }}>
                            New
                          </span>
                        )}
                      </TD>
                      <TD className="px-3 py-2.5 text-[13px]" style={{ color: muted }}>
                        {formatDateTime(inv.created_at)}
                      </TD>
                      <TD className="px-3 py-2.5 text-right text-[13px]" style={{ color: muted }}>
                        {formatDateTime(inv.expires_at)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </section>
        ) : null}

        {/* Row 6 — link */}
        <div data-wf="b-5-0" className="md:w-4/12">
          <button
            type="button"
            onClick={() => navigate("projects")}
            className="ob-focus group inline-flex items-center gap-2 py-2 text-[14px] font-semibold"
            style={{ color: ink, background: "transparent", letterSpacing: "-0.01em" }}
          >
            <span
              className="underline underline-offset-4"
              style={{ textDecorationThickness: "2px" }}
            >
              See what the team is working on
            </span>
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
