// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.

import React from "react";
import { useLocation } from "react-router-dom";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import { apiFetch, setSession, ApiError } from "@/lib/api";

const { Input, Label } = UI;

const { Check, ArrowRight, AlertCircle, CheckCircle } = Icons;

const WEAK_PASSWORDS = ["password", "password01", "qwertyuiop", "1234567890", "letmein123"];

const STRENGTH_LABELS = ["Not set", "Too weak", "Weak", "Fair", "Strong"];

const INVALID_TOKEN_MESSAGE =
  "This invitation link is invalid or has expired. Ask whoever invited you to send a new one.";

const LABEL_CLASS = "block text-[11px] font-bold uppercase tracking-[0.16em]";

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

function fieldBorder(hasError, ink) {
  return (hasError ? "3px" : "2px") + " solid " + ink;
}

// Module-level: defined once, not recreated on every Screen render, so the inputs it
// wraps keep their identity (and focus/selection) across keystrokes instead of being
// unmounted and remounted each time the form state changes.
function FieldRow({ num, label, htmlFor, hint, ink, muted, children }) {
  const rowBorder = { borderColor: ink };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[196px_1fr] border-b-2" style={rowBorder}>
      <div
        className="flex items-start gap-3 px-4 py-4 sm:border-r-2 border-b-2 sm:border-b-0"
        style={rowBorder}
      >
        <span
          className="text-[11px] font-bold pt-[2px]"
          style={{ color: muted, fontVariantNumeric: "tabular-nums" }}
          aria-hidden="true"
        >
          {num}
        </span>
        <div>
          <Label htmlFor={htmlFor} className={LABEL_CLASS} style={{ color: ink }}>
            {label}
          </Label>
          <p className="mt-1 text-[12px] leading-[1.5]" style={{ color: muted }}>
            {hint}
          </p>
        </div>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

// Field-level errors are distinguished from hints by weight, case and an icon --
// not by colour: the whole screen is black / white / greyscale (see Screen below).
function ErrorNote({ id, ink, children }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-2 flex items-start gap-1.5 text-[12.5px] font-bold leading-[1.5]"
      style={{ color: ink }}
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-[1px]" aria-hidden="true" />
      <span>
        <span className="font-bold uppercase tracking-[0.1em] text-[11px] mr-1">Error</span>
        {children}
      </span>
    </p>
  );
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
.pms-input[aria-invalid="true"] { border-width: 3px; }
.pms-input:disabled { background: var(--wash); color: var(--muted); }
.pms-input:focus-visible,
.pms-btn:focus-visible,
.pms-link:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}
.pms-btn:not(:disabled):hover { background: var(--ink-hover); }
.pms-link { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
.pms-link:hover { text-decoration-thickness: 2px; }
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

// Uses the same monochrome tokens as the sign-in screen: every background,
// text colour, border, button and error/success state here resolves to
// black, white or a greyscale tone. Emphasis is carried by solid fills,
// weight, case and rules -- never by hue.
export default function Screen() {
  const navigate = useNavigate();
  const location = useLocation();
  const ink = brand.primaryColor;
  const muted = brand.neutralColor;
  const bg = brand.backgroundColor;
  const rowBorder = { borderColor: ink };

  const token = React.useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    return params.get("token") || "";
  }, [location.search]);

  const [values, setValues] = React.useState({
    full_name: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = React.useState({});
  const [formError, setFormError] = React.useState(token ? null : INVALID_TOKEN_MESSAGE);
  const [status, setStatus] = React.useState(token ? "idle" : "invalid"); // idle | submitting | created | invalid
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
  const invalid = status === "invalid";
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

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || done || invalid) return;

    const found = validate();
    setErrors(found);
    const keys = Object.keys(found);
    if (keys.length > 0) {
      setFormError(
        keys.length === 1
          ? "We can't create the account yet — one field below needs attention."
          : "We can't create the account yet — " + keys.length + " fields below need attention.",
      );
      const order = ["full_name", "password", "confirm"];
      const first = order.filter((k) => keys.indexOf(k) !== -1)[0];
      const refs = { full_name: nameRef, password: passwordRef, confirm: confirmRef };
      if (refs[first] && refs[first].current) refs[first].current.focus();
      return;
    }

    setFormError(null);
    setStatus("submitting");
    try {
      const result = await apiFetch("/auth/accept-invite", {
        method: "POST",
        body: JSON.stringify({
          token,
          password: values.password,
          name: values.full_name.trim(),
        }),
      });
      setSession(result.access_token, result.user);
      setStatus("created");
      timerRef.current = setTimeout(() => navigate("projects"), 650);
    } catch (err) {
      setStatus("invalid");
      setFormError(
        err instanceof ApiError
          ? INVALID_TOKEN_MESSAGE
          : "We couldn't create your account. Try again.",
      );
    }
  }

  return (
    <div
      className="pms-root min-h-screen w-full"
      style={{
        "--ink": ink,
        "--ink-hover": "#2b2b2b",
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
          <span
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: muted }}
          >
            Invitation
          </span>
        </div>
      </header>

      <main className="px-6 sm:px-10 py-10 sm:py-14">
        <div className="max-w-[880px]">
          {/* b-0-0 — page title */}
          <div data-wf="b-0-0">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: muted }}
            >
              Step 1 of 1 — Create your account
            </p>
            <h1
              className="mt-3 text-[34px] sm:text-[40px] font-bold leading-[1.05] tracking-[-0.035em]"
              style={{ fontFamily: brand.fontHeading, color: ink }}
            >
              Accept your invitation
            </h1>
          </div>

          {invalid ? (
            <div
              className="pms-rise mt-8 px-5 py-5 flex items-start gap-3"
              style={{ backgroundColor: ink, color: bg, borderRadius: brand.radius }}
              role="alert"
              data-wf="b-1-0"
            >
              <AlertCircle className="h-5 w-5 mt-[2px] shrink-0" aria-hidden="true" />
              <div>
                <p className="text-[15px] font-bold uppercase tracking-[0.06em]">
                  This invitation link doesn't work
                </p>
                <p className="mt-1 text-[13.5px] leading-[1.6] max-w-[60ch]">
                  {formError || INVALID_TOKEN_MESSAGE}
                </p>
                <button
                  type="button"
                  className="pms-link mt-3 inline-block text-[12px] font-bold uppercase tracking-[0.12em] min-h-[44px]"
                  style={{ color: bg, background: "transparent" }}
                  onClick={() => navigate("sign-in")}
                >
                  Go to sign in
                </button>
              </div>
            </div>
          ) : (
            <React.Fragment>
              <div data-wf="b-1-0" className="mt-8 border-2 px-5 py-5" style={rowBorder}>
                <p className="text-[15px] leading-[1.6] max-w-[60ch]">
                  You've been invited to join this workspace. Set your name and a password below to
                  create your account.
                </p>
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
                    All three fields required
                  </span>
                </div>

                {formError && !done ? (
                  <div
                    className="pms-rise px-4 py-3 mb-4 flex items-start gap-2"
                    style={{ backgroundColor: ink, color: bg, borderRadius: brand.radius }}
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4 mt-[2px] shrink-0" aria-hidden="true" />
                    <p className="text-[13px] leading-[1.5]">
                      <span className="font-bold uppercase tracking-[0.06em]">Not submitted. </span>
                      {formError} Nothing you typed was lost.
                    </p>
                  </div>
                ) : null}

                {done ? (
                  <div
                    className="pms-rise border-2 px-4 py-3 mb-4 flex items-start gap-2"
                    style={{
                      borderColor: ink,
                      borderRadius: brand.radius,
                      backgroundColor: "var(--wash)",
                    }}
                    role="status"
                  >
                    <CheckCircle
                      className="h-4 w-4 mt-[2px] shrink-0"
                      style={{ color: ink }}
                      aria-hidden="true"
                    />
                    <p className="text-[13px] leading-[1.5]" style={{ color: ink }}>
                      <span className="font-bold">Account created. </span>
                      {values.full_name.trim()} is now a member of the workspace. Opening the
                      projects overview…
                    </p>
                  </div>
                ) : null}

                <div className="border-2" style={rowBorder}>
                  {/* i-2-0-0 */}
                  <FieldRow
                    num="01"
                    label="Full name"
                    htmlFor="invite-name"
                    hint="Shown on tasks you own and on comments."
                    ink={ink}
                    muted={muted}
                  >
                    <Input
                      id="invite-name"
                      data-wf="i-2-0-0"
                      ref={nameRef}
                      name="full_name"
                      type="text"
                      autoComplete="name"
                      placeholder="Your name"
                      value={values.full_name}
                      disabled={busy || done}
                      onChange={(e) => setField("full_name", e.target.value)}
                      className="pms-input sm:max-w-[360px]"
                      style={{
                        border: fieldBorder(errors.full_name, ink),
                        borderRadius: brand.radius,
                      }}
                      aria-invalid={errors.full_name ? "true" : "false"}
                      aria-describedby={errors.full_name ? "invite-name-error" : undefined}
                    />
                    {errors.full_name ? (
                      <ErrorNote id="invite-name-error" ink={ink}>
                        {errors.full_name}
                      </ErrorNote>
                    ) : null}
                  </FieldRow>

                  {/* i-2-0-1 */}
                  <FieldRow
                    num="02"
                    label="Password"
                    htmlFor="invite-password"
                    hint="At least 10 characters. Mix letters, numbers and a symbol."
                    ink={ink}
                    muted={muted}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        id="invite-password"
                        data-wf="i-2-0-1"
                        ref={passwordRef}
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={values.password}
                        disabled={busy || done}
                        onChange={(e) => setField("password", e.target.value)}
                        className="pms-input sm:max-w-[360px]"
                        style={{
                          border: fieldBorder(errors.password, ink),
                          borderRadius: brand.radius,
                        }}
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
                      <ErrorNote id="invite-password-error" ink={ink}>
                        {errors.password}
                      </ErrorNote>
                    ) : null}
                  </FieldRow>

                  {/* i-2-0-2 */}
                  <FieldRow
                    num="03"
                    label="Confirm password"
                    htmlFor="invite-confirm"
                    hint="Type it once more to be sure."
                    ink={ink}
                    muted={muted}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        id="invite-confirm"
                        data-wf="i-2-0-2"
                        ref={confirmRef}
                        name="confirm_password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={values.confirm}
                        disabled={busy || done}
                        onChange={(e) => setField("confirm", e.target.value)}
                        className="pms-input sm:max-w-[360px]"
                        style={{
                          border: fieldBorder(errors.confirm, ink),
                          borderRadius: brand.radius,
                        }}
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
                      <ErrorNote id="invite-confirm-error" ink={ink}>
                        {errors.confirm}
                      </ErrorNote>
                    ) : null}
                  </FieldRow>
                </div>

                {/* b-3-0 — primary action */}
                <div className="mt-8">
                  <button
                    data-wf="b-3-0"
                    type="submit"
                    disabled={busy || done}
                    className="pms-btn relative w-full overflow-hidden flex items-center justify-center gap-3 px-6 min-h-[56px] text-[14px] font-bold uppercase tracking-[0.2em] disabled:opacity-70 disabled:cursor-wait"
                    style={{
                      backgroundColor: ink,
                      color: bg,
                      border: "2px solid " + ink,
                      borderRadius: brand.radius,
                    }}
                  >
                    {busy ? "Creating account…" : done ? "Account created" : "Create account"}
                    {!busy ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
                    {busy ? (
                      <span
                        className="absolute left-0 bottom-0 h-[3px] w-1/4 pms-sweep"
                        style={{ backgroundColor: "var(--wash)" }}
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
                    <p className="text-[12px] leading-[1.6] max-w-[58ch]" style={{ color: muted }}>
                      By creating an account you join the workspace as a member with access to every
                      project and task.
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
            </React.Fragment>
          )}
        </div>
      </main>
    </div>
  );
}
