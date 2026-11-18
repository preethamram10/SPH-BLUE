import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../services/auth";

export interface AppointmentsSummaryData {
  total: number;
  waiting: number;
  inConsultation: number;
  collectFee: number;
  completed: number;
  optedFollowUp: number;
  notOptedFollowUp: number;
}

export interface ChangesData {
  maxUpdatedAt: string;
  count: number;
  version: string;
}

/**
 * Lightweight summary count hook: computes fast in DB (< 5ms)
 */
export function useAppointmentsSummary(branch: string | undefined, date: string | undefined) {
  const cleanBranch = (branch || "").replace(/Spiritual Homeopathy/gi, "").trim();

  return useQuery<AppointmentsSummaryData>({
    queryKey: ["appointments-summary", cleanBranch, date],
    queryFn: async () => {
      if (!cleanBranch || !date) {
        return {
          total: 0,
          waiting: 0,
          inConsultation: 0,
          collectFee: 0,
          completed: 0,
          optedFollowUp: 0,
          notOptedFollowUp: 0,
        };
      }
      const data = await apiFetch<any>(
        `/reception/appointments/summary?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(date)}`
      );
      if (data?.success && data?.summary) {
        return data.summary;
      }
      return {
        total: 0,
        waiting: 0,
        inConsultation: 0,
        collectFee: 0,
        completed: 0,
        optedFollowUp: 0,
        notOptedFollowUp: 0,
      };
    },
    enabled: !!cleanBranch && !!date,
    staleTime: 1000 * 60 * 10, // 10 minutes fresh
    gcTime: 1000 * 60 * 25,
    refetchOnWindowFocus: false,
  });
}

/**
 * Appointments list hook with branch + date caching
 */
export function useAppointmentsList(
  branch: string | undefined,
  date: string | undefined,
  options?: { enabled?: boolean; refetchInterval?: number | false }
) {
  const cleanBranch = (branch || "").replace(/Spiritual Homeopathy/gi, "").trim();

  return useQuery<any[]>({
    queryKey: ["appointments-list", cleanBranch, date],
    queryFn: async () => {
      if (!cleanBranch || !date) return [];
      const data = await apiFetch<any>(
        `/reception/appointments?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(date)}`
      );
      if (data?.success && Array.isArray(data?.appointments)) {
        return data.appointments;
      }
      return [];
    },
    enabled: options?.enabled !== false && !!cleanBranch && !!date,
    staleTime: 1000 * 60 * 10, // 10 minutes fresh (no unnecessary re-fetches on navigation)
    gcTime: 1000 * 60 * 25,
    refetchOnWindowFocus: false,
    refetchInterval: options?.refetchInterval ?? false,
  });
}

/**
 * Lightweight change-check fetcher (< 5ms)
 * Returns { maxUpdatedAt, count, version }
 */
export async function checkAppointmentsChanges(
  branch: string | undefined,
  date: string | undefined
): Promise<ChangesData | null> {
  const cleanBranch = (branch || "").replace(/Spiritual Homeopathy/gi, "").trim();
  if (!cleanBranch || !date) return null;
  try {
    const data = await apiFetch<any>(
      `/reception/changes?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(date)}`
    );
    if (data?.success) {
      return {
        maxUpdatedAt: data.maxUpdatedAt || "",
        count: data.count || 0,
        version: data.version || `${data.maxUpdatedAt}:${data.count}`,
      };
    }
  } catch (err) {
    console.warn("Failed to check appointments changes:", err);
  }
  return null;
}

/**
 * Pre-fetch helper to pre-warm cache for Yesterday / Tomorrow in the background
 */
export async function prefetchDateAppointments(queryClient: any, branch: string, date: string) {
  const cleanBranch = branch.replace(/Spiritual Homeopathy/gi, "").trim();
  if (!cleanBranch || !date) return;

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["appointments-summary", cleanBranch, date],
      queryFn: async () => {
        const data = await apiFetch<any>(
          `/reception/appointments/summary?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(date)}`
        );
        return data?.summary;
      },
      staleTime: 1000 * 60 * 10,
    }),
    queryClient.prefetchQuery({
      queryKey: ["appointments-list", cleanBranch, date],
      queryFn: async () => {
        const data = await apiFetch<any>(
          `/reception/appointments?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(date)}`
        );
        return data?.appointments || [];
      },
      staleTime: 1000 * 60 * 10,
    }),
  ]);
}
