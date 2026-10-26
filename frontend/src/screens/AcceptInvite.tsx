// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Input, Label, Badge } = UI;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Check, Clock, ArrowRight, AlertCircle, CheckCircle } = Icons;

const INVITE = {
  email: "anna.reed@northbay.co",
  inviter: "Dana Whitfield",
  inviter_email: "dana.whitfield@northbay.co",
  workspace: "Northbay Studio",
  token: "7F2A-C91D-4B60",
  sent_at: "19 Oct 2026, 09:14",
  expires_at: "2 Nov 2026",
  verified: "2 minutes ago",
  seats_used: 18,
  seats_total: 25,
};

const WEAK_PASSWORDS = [
  "password",
  "password01",
  "northbay2026",
  "qwertyuiop",
  "1234567890",
  "letmein123",
];

const STRENGTH_LABELS = ["Not set", "Too weak", "Weak", "Fair", "Strong"];

function scorePassword(value) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 10) score += 1;
  if (value.length >= 14) score += 1;
  if (/[0-9]/.test(value) && /[A-Za-z]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (value.length < 8) score = 1;
  return Math.max(0, Math.min(score, 4));
}

const SHEET_CSS = `
.pms-root { color: var(--ink); background: var(--bg); }
.pms-input {
  width: 100%;
  background: var(--bg);
  color: var(--ink);
  border: 2px solid var(--ink);
  border-radius: var(--r);
  padding: 9px 12px;
  font-size: 15px;
  line-height: 1.4;
  letter-spacing: -0.01em;
}
.pms-input::placeholder { color: var(--muted); }
.pms-input[aria-invalid="true"] { border-color: var(--accent); }
.pms-input:disabled, .pms-input[readonly] { background: var(--wash); color: var(--muted); }
.pms-input:focus-visible,
.pms-btn:focus-visible,
.pms-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.pms-btn:not(:disabled):hover { background: var(--ink-hover); }
.pms-link { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
.pms-link:hover { color: var(--accent); }
.pms-seg { transition: background-color .18s linear; }
@keyframes pms-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes pms-sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
.pms-rise { animation: pms-rise .24s ease-out both; }
.pms-sweep { animation: pms-sweep 1.1s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .pms-rise, .pms-sweep { animation: none !important; }
  .pms-seg { transition: none; }
}
`;

export default function Screen() {
  const navigate = useNavigate();
  const ink = brand.primaryColor;
  const accent = brand.accentColor;
  const muted = brand.neutralColor;
  const bg = brand.backgroundColor;

  const [values, setValues] = React.useState({
    full_name: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = React.useState({});
  const [formError, setFormError] = React.useState(null);
  const [status, setStatus] = React.useState("idle"); // idle | submitting | created
  const [showPassword, setShowPassword] = React.useState(false);

  const nameRef = React.useRef(null);
  const passwordRef = React.useRef(null);
  const confirmRef = React.useRef(null);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const busy = status === "submitting";
  const done = status === "created";
  const strength = scorePassword(values.password);

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const next = {};
    const name = values.full_name.trim();
    if (!name) {
      next.full_name = "Enter the name your teammates will see on tasks.";
    } else if (name.length < 2) {
      next.full_name = "That looks too short — use your full name.";
    }

    if (!values.password) {
      next.password = "Choose a password of at least 10 characters.";
    } else if (values.password.length < 10) {
      next.password = "Use at least 10 characters. Yours has " + values.password.length + ".";
    } else if (WEAK_PASSWORDS.indexOf(values.password.toLowerCase()) !== -1) {
      next.password = "That password is too easy to guess. Pick another one.";
    }

    if (!values.confirm) {
      next.confirm = "Retype the password to confirm it.";
    } else if (values.confirm !== values.password) {
      next.confirm = "The two passwords don't match.";
    }
    return next;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (busy || done) return;

    const found = validate();
    setErrors(found);
    const keys = Object.keys(found);
    if (keys.length > 0) {
      setFormError(
        keys.length === 1
          ? "We can't create the account yet — one field below needs attention."
          : "We can't create the account yet — " + keys.length + " fields below need attention."
      );
      const order = ["full_name", "password", "confirm"];
      const first = order.filter((k) => keys.indexOf(k) !== -1)[0];
      const refs = { full_name: nameRef, password: passwordRef, confirm: confirmRef };
      if (refs[first] && refs[first].current) refs[first].current.focus();
      return;
    }

    setFormError(null);
    setStatus("submitting");
    timerRef.current = setTimeout(() => setStatus("created"), 1000);
  }

  const labelClass =
    "block text-[11px] font-bold uppercase tracking-[0.16em]";
  const rowBorder = { borderColor: ink };

  function FieldRow(props) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-[196px_1fr] border-b-2"
        style={rowBorder}
      >
        <div
          className="flex items-start gap-3 px-4 py-4 sm:border-r-2 border-b-2 sm:border-b-0"
          style={rowBorder}
        >
          <span
            className="text-[11px] font-bold pt-[2px]"
            style={{ color: muted, fontVariantNumeric: "tabular-nums" }}
            aria-hidden="true"
          >
            {props.num}
          </span>
          <div>
            <Label htmlFor={props.htmlFor} className={labelClass} style={{ color: ink }}>
              {props.label}
            </Label>
            <p className="mt-1 text-[12px] leading-[1.5]" style={{ color: muted }}>
              {props.hint}
            </p>
          </div>
        </div>
        <div className="px-4 py-4">{props.children}</div>
      </div>
    );
  }

  function ErrorNote(props) {
    return (
      <p
        id={props.id}
        role="alert"
        className="mt-2 flex items-start gap-1.5 text-[12.5px] font-medium leading-[1.5]"
        style={{ color: accent }}
      >
        <AlertCircle className="h-4 w-4 shrink-0 mt-[1px]" aria-hidden="true" />
        <span>
          <span className="font-bold uppercase tracking-[0.1em] text-[11px] mr-1">Error</span>
          {props.children}
        </span>
      </p>
    );
  }

  return (
    <div
      className="pms-root min-h-screen w-full"
      style={{
        "--ink": ink,
        "--ink-hover": "#2b2b2b",
        "--accent": accent,
        "--muted": muted,
        "--bg": bg,
        "--wash": "#f5f5f5",
        "--r": brand.radius,
        backgroundColor: bg,
        fontFamily: brand.fontBody,
      }}
    >
      <style>{SHEET_CSS}</style>

      {/* Masthead — pre-sign-in page, no app navigation */}
      <header
        className="border-b-2 px-6 sm:px-10 py-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-3"
        style={rowBorder}
      >
        <div className="flex items-center gap-4">
          <span
            className="text-[17px] font-bold tracking-[-0.04em]"
            style={{ fontFamily: brand.fontHeading }}
          >
            PMS
          </span>
          <span className="h-4 w-[2px] block" style={{ backgroundColor: ink }} aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: muted }}>
            Invitation
          </span>
        </div>
        <div
          className="flex items-center gap-5 text-[11px] uppercase tracking-[0.14em]"
          style={{ color: muted, fontVariantNumeric: "tabular-nums" }}
        >
          <span>
            Token&nbsp;
            <span style={{ color: ink }} className="font-bold">{INVITE.token}</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Link verified {INVITE.verified}
          </span>
        </div>
      </header>

      <main className="px-6 sm:px-10 py-10 sm:py-14">
        <div className="max-w-[880px]">
          {/* b-0-0 — page title */}
          <div data-wf="b-0-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: muted }}>
              Step 1 of 1 — Create your account
            </p>
            <h1
              className="mt-3 text-[34px] sm:text-[40px] font-bold leading-[1.05] tracking-[-0.035em]"
              style={{ fontFamily: brand.fontHeading, color: ink }}
            >
              Accept your invitation
            </h1>
          </div>

          {/* b-1-0 — invitation record */}
          <div
            data-wf="b-1-0"
            className="mt-8 border-2 grid grid-cols-1 lg:grid-cols-[1fr_300px]"
            style={rowBorder}
          >
            <div className="px-5 py-5 border-b-2 lg:border-b-0 lg:border-r-2" style={rowBorder}>
              <p className="text-[15px] leading-[1.6] max-w-[60ch]">
                <span className="font-bold">{INVITE.inviter}</span> invited you to join the PMS
                workspace. Set your name and a password to create your account. This invitation
                expires on{" "}
                <span className="font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {INVITE.expires_at}
                </span>
                .
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge
                  className="rounded-none border-2 px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.14em] bg-transparent"
                  style={{ borderColor: ink, color: ink, borderRadius: brand.radius }}
                >
                  Member access
                </Badge>
                <span className="text-[12px]" style={{ color: muted }}>
                  Every member can see and edit all projects and tasks.
                </span>
              </div>
            </div>
            <dl className="px-5 py-5 text-[12.5px]" style={{ fontVariantNumeric: "tabular-nums" }}>
              {[
                ["Workspace", INVITE.workspace],
                ["Invited by", INVITE.inviter_email],
                ["Sent", INVITE.sent_at],
                ["Seats used", INVITE.seats_used + " of " + INVITE.seats_total],
              ].map(function (pair, i) {
                return (
                  <div
                    key={pair[0]}
                    className={
                      "flex items-baseline justify-between gap-4 py-[7px] " +
                      (i === 0 ? "" : "border-t")
                    }
                    style={{ borderColor: "rgba(17,17,17,0.14)" }}
                  >
                    <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: muted }}>
                      {pair[0]}
                    </dt>
                    <dd className="text-right font-medium truncate" style={{ color: ink }}>
                      {pair[1]}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* b-2-0 — form */}
          <form data-wf="b-2-0" onSubmit={handleSubmit} noValidate className="mt-10">
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <h2
                className="text-[13px] font-bold uppercase tracking-[0.18em]"
                style={{ fontFamily: brand.fontHeading, color: ink }}
              >
                Account details
              </h2>
              <span className="text-[11.5px]" style={{ color: muted }}>
                All four fields required
              </span>
            </div>

            {formError && !done ? (
              <div
                className="pms-rise border-2 px-4 py-3 mb-4 flex items-start gap-2"
                style={{ borderColor: accent, borderRadius: brand.radius }}
                role="alert"
              >
                <AlertCircle className="h-4 w-4 mt-[2px] shrink-0" style={{ color: accent }} aria-hidden="true" />
                <p className="text-[13px] leading-[1.5]" style={{ color: ink }}>
                  <span className="font-bold">Not submitted. </span>
                  {formError} Nothing you typed was lost.
                </p>
              </div>
            ) : null}

            {done ? (
              <div
                className="pms-rise border-2 px-4 py-3 mb-4 flex items-start gap-2"
                style={{ borderColor: ink, borderRadius: brand.radius, backgroundColor: "var(--wash)" }}
                role="status"
              >
                <CheckCircle className="h-4 w-4 mt-[2px] shrink-0" style={{ color: ink }} aria-hidden="true" />
                <p className="text-[13px] leading-[1.5]" style={{ color: ink }}>
                  <span className="font-bold">Account created. </span>
                  {values.full_name.trim()} is now a member of {INVITE.workspace}. Open the workspace
                  to pick up your first project.
                </p>
              </div>
            ) : null}

            <div className="border-2" style={rowBorder}>
              {/* i-2-0-0 */}
              <FieldRow
                num="01"
                label="Email address"
                htmlFor="invite-email"
                hint="Fixed by this invitation."
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    id="invite-email"
                    data-wf="i-2-0-0"
                    name="email"
                    type="email"
                    value={INVITE.email}
                    readOnly
                    className="pms-input sm:max-w-[360px]"
                    style={{ border: "2px solid " + ink, borderRadius: brand.radius }}
                    aria-describedby="invite-email-note"
                  />
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: muted }}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Locked
                  </span>
                </div>
                <p id="invite-email-note" className="mt-2 text-[12px]" style={{ color: muted }}>
                  Wrong address? Ask {INVITE.inviter} to send a new invitation.
                </p>
              </FieldRow>

              {/* i-2-0-1 */}
              <FieldRow
                num="02"
                label="Full name"
                htmlFor="invite-name"
                hint="Shown on tasks you own and on comments."
              >
                <Input
                  id="invite-name"
                  data-wf="i-2-0-1"
                  ref={nameRef}
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="Anna Reed"
                  value={values.full_name}
                  disabled={busy || done}
                  onChange={(e) => setField("full_name", e.target.value)}
                  className="pms-input sm:max-w-[360px]"
                  style={{ border: "2px solid " + (errors.full_name ? accent : ink), borderRadius: brand.radius }}
                  aria-invalid={errors.full_name ? "true" : "false"}
                  aria-describedby={errors.full_name ? "invite-name-error" : undefined}
                />
                {errors.full_name ? (
                  <ErrorNote id="invite-name-error">{errors.full_name}</ErrorNote>
                ) : null}
              </FieldRow>

              {/* i-2-0-2 */}
              <FieldRow
                num="03"
                label="Password"
                htmlFor="invite-password"
                hint="At least 10 characters. Mix letters, numbers and a symbol."
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    id="invite-password"
                    data-wf="i-2-0-2"
                    ref={passwordRef}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={values.password}
                    disabled={busy || done}
                    onChange={(e) => setField("password", e.target.value)}
                    className="pms-input sm:max-w-[360px]"
                    style={{ border: "2px solid " + (errors.password ? accent : ink), borderRadius: brand.radius }}
                    aria-invalid={errors.password ? "true" : "false"}
                    aria-describedby="invite-password-strength"
                  />
                  <button
                    type="button"
                    className="pms-link text-[12px] font-bold uppercase tracking-[0.12em] min-h-[44px] px-1"
                    style={{ color: ink, background: "transparent" }}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Hide password" : "Show password"}
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3 sm:max-w-[360px]">
                  <div className="flex gap-[3px] flex-1" aria-hidden="true">
                    {[1, 2, 3, 4].map(function (seg) {
                      return (
                        <span
                          key={seg}
                          className="pms-seg h-[7px] flex-1 border-2"
                          style={{
                            borderColor: ink,
                            backgroundColor: strength >= seg ? ink : "transparent",
                          }}
                        />
                      );
                    })}
                  </div>
                  <span
                    id="invite-password-strength"
                    aria-live="polite"
                    className="text-[11px] font-bold uppercase tracking-[0.12em] w-[78px] text-right"
                    style={{ color: strength >= 3 ? ink : muted }}
                  >
                    {STRENGTH_LABELS[strength]}
                  </span>
                </div>

                {errors.password ? (
                  <ErrorNote id="invite-password-error">{errors.password}</ErrorNote>
                ) : null}
              </FieldRow>

              {/* i-2-0-3 */}
              <div className="grid grid-cols-1 sm:grid-cols-[196px_1fr]">
                <div
                  className="flex items-start gap-3 px-4 py-4 sm:border-r-2 border-b-2 sm:border-b-0"
                  style={rowBorder}
                >
                  <span
                    className="text-[11px] font-bold pt-[2px]"
                    style={{ color: muted, fontVariantNumeric: "tabular-nums" }}
                    aria-hidden="true"
                  >
                    04
                  </span>
                  <div>
                    <Label htmlFor="invite-confirm" className={labelClass} style={{ color: ink }}>
                      Confirm password
                    </Label>
                    <p className="mt-1 text-[12px] leading-[1.5]" style={{ color: muted }}>
                      Type it once more to be sure.
                    </p>
                  </div>
                </div>
                <div className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      id="invite-confirm"
                      data-wf="i-2-0-3"
                      ref={confirmRef}
                      name="confirm_password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={values.confirm}
                      disabled={busy || done}
                      onChange={(e) => setField("confirm", e.target.value)}
                      className="pms-input sm:max-w-[360px]"
                      style={{ border: "2px solid " + (errors.confirm ? accent : ink), borderRadius: brand.radius }}
                      aria-invalid={errors.confirm ? "true" : "false"}
                      aria-describedby={errors.confirm ? "invite-confirm-error" : undefined}
                    />
                    {values.confirm && values.confirm === values.password && !errors.confirm ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: ink }}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Matches
                      </span>
                    ) : null}
                  </div>
                  {errors.confirm ? (
                    <ErrorNote id="invite-confirm-error">{errors.confirm}</ErrorNote>
                  ) : null}
                </div>
              </div>
            </div>

            {/* b-3-0 — primary action */}
            <div className="mt-8">
              <button
                data-wf="b-3-0"
                type={done ? "button" : "submit"}
                disabled={busy}
                onClick={done ? () => navigate("projects") : undefined}
                className="pms-btn relative w-full overflow-hidden flex items-center justify-center gap-3 px-6 min-h-[56px] text-[14px] font-bold uppercase tracking-[0.2em] disabled:opacity-70 disabled:cursor-wait"
                style={{
                  backgroundColor: ink,
                  color: bg,
                  border: "2px solid " + ink,
                  borderRadius: brand.radius,
                }}
              >
                {busy ? "Creating account…" : done ? "Open the workspace" : "Create account"}
                {!busy ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
                {busy ? (
                  <span
                    className="absolute left-0 bottom-0 h-[3px] w-1/4 pms-sweep"
                    style={{ backgroundColor: accent }}
                    aria-hidden="true"
                  />
                ) : null}
              </button>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
                <p className="text-[12px] leading-[1.6] max-w-[58ch]" style={{ color: muted }}>
                  By creating an account you join {INVITE.workspace} as a member with access to every
                  project and task in the workspace.
                </p>
                <button
                  type="button"
                  className="pms-link text-[12px] font-bold uppercase tracking-[0.12em] min-h-[44px]"
                  style={{ color: ink, background: "transparent" }}
                  onClick={() => navigate("sign-in")}
                >
                  Already a member? Sign in
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
