import { NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { Icons } from "@/lib/icons";
import SignIn from "@/screens/SignIn";
import AcceptInvite from "@/screens/AcceptInvite";
import Projects from "@/screens/Projects";
import Project from "@/screens/Project";
import Task from "@/screens/Task";
import Team from "@/screens/Team";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-2 rounded-[var(--brand-radius)] px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-[var(--brand-hover)] text-[var(--brand-fg)]" : "text-[var(--brand-fg-muted)]",
  ].join(" ");

// The app's menu, drawn around every screen except the ones routed outside it below.
function AppShellLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="border-b"
        style={{
          backgroundColor: "var(--brand-surface)",
          borderColor: "var(--brand-border)",
        }}
      >
        <div className="flex items-center gap-6 px-6 py-2">
          <p
            className="shrink-0 text-sm font-semibold"
            style={{ fontFamily: "var(--brand-font-heading)" }}
          >
            {"PMS"}
          </p>
          <nav aria-label="App menu" className="flex flex-wrap items-center gap-1">
            <NavLink to="/projects" className={navLinkClass}>
              <Icons.Home size={16} />
              {"Projects"}
            </NavLink>
            <NavLink to="/team" className={navLinkClass}>
              <Icons.User size={16} />
              {"Team"}
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShellLayout />}>
        <Route path="/projects" element={<Projects />} />
        <Route path="/project" element={<Project />} />
        <Route path="/task" element={<Task />} />
        <Route path="/team" element={<Team />} />
      </Route>
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="*" element={<Navigate to="/sign-in" replace />} />
    </Routes>
  );
}
