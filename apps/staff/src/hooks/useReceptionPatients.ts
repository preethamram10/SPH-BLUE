import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../services/auth";

export interface PatientRecordData {
  id?: string;
  regId: string;
  name: string;
  phone: string;
  email?: string;
  diseases?: string;
  branch?: string;
  source?: string;
  subject?: string;
  totalVisits?: number;
  appointmentCount?: number;
  lastVisitDate?: string;
  lastDoctorName?: string;
  status?: string;
  createdAt?: string;
}

export interface PatientsResponse {
  patients: PatientRecordData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface SessionCountsData {
  TODAY?: number;
  YESTERDAY?: number;
  ALL?: number;
}

/**
 * Cached Patients Query Hook:
 * Caches by [branch, session, page, search] in memory.
 * Back-and-forth navigation renders in 0ms with zero loading spinners!
 */
export function useReceptionPatients(params: {
  branch?: string;
  session: "TODAY" | "YESTERDAY" | "ALL";
  page: number;
  pageSize?: number;
  search?: string;
}) {
  const cleanBranch = (params.branch || "").replace(/Spiritual Homeopathy/gi, "").trim();
  const searchTrim = (params.search || "").trim();
  const pageSize = params.pageSize || 25;

  return useQuery<PatientsResponse>({
    queryKey: ["reception-patients", cleanBranch, params.session, params.page, pageSize, searchTrim],
    queryFn: async () => {
      const qParams = new URLSearchParams({
        session: params.session,
        page: String(params.page),
        pageSize: String(pageSize),
      });
      if (cleanBranch) qParams.set("branch", cleanBranch);
      if (searchTrim) qParams.set("search", searchTrim);

      const data = await apiFetch<any>(`/reception/patients?${qParams.toString()}`);
      if (data?.success) {
        return {
          patients: data.patients || [],
          totalCount: data.totalCount || 0,
          totalPages: data.totalPages || 1,
          currentPage: data.currentPage || params.page,
          pageSize,
        };
      }
      return {
        patients: [],
        totalCount: 0,
        totalPages: 1,
        currentPage: params.page,
        pageSize,
      };
    },
    staleTime: 1000 * 60 * 3, // 3 minutes fresh
    gcTime: 1000 * 60 * 20, // 20 minutes in cache
  });
}

/**
 * Single ultra-fast session count hook (< 5ms on server)
 * Returns { TODAY, YESTERDAY, ALL } in ONE call
 */
export function usePatientSessionCounts(branch?: string) {
  const cleanBranch = (branch || "").replace(/Spiritual Homeopathy/gi, "").trim();

  return useQuery<SessionCountsData>({
    queryKey: ["reception-patients-summary", cleanBranch],
    queryFn: async () => {
      const q = cleanBranch ? `?summary=true&branch=${encodeURIComponent(cleanBranch)}` : `?summary=true`;
      const data = await apiFetch<any>(`/reception/patients${q}`);
      if (data?.success && data?.counts) {
        return data.counts;
      }
      return { TODAY: 0, YESTERDAY: 0, ALL: 0 };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    gcTime: 1000 * 60 * 20,
  });
}
