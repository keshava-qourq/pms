// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { login } from "@/lib/auth";

const { Check, AlertCircle, CheckCircle } = Icons;

const PRODUCT = "PMS";
const mix = (colour, percent) => `color-mix(in srgb, ${colour} ${percent}%, transparent)`;

// The sign-in and accept-invite screens are strictly black / white / greyscale:
// no hue-bearing colour (the former `brand.accentColor` blue) is used anywhere
// on these two screens. Every "emphasis" that used to be carried by colour is
// now carried by contrast (solid fills) and typography (weight, case, rules).
export default function Screen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [status, setStatus] = React.useState("idle"); // idle | checking | error | success
  const [fieldError, setFieldError] = React.useState({ email: "", password: "" });
  const [signedInName, setSignedInName] = React.useState("");

  const emailRef = React.useRef(null);
  const passwordRef = React.useRef(null);
  const timer = React.useRef(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const rule = `2px solid ${brand.primaryColor}`;
  const field = {
    border: rule,
    borderRadius: brand.radius,
    height: 44,
    "--tw-ring-color": brand.primaryColor,
    "--tw-ring-offset-width": "2px",
  };

  const busy = status === "checking";
  const done = status === "success";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = email.trim();
    const next = {
      email: !trimmed
        ? "Enter the work email your invitation was sent to."
        : /.+@.+\..+/.test(trimmed)
          ? ""
          : "That is not a full email address — include the domain, like meridian.works.",
      password: password ? "" : "Enter your password.",
    };
    setFieldError(next);
    if (next.email || next.password) {
      setStatus("idle");
      if (next.email) {
        if (emailRef.current) emailRef.current.focus();
      } else if (passwordRef.current) {
        passwordRef.current.focus();
      }
      return;
    }
    setStatus("checking");
    try {
      const user = await login(trimmed, password);
      setSignedInName((user && (user.name || user.email)) || trimmed);
      setStatus("success");
      const from =
        location.state && location.state.from ? location.state.from.pathname : "/projects";
      timer.current = setTimeout(() => navigate(from, { replace: true }), 650);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-white"
      style={{
        color: brand.primaryColor,
        fontFamily: brand.fontBody,
        backgroundColor: brand.backgroundColor,
      }}
    >
      <style>{`
        @keyframes pmsRise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes pmsTick { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        .pms-rise { animation: pmsRise 160ms ease-out both; }
        .pms-tick { animation: pmsTick 900ms linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pms-rise, .pms-tick { animation: none !important; }
        }
      `}</style>

      <header
        className="flex items-center justify-between px-6 py-5 md:px-10"
        style={{ borderBottom: rule }}
      >
        <p className="text-lg font-bold tracking-tight" style={{ fontFamily: brand.fontHeading }}>
          {PRODUCT}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
          Invite-only workspace
        </p>
      </header>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-[440px_minmax(0,1fr)]">
        <main
          className="flex flex-col justify-center px-6 py-12 md:border-r-0 md:px-10"
          style={{ borderRight: rule }}
        >
          <h1
            data-wf="b-0-0"
            className="text-4xl font-bold tracking-tight"
            style={{ fontFamily: brand.fontHeading }}
          >
            Sign in to {PRODUCT}
          </h1>

          <p
            data-wf="b-1-0"
            className="mt-3 max-w-[38ch] text-sm leading-relaxed"
            style={{ color: brand.neutralColor }}
          >
            Sign in with your work email to reach the team's projects and tasks.
          </p>

          <form data-wf="b-2-0" className="mt-10 space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <label
                htmlFor="pms-email"
                className="block text-[11px] font-bold uppercase tracking-[0.16em]"
              >
                Email address
              </label>
              <input
                data-wf="i-2-0-0"
                id="pms-email"
                ref={emailRef}
                type="email"
                name="email"
                autoComplete="email"
                spellCheck={false}
                disabled={done}
                aria-invalid={fieldError.email ? true : undefined}
                aria-describedby={fieldError.email ? "pms-email-error" : undefined}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                className="w-full bg-white px-3 text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60"
                style={{
                  ...field,
                  border: `${fieldError.email ? 3 : 2}px solid ${brand.primaryColor}`,
                }}
              />
              {fieldError.email ? (
                <p
                  id="pms-email-error"
                  className="pms-rise text-xs font-bold uppercase tracking-wide"
                  style={{ color: brand.primaryColor }}
                >
                  {fieldError.email}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="pms-password"
                className="block text-[11px] font-bold uppercase tracking-[0.16em]"
              >
                Password
              </label>
              <input
                data-wf="i-2-0-1"
                id="pms-password"
                ref={passwordRef}
                type="password"
                name="password"
                autoComplete="current-password"
                disabled={done}
                aria-invalid={fieldError.password ? true : undefined}
                aria-describedby={fieldError.password ? "pms-password-error" : undefined}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                className="w-full bg-white px-3 text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60"
                style={{
                  ...field,
                  border: `${fieldError.password ? 3 : 2}px solid ${brand.primaryColor}`,
                }}
              />
              {fieldError.password ? (
                <p
                  id="pms-password-error"
                  className="pms-rise text-xs font-bold uppercase tracking-wide"
                  style={{ color: brand.primaryColor }}
                >
                  {fieldError.password}
                </p>
              ) : null}
            </div>

            <button
              data-wf="b-3-0"
              type="submit"
              disabled={busy || done}
              aria-busy={busy || undefined}
              className="flex h-11 w-full items-center justify-center gap-3 text-sm font-bold uppercase tracking-[0.16em] text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 active:opacity-80 disabled:opacity-70"
              style={{
                backgroundColor: brand.primaryColor,
                borderRadius: brand.radius,
                "--tw-ring-color": brand.primaryColor,
              }}
            >
              {busy ? (
                <React.Fragment>
                  <span
                    aria-hidden
                    className="pms-tick h-2 w-2"
                    style={{ backgroundColor: "#ffffff" }}
                  />
                  Checking credentials
                </React.Fragment>
              ) : done ? (
                <React.Fragment>
                  <Check aria-hidden className="h-4 w-4" />
                  Signed in
                </React.Fragment>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div data-wf="b-4-0" aria-live="polite" className="mt-5 min-h-[56px]">
            {status === "error" ? (
              <p
                role="alert"
                className="pms-rise flex items-start gap-3 px-4 py-3 text-sm font-bold"
                style={{
                  backgroundColor: brand.primaryColor,
                  color: "#ffffff",
                  borderRadius: brand.radius,
                }}
              >
                <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="mr-1.5 uppercase tracking-[0.14em]">Sign-in failed.</span>
                  Those credentials are invalid. Check your email and password and try again.
                </span>
              </p>
            ) : status === "success" ? (
              <p
                role="status"
                className="pms-rise flex items-start gap-3 px-4 py-3 text-sm font-semibold"
                style={{ border: rule, borderRadius: brand.radius }}
              >
                <CheckCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Signed in as {signedInName}. Opening the projects overview…</span>
              </p>
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: brand.neutralColor }}>
                Locked out or no account yet? An administrator invites new members by email.
              </p>
            )}
          </div>
        </main>

        <section
          aria-hidden
          className="hidden flex-col justify-between px-10 py-12 md:flex"
          style={{ borderLeft: rule }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: brand.neutralColor }}
          >
            Projects · Tasks · Board
          </p>
          <div>
            <p
              className="text-[120px] font-bold leading-none tracking-tighter lg:text-[180px]"
              style={{ fontFamily: brand.fontHeading }}
            >
              {PRODUCT}
            </p>
            <div className="mt-6 flex items-center gap-3 pt-4" style={{ borderTop: rule }}>
              <span className="h-3 w-3" style={{ backgroundColor: brand.primaryColor }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
                Meridian Works internal tooling
              </span>
            </div>
            <div className="mt-6 flex gap-1">
              {[18, 44, 10, 32, 60, 24, 8, 40, 16].map((h, i) => (
                <span
                  key={i}
                  className="w-3"
                  style={{
                    height: h,
                    backgroundColor:
                      i === 4 ? brand.primaryColor : mix(brand.primaryColor, 16),
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
