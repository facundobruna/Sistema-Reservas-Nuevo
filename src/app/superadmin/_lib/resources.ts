import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  suspendedAt: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  trialEndsAt: string | null;
};

export type TenantDetail = {
  restaurant: {
    id: string;
    slug: string;
    name: string;
    suspendedAt: string | null;
    settings: { featureFlags?: Record<string, boolean> };
  };
  subscription: {
    status: SubscriptionStatus;
    mpPreapprovalId: string | null;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  } | null;
};

export type SuperadminStats = { mrr: number; activeSubscriptions: number; signups: number; cancellations: number };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1/superadmin${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request_failed_${res.status}`);
  }
  return res.json();
}

export const useTenants = () =>
  useQuery({ queryKey: ["superadmin-tenants"], queryFn: () => api<{ tenants: Tenant[] }>("/tenants") });

export const useTenantDetail = (id: string) =>
  useQuery({ queryKey: ["superadmin-tenant", id], queryFn: () => api<TenantDetail>(`/tenants/${id}`) });

export const useSuperadminStats = (from: string, to: string) =>
  useQuery({
    queryKey: ["superadmin-stats", from, to],
    queryFn: () => api<{ stats: SuperadminStats }>(`/stats?from=${from}&to=${to}`),
  });

export const useSuspendTenant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/tenants/${id}/suspend`, { method: "POST" }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["superadmin-tenants"] });
      qc.invalidateQueries({ queryKey: ["superadmin-tenant", id] });
    },
  });
};

export const useReactivateTenant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/tenants/${id}/reactivate`, { method: "POST" }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["superadmin-tenants"] });
      qc.invalidateQueries({ queryKey: ["superadmin-tenant", id] });
    },
  });
};

export const useImpersonateTenant = () =>
  useMutation({
    mutationFn: (id: string) => api<{ slug: string }>(`/tenants/${id}/impersonate`, { method: "POST" }),
  });

export const useToggleFeatureFlag = (tenantId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { flag: string; enabled: boolean }) =>
      api(`/tenants/${tenantId}/feature-flags`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["superadmin-tenant", tenantId] }),
  });
};
