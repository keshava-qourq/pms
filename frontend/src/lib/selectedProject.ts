// Routing in this app has no `/project/:id` param (see lib/navigate.ts and
// App.tsx), so the Projects overview records which project was opened here
// before navigating, and the Project screen reads it back on mount.
const KEY = "pms.selected-project-id";

export function setSelectedProjectId(id: string): void {
  sessionStorage.setItem(KEY, id);
}

export function getSelectedProjectId(): string | null {
  return sessionStorage.getItem(KEY);
}
