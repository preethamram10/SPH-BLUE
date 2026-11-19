"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarDays,
  IndianRupee,
  Layers,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Building2,
  CalendarRange,
  ChevronDown,
  AlertCircle,
  BarChart2,
  Calculator,
} from "lucide-react";

export interface MonthSpreadRow {
  index: number;
  monthLabel: string;
  calendarMonth?: string;
  amount: number;
  plans: number;
}

export interface MonthSpreadData {
  branch: string;
  cohort: string;
  view: "plan" | "calendar";
  rows: MonthSpreadRow[];
  grandTotal: number;
  monthsCount: number;
  patientMonths: number;
  avgPerMonth: number | null;
  avgPerPatientMonth: number | null;
}

export interface MonthlyFeeSpreadPanelProps {
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
    maximumFractionDigits: 2,
  }).format(val);
}

export default function MonthlyFeeSpreadPanel({
  initialBranch = "ALL",
  allowBranchChange = true,
  embedded = false,
  title = "Monthly Fee Spread & Plan-Month Averages",
  subtitle = "Fees spread equally across plan months (N) with average revenue per month & per patient-month",
}: MonthlyFeeSpreadPanelProps) {
  const currentMonth = getISTCurrentMonth();
  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const [viewMode, setViewMode] = useState<"plan" | "calendar">("plan");
  const [periodPreset, setPeriodPreset] = useState<"THIS_MONTH" | "LAST_MONTH" | "LAST_3_MONTHS" | "CUSTOM">("THIS_MONTH");
  const [fromCohort, setFromCohort] = useState(currentMonth);
  const [toCohort, setToCohort] = useState(currentMonth);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spreadData, setSpreadData] = useState<MonthSpreadData | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const cacheRef = useRef<{ key: string; time: number; data: MonthSpreadData | null }>({
    key: "",
    time: 0,
    data: null,
  });

  const updatePeriod = (preset: "THIS_MONTH" | "LAST_MONTH" | "LAST_3_MONTHS" | "CUSTOM") => {
    setPeriodPreset(preset);
    const curr = getISTCurrentMonth();
    if (preset === "THIS_MONTH") {
      setFromCohort(curr);
      setToCohort(curr);
    } else if (preset === "LAST_MONTH") {
      const last = getRelativeMonth(-1);
      setFromCohort(last);
      setToCohort(last);
    } else if (preset === "LAST_3_MONTHS") {
      const threeAgo = getRelativeMonth(-2);
      setFromCohort(threeAgo);
      setToCohort(curr);
    }
  };

  const fetchSpreadData = useCallback(
    async (ignoreCache = false) => {
      const cacheKey = `${selectedBranch}__${fromCohort}__${toCohort}__${viewMode}`;
      const now = Date.now();
      const STALE_TIME_MS = 60 * 1000;

      if (!ignoreCache && cacheRef.current.key === cacheKey && now - cacheRef.current.time < STALE_TIME_MS && cacheRef.current.data) {
        setSpreadData(cacheRef.current.data);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          branch: selectedBranch,
          from: fromCohort,
          to: toCohort,
          view: viewMode,
        });

        const endpoint =
          selectedBranch === "ALL" || allowBranchChange
            ? `/api/admin/month-spread?${queryParams.toString()}`
            : `/api/reception/month-spread?${queryParams.toString()}`;

        const res = await fetch(endpoint);
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.error || "Failed to load month spread data");
        }

        const data: MonthSpreadData = json.data;
        setSpreadData(data);
        setLastRefreshedAt(new Date());

        cacheRef.current = {
          key: cacheKey,
          time: Date.now(),
          data,
        };
      } catch (err: any) {
        console.error("Failed fetching month spread:", err);
        setError(err?.message || "Failed to load data. Please retry.");
      } finally {
        setLoading(false);
      }
    },
    [selectedBranch, fromCohort, toCohort, viewMode, allowBranchChange]
  );

  useEffect(() => {
    fetchSpreadData();
  }, [fetchSpreadData]);

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - cacheRef.current.time >= 60 * 1000) {
        fetchSpreadData(false);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchSpreadData]);

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
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
              <Calculator className="w-4 h-4 text-emerald-700" />
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

        {/* Filter & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: Plan-Month View vs Calendar View */}
          <div className="inline-flex rounded-lg border border-emerald-200 p-0.5 bg-emerald-50/50">
            <button
              type="button"
              onClick={() => setViewMode("plan")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                viewMode === "plan"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-emerald-900 hover:text-emerald-950"
              }`}
            >
              Plan-Month View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                viewMode === "calendar"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-emerald-900 hover:text-emerald-950"
              }`}
            >
              Calendar Projection
            </button>
          </div>

          {/* Branch Selector */}
          {allowBranchChange && (
            <div className="relative">
              <select
                aria-label="Select Branch for monthly spread"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="appearance-none pl-8 pr-8 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
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

          {/* Custom Date Inputs */}
          {periodPreset === "CUSTOM" && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                aria-label="From Cohort Month"
                value={fromCohort}
                onChange={(e) => setFromCohort(e.target.value)}
                className="text-xs bg-transparent text-slate-700 font-semibold focus:outline-hidden cursor-pointer"
              />
              <span>to</span>
              <input
                type="month"
                aria-label="To Cohort Month"
                value={toCohort}
                onChange={(e) => setToCohort(e.target.value)}
                className="text-xs bg-transparent text-slate-700 font-semibold focus:outline-hidden cursor-pointer"
              />
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchSpreadData(true)}
            disabled={loading}
            title="Refresh month spread"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
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
            onClick={() => fetchSpreadData(true)}
            className="font-bold underline hover:text-rose-900 text-xs ml-2 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Key Summary Indicator Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3.5 mt-4">
        {/* Grand Total */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white rounded-xl border border-emerald-200/80 p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Grand Total Fees</span>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-700 border border-emerald-200">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-lg md:text-xl font-extrabold text-slate-900 font-mono">
              {loading ? "–" : formatINR(spreadData?.grandTotal)}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              Exact sum of all plan fee shares
            </div>
          </div>
        </div>

        {/* Active Months & Patient Months */}
        <div className="bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-white rounded-xl border border-sky-200/80 p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Total Patient-Months</span>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-sky-100 text-sky-700 border border-sky-200">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-lg md:text-xl font-extrabold text-slate-900 font-mono">
              {loading ? "–" : spreadData?.patientMonths ?? "–"}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              Sum of duration N ({spreadData?.monthsCount || 0} active months)
            </div>
          </div>
        </div>

        {/* ADD-ON 1: Avg / Month */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-xl border border-amber-200/80 p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Avg / Month</span>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-100 text-amber-700 border border-amber-200">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-lg md:text-xl font-extrabold text-amber-900 font-mono">
              {loading ? "–" : spreadData?.avgPerMonth !== null && spreadData?.avgPerMonth !== undefined ? formatINR(spreadData.avgPerMonth) : "–"}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              Grand total ÷ Active months ({spreadData?.monthsCount || 0})
            </div>
          </div>
        </div>

        {/* ADD-ON 2: Avg / Patient-Month */}
        <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white rounded-xl border border-purple-200/80 p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Avg / Patient-Month</span>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-purple-100 text-purple-700 border border-purple-200">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-lg md:text-xl font-extrabold text-purple-900 font-mono">
              {loading ? "–" : spreadData?.avgPerPatientMonth !== null && spreadData?.avgPerPatientMonth !== undefined ? formatINR(spreadData.avgPerPatientMonth) : "–"}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              Grand total ÷ Total patient-months ({spreadData?.patientMonths || 0})
            </div>
          </div>
        </div>
      </div>

      {/* Month Spread Breakdown Table (Month 1..Month N) */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              {viewMode === "plan" ? "Equal Plan-Month Allocation (Month 1..N)" : "Calendar Month Revenue Projection"}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            {viewMode === "plan"
              ? "Each fee is split equally across N months (leftover paise in Month 1)"
              : "Expected revenue landing in each calendar month"}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">{viewMode === "plan" ? "Plan Month" : "Calendar Month"}</th>
                <th className="py-2.5 px-3 text-right">Contributing Plans</th>
                <th className="py-2.5 px-3 text-right">Spread Share Amount</th>
                <th className="py-2.5 px-3 text-right">% of Grand Total</th>
                <th className="py-2.5 px-3">Visual Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {spreadData?.rows && spreadData.rows.length > 0 ? (
                spreadData.rows.map((row) => {
                  const pct =
                    spreadData.grandTotal > 0
                      ? Math.round((row.amount / spreadData.grandTotal) * 100)
                      : 0;
                  return (
                    <tr key={row.index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-mono text-[11px] font-bold">
                          {row.index}
                        </span>
                        <span>{row.monthLabel}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {row.plans}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatINR(row.amount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {pct}%
                      </td>
                      <td className="py-2 px-3 w-40">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No plan records found for this cohort period.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Table Footer with Grand Total & The Two Averages */}
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900 divide-y divide-slate-200">
              <tr>
                <td className="py-2.5 px-3 font-extrabold text-slate-900">Grand Total</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                  {spreadData?.rows.reduce((s, r) => s + r.plans, 0) ?? 0}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-sm">
                  {formatINR(spreadData?.grandTotal)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">100%</td>
                <td className="py-2.5 px-3"></td>
              </tr>
              <tr className="bg-amber-50/50 text-amber-900">
                <td className="py-2 px-3 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
                  <span>Avg / Month (Grand Total ÷ {spreadData?.monthsCount || 0} active months)</span>
                </td>
                <td colSpan={2} className="py-2 px-3 text-right font-mono font-extrabold text-amber-900 text-sm">
                  {spreadData?.avgPerMonth !== null && spreadData?.avgPerMonth !== undefined
                    ? formatINR(spreadData.avgPerMonth)
                    : "–"}
                </td>
                <td colSpan={2} className="py-2 px-3 text-xs text-amber-700 font-medium">
                  Equal monthly share across active duration indices
                </td>
              </tr>
              <tr className="bg-purple-50/50 text-purple-900">
                <td className="py-2 px-3 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                  <span>Avg / Patient-Month (Grand Total ÷ {spreadData?.patientMonths || 0} patient-months)</span>
                </td>
                <td colSpan={2} className="py-2 px-3 text-right font-mono font-extrabold text-purple-900 text-sm">
                  {spreadData?.avgPerPatientMonth !== null && spreadData?.avgPerPatientMonth !== undefined
                    ? formatINR(spreadData.avgPerPatientMonth)
                    : "–"}
                </td>
                <td colSpan={2} className="py-2 px-3 text-xs text-purple-700 font-medium">
                  Total revenue per patient per month of care
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer info */}
      {lastRefreshedAt && (
        <div className="mt-3 flex items-center justify-between text-[10.5px] text-slate-400 pt-2 border-t border-slate-100">
          <span>
            Cohort: <strong className="text-slate-600 font-semibold">{fromCohort}</strong> to{" "}
            <strong className="text-slate-600 font-semibold">{toCohort}</strong> (IST)
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
