// Routing in this app has no `/task/:id` param (see lib/navigate.ts and
// App.tsx), so the Project screen records which task was opened here before
// navigating, and the Task screen reads it back on mount. Mirrors
// lib/selectedProject.ts.
const KEY = "pms.selected-task-id";

export function setSelectedTaskId(id: string): void {
  sessionStorage.setItem(KEY, id);
}

export function getSelectedTaskId(): string | null {
  return sessionStorage.getItem(KEY);
}
