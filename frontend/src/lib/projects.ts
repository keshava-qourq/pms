// react-query hooks for the live /projects and /tasks endpoints (US-003-3).
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
    }) => apiFetch<Task>(`/projects/${id}/tasks`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", id, "tasks"] });
    },
  });
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
    },
  });
}
