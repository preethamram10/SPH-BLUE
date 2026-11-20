"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  IndianRupee,
  Calendar,
  Clock,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Building2,
  CalendarRange,
  ChevronDown,
  AlertCircle,
  BarChart3,
} from "lucide-react";

export interface BranchMetrics {
  branch: string;
  fromMonth: string;
  toMonth: string;
  patients: number;
  revenue: number;
  months: number;
  avgDuration: number | null;
  arpu: number | null;
  monthlyRate: number | null;
}

export interface BranchRevenueQualityPanelProps {
  initialBranch?: string;
  allowBranchChange?: boolean;
  embedded?: boolean;
  title?: string;
  subtitle?: string;
}

const BRANCHES = [
  { id: "ALL", label: "All Branches" },
  { id: "KPHB Branch", label: "KPHB Branch" },
  { id: "Chandanagar Branch", label: "Chandanagar Branch" },
  { id: "Nallagandla Branch", label: "Nallagandla Branch" },
  { id: "Dilshuknagar Branch", label: "Dilshuknagar Branch" },
];

function getISTCurrentMonth(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    if (year && month) return `${year}-${month}`;
  } catch {}
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getRelativeMonth(offsetMonths: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "–";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatMonths(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "–";
  return `${Number(val.toFixed(1))} mos`;
}

export function formatPatients(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "–";
  return new Intl.NumberFormat("en-IN").format(val);
}

export default function BranchRevenueQualityPanel({
  initialBranch = "ALL",
  allowBranchChange = true,
  embedded = false,
  title = "Average Revenue & Quality Panel",
  subtitle = "Real-time branch unit economics, patient value & treatment duration analytics",
}: BranchRevenueQualityPanelProps) {
  const currentMonth = getISTCurrentMonth();
  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const [periodPreset, setPeriodPreset] = useState<"THIS_MONTH" | "LAST_MONTH" | "LAST_3_MONTHS" | "CUSTOM">("THIS_MONTH");
  const [fromMonth, setFromMonth] = useState(currentMonth);
  const [toMonth, setToMonth] = useState(currentMonth);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<BranchMetrics | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, BranchMetrics> | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Cache tracker to avoid spamming requests
  const cacheRef = useRef<{ key: string; time: number; data: any; breakdown?: any }>({
    key: "",
    time: 0,
    data: null,
  });

  const updatePeriod = (preset: "THIS_MONTH" | "LAST_MONTH" | "LAST_3_MONTHS" | "CUSTOM") => {
    setPeriodPreset(preset);
    const curr = getISTCurrentMonth();
    if (preset === "THIS_MONTH") {
      setFromMonth(curr);
      setToMonth(curr);
    } else if (preset === "LAST_MONTH") {
      const last = getRelativeMonth(-1);
      setFromMonth(last);
      setToMonth(last);
    } else if (preset === "LAST_3_MONTHS") {
      const threeAgo = getRelativeMonth(-2);
      setFromMonth(threeAgo);
      setToMonth(curr);
    }
  };

  const fetchMetrics = useCallback(
    async (ignoreCache = false) => {
      const cacheKey = `${selectedBranch}__${fromMonth}__${toMonth}`;
      const now = Date.now();
      const STALE_TIME_MS = 60 * 1000; // 60 seconds

      if (
        !ignoreCache &&
        cacheRef.current.key === cacheKey &&
        now - cacheRef.current.time < STALE_TIME_MS &&
        cacheRef.current.data
      ) {
        setMetrics(cacheRef.current.data);
        if (cacheRef.current.breakdown) setBreakdown(cacheRef.current.breakdown);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          branch: selectedBranch,
          from: fromMonth,
          to: toMonth,
        });

        // Use admin endpoint for multi-branch support, or reception endpoint
        const endpoint =
          selectedBranch === "ALL" || allowBranchChange
            ? `/api/admin/branch-metrics?${queryParams.toString()}`
            : `/api/reception/branch-metrics?${queryParams.toString()}`;

        const res = await fetch(endpoint);
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.error || "Failed to load branch metrics");
        }

        const data: BranchMetrics = json.data;
        const brk = json.branches || null;

        setMetrics(data);
        setBreakdown(brk);
        setLastRefreshedAt(new Date());

        cacheRef.current = {
          key: cacheKey,
          time: Date.now(),
          data,
          breakdown: brk,
        };
      } catch (err: any) {
        console.error("Failed fetching revenue metrics:", err);
        setError(err?.message || "Failed to load metrics. Please retry.");
      } finally {
        setLoading(false);
      }
    },
    [selectedBranch, fromMonth, toMonth, allowBranchChange]
  );

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Window focus refetch (staleTime 60s)
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - cacheRef.current.time >= 60 * 1000) {
        fetchMetrics(false);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchMetrics]);

  // Metric cards definitions
  const metricCards = [
    {
      id: "treated_patients",
      title: "Total No. of Patients",
      subtitle: "Unique patients receiving care in period",
      value: loading ? "–" : formatPatients(metrics?.patients),
      unit: "patients",
      icon: Users,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      accent: "from-blue-500/10 to-indigo-500/5",
    },
    {
      id: "total_revenue",
      title: "Total Revenue",
      subtitle: "Consultation + medicine + package fees",
      value: loading ? "–" : formatINR(metrics?.revenue),
      unit: "rupees",
      icon: IndianRupee,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      accent: "from-emerald-500/10 to-teal-500/5",
    },
    {
      id: "total_months",
      title: "Total Months",
      subtitle: "Sum of course & follow-up durations",
      value: loading ? "–" : formatMonths(metrics?.months),
      unit: "duration",
      icon: Calendar,
      color: "text-violet-600 bg-violet-50 border-violet-200",
      accent: "from-violet-500/10 to-purple-500/5",
    },
    {
      id: "avg_duration",
      title: "Avg Duration",
      subtitle: "Total Months ÷ Total Patients",
      value: loading ? "–" : metrics?.avgDuration !== null && metrics?.avgDuration !== undefined ? `${metrics.avgDuration.toFixed(1)} mos` : "–",
      unit: "per patient",
      icon: Clock,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      accent: "from-amber-500/10 to-orange-500/5",
    },
    {
      id: "arpu",
      title: "Avg per Patient (ARPU)",
      subtitle: "Total Revenue ÷ Total Patients",
      value: loading ? "–" : metrics?.arpu !== null && metrics?.arpu !== undefined ? formatINR(metrics.arpu) : "–",
      unit: "per patient",
      icon: TrendingUp,
      color: "text-sky-600 bg-sky-50 border-sky-200",
      accent: "from-sky-500/10 to-blue-500/5",
    },
    {
      id: "monthly_rate",
      title: "Average per Month",
      subtitle: "Total Revenue ÷ Total Months",
      value: loading ? "–" : metrics?.monthlyRate !== null && metrics?.monthlyRate !== undefined ? `${formatINR(metrics.monthlyRate)}/mo` : "–",
      unit: "per month",
      icon: Sparkles,
      color: "text-rose-600 bg-rose-50 border-rose-200",
      accent: "from-rose-500/10 to-pink-500/5",
    },
  ];

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-xs transition-all overflow-hidden ${
        embedded ? "p-3.5 md:p-4" : "p-4 md:p-6"
      }`}
    >
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0284c7] flex items-center justify-center font-bold shadow-2xs">
              <TrendingUp className="w-4 h-4 text-[#0284c7]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{title}</span>
                {selectedBranch !== "ALL" && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedBranch}
                  </span>
                )}
              </h2>
              {!embedded && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Selector (if allowed) */}
          {allowBranchChange && (
            <div className="relative">
              <select
                aria-label="Select Branch"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="appearance-none pl-8 pr-8 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition-all cursor-pointer"
              >
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          )}

          {/* Period Presets */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50/80">
            <button
              type="button"
              onClick={() => updatePeriod("THIS_MONTH")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                periodPreset === "THIS_MONTH"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => updatePeriod("LAST_MONTH")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                periodPreset === "LAST_MONTH"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => updatePeriod("LAST_3_MONTHS")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                periodPreset === "LAST_3_MONTHS"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Last 3 Mos
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("CUSTOM")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                periodPreset === "CUSTOM"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Month Range Inputs (when CUSTOM is active) */}
          {periodPreset === "CUSTOM" && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                aria-label="From Month"
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
                className="text-xs bg-transparent text-slate-700 font-semibold focus:outline-hidden cursor-pointer"
              />
              <span>to</span>
              <input
                type="month"
                aria-label="To Month"
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
                className="text-xs bg-transparent text-slate-700 font-semibold focus:outline-hidden cursor-pointer"
              />
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchMetrics(true)}
            disabled={loading}
            title="Refresh metrics"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="my-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-700 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchMetrics(true)}
            className="font-bold underline hover:text-rose-900 text-xs ml-2 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 6 Quality Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-3.5 mt-4">
        {metricCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.id}
              className={`relative bg-gradient-to-br ${card.accent} to-white rounded-xl border border-slate-200/80 p-3 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-600 tracking-tight">
                    {card.title}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border ${card.color} shadow-2xs`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="mt-1">
                  <div className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {card.value}
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100/80 text-[10px] text-slate-400 font-medium leading-tight">
                {card.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-Branch Comparison Table (when ALL branches selected and not in compact mode) */}
      {selectedBranch === "ALL" && breakdown && !embedded && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                Branch-by-Branch Comparison ({fromMonth === toMonth ? fromMonth : `${fromMonth} to ${toMonth}`})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              *Treated patients sum across branches may exceed distinct total due to multi-branch visits
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3 text-right">Total No. of Patients</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  <th className="py-2.5 px-3 text-right">Total Months</th>
                  <th className="py-2.5 px-3 text-right">Avg Duration</th>
                  <th className="py-2.5 px-3 text-right">Avg per Patient (ARPU)</th>
                  <th className="py-2.5 px-3 text-right">Average per Month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {Object.entries(breakdown).map(([branchKey, b]) => (
                  <tr key={branchKey} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-900">{b.branch}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {formatPatients(b.patients)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                      {formatINR(b.revenue)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {formatMonths(b.months)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {b.avgDuration !== null ? `${b.avgDuration.toFixed(1)} mos` : "–"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-sky-700 font-semibold">
                      {b.arpu !== null ? formatINR(b.arpu) : "–"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-rose-700 font-semibold">
                      {b.monthlyRate !== null ? `${formatINR(b.monthlyRate)}/mo` : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                <tr>
                  <td className="py-2.5 px-3">All Branches (Distinct Total)</td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-700">
                    {formatPatients(metrics?.patients)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    {formatINR(metrics?.revenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-violet-700">
                    {formatMonths(metrics?.months)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                    {metrics?.avgDuration !== null ? `${metrics?.avgDuration.toFixed(1)} mos` : "–"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-sky-700">
                    {metrics?.arpu !== null ? formatINR(metrics?.arpu) : "–"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                    {metrics?.monthlyRate !== null ? `${formatINR(metrics?.monthlyRate)}/mo` : "–"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Footer / Timestamps */}
      {lastRefreshedAt && (
        <div className="mt-3 flex items-center justify-between text-[10.5px] text-slate-400 pt-2 border-t border-slate-100">
          <span>
            Period: <strong className="text-slate-600 font-semibold">{fromMonth}</strong> to{" "}
            <strong className="text-slate-600 font-semibold">{toMonth}</strong> (IST)
          </span>
          <span>
            Last updated:{" "}
            {lastRefreshedAt.toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}{" "}
            IST
          </span>
        </div>
      )}
    </div>
  );
}
