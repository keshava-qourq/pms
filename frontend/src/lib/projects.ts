// react-query hooks for the live /projects and /tasks endpoints (US-003-3, US-006-3).
// Shapes follow docs/sdlc/architecture/api/openapi.yaml.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  created_by: string;
  created_at: string;
};

export type ProjectSummary = {
  project: Project;
  task_total: number;
  task_complete: number;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  owner_id?: string | null;
  due_date?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type ChecklistItem = {
  id: string;
  task_id: string;
  title: string;
  is_complete: boolean;
  position: number;
};

export type TaskLabel = {
  id: string;
  name: string;
  color?: string;
};

export type TaskDetail = {
  task: Task;
  comments: Comment[];
  checklist: ChecklistItem[];
  labels: TaskLabel[];
};

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<ProjectSummary[]>("/projects"),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => apiFetch<Project>(`/projects/${id}`),
    enabled: Boolean(id),
  });
}

export function useUpdateProject(id: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string; description?: string }) =>
      apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useProjectTasks(id: string | null) {
  return useQuery({
    queryKey: ["projects", id, "tasks"],
    queryFn: () => apiFetch<Task[]>(`/projects/${id}/tasks`),
    enabled: Boolean(id),
  });
}

export function useCreateTask(id: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title: string;
      description?: string;
      owner_id?: string | null;
      due_date?: string | null;
      status?: string;
    }) =>
      apiFetch<Task>(`/projects/${id}/tasks`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", id, "tasks"] });
    },
  });
}

// `projectId` may be null when the caller (e.g. the task detail screen) does
// not yet know which project the task belongs to; the project-tasks
// invalidation is then a no-op, but the single-task cache below still keeps
// list, board and detail in sync (AC-018/AC-019, NFR-007).
export function useUpdateTask(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      status?: string;
      owner_id?: string | null;
      due_date?: string | null;
      title?: string;
      description?: string;
    }) => apiFetch<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.id] });
    },
  });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => apiFetch<TaskDetail>(`/tasks/${id}`),
    enabled: Boolean(id),
  });
}

// -- Task detail: comments, checklist, labels (US-010-3) ----------------

export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: ["tasks", taskId, "comments"],
    queryFn: () => apiFetch<Comment[]>(`/tasks/${taskId}/comments`),
    enabled: Boolean(taskId),
  });
}

function invalidateTaskAndProjectTasks(
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: string | null,
  projectId: string | null,
) {
  queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
  queryClient.invalidateQueries({ queryKey: ["tasks", taskId, "comments"] });
  queryClient.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
}

export function useAddComment(taskId: string | null, projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch<Comment>(`/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => invalidateTaskAndProjectTasks(queryClient, taskId, projectId),
  });
}

export function useAddChecklistItem(taskId: string | null, projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) =>
      apiFetch<ChecklistItem>(`/tasks/${taskId}/checklist`, {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => invalidateTaskAndProjectTasks(queryClient, taskId, projectId),
  });
}

export function useToggleChecklistItem(taskId: string | null, projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_complete }: { id: string; is_complete: boolean }) =>
      apiFetch<ChecklistItem>(`/checklist/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_complete }),
      }),
    onSuccess: () => invalidateTaskAndProjectTasks(queryClient, taskId, projectId),
  });
}

export function useLabels() {
  return useQuery({
    queryKey: ["labels"],
    queryFn: () => apiFetch<TaskLabel[]>("/labels"),
  });
}

export function useAddLabel(taskId: string | null, projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (labelId: string) =>
      apiFetch(`/tasks/${taskId}/labels`, {
        method: "POST",
        body: JSON.stringify({ label_id: labelId }),
      }),
    onSuccess: () => invalidateTaskAndProjectTasks(queryClient, taskId, projectId),
  });
}

export function useRemoveLabel(taskId: string | null, projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (labelId: string) =>
      apiFetch(`/tasks/${taskId}/labels/${labelId}`, { method: "DELETE" }),
    onSuccess: () => invalidateTaskAndProjectTasks(queryClient, taskId, projectId),
  });
}
