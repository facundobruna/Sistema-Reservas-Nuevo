import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `request_failed_${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useResourceList<T>(key: string, path: string) {
  return useQuery({ queryKey: [key], queryFn: () => api<T>(path) });
}

export function useCreateResource<TInput, TOutput = unknown>(key: string, path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => api<TOutput>(path, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}

export function useUpdateResource<TInput extends { id: string }, TOutput = unknown>(
  key: string,
  basePath: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: TInput) =>
      api<TOutput>(`${basePath}/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}

export function useDeleteResource(key: string, basePath: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`${basePath}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}
