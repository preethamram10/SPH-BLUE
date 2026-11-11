"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Sparkles,
  RefreshCw,
  Activity,
  ArrowUpRight,
  Layers,
  Stethoscope,
} from "lucide-react";

export interface TransactionRecord {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  branchName: string;
  doctorName: string;
  revenueSplit: string;
  source: string;
  consultationFee: number;
  medicineFee: number;
  packageFee: number;
  totalAmount: number;
  paymentMethod: "cash" | "upi" | "card" | "split";
  splitDetails?: { cash?: number; upi?: number; card?: number; counterUpi?: number };
  timestamp: string;
  dateTime: string;
  status: "PAID" | "PENDING" | "COMPLETED";
}

export const BRANCH_CONFIG = [
  { id: "kphb", name: "KPHB Branch", short: "KPHB", color: "#0284c7" },
  { id: "nallagandla", name: "Nallagandla Branch", short: "NLG", color: "#10b981" },
  { id: "chandanagar", name: "Chandanagar Branch", short: "CNGR", color: "#f59e0b" },
  { id: "dilshuknagar", name: "Dilshuknagar Branch", short: "DSNR", color: "#8b5cf6" },
];

export const ALL_KNOWN_SOURCES = [
  "Old Patient",
  "Referral",
  "Google",
  "Youtube",
  "Walk-in",
  "Practo",
  "Facebook",
  "Instagram",
  "Other",
];

export const SOURCE_COLORS: Record<string, string> = {
  "Old Patient": "#10b981",
  Referral: "#8b5cf6",
  Google: "#f59e0b",
  Youtube: "#ef4444",
  "Walk-in": "#0284c7",
  Practo: "#06b6d4",
  Facebook: "#3b82f6",
  Instagram: "#ec4899",
  Other: "#64748b",
};

interface ReportsDashboardProps {
  transactions?: TransactionRecord[];
}

function normalizeDate(raw?: string): string {
  if (!raw) return "";
  const clean = raw.replace(/\//g, "-").trim();
  const parts = clean.split("-");
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  return clean;
}

export const ReportsAnalyticsDashboard: React.FC<ReportsDashboardProps> = ({
  transactions: propTransactions,
}) => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>(propTransactions || []);
  const [loading, setLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Graph Metric Mode: Revenue (₹) vs Patients
  const [graphMode, setGraphMode] = useState<"revenue" | "patients">("revenue");

  // Time filter for Patient Acquisition Channels & Branch Matrix
  type TimeFilter =
    | "this_month"
    | "last_month"
    | "last_3_months"
    | "last_6_months"
    | "all_time"
    | "custom";
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [matrixViewMode, setMatrixViewMode] = useState<"patients" | "revenue">("patients");

  // Doctor-Wise & Branch Revenue Matrix Filters
  type DocTimeFilter =
    | "this_month"
    | "last_month"
    | "last_3_months"
    | "last_6_months"
    | "all_time"
    | "custom";
  const [docTimeFilter, setDocTimeFilter] = useState<DocTimeFilter>("this_month");
  const [docCustomStart, setDocCustomStart] = useState("");
  const [docCustomEnd, setDocCustomEnd] = useState("");
  const [docMatrixViewMode, setDocMatrixViewMode] = useState<"revenue" | "consultations">("revenue");

  // Fetch transactions from database
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/revenue/transactions", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTransactions(data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch analytics transactions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (propTransactions && propTransactions.length > 0) {
      setTransactions(propTransactions);
      return;
    }
    fetchAnalyticsData();

    // Auto-sync polling every 30s only when the tab is actively visible to save network & VPS load
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchAnalyticsData();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchAnalyticsData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [propTransactions, fetchAnalyticsData]);

  // Compute 6-Month list dynamically anchored to transaction dates (e.g. 2026-06 to 2026-11)
  const last6Months = useMemo(() => {
    let anchorYear = 2026;
    let anchorMonth = 10; // 0-indexed: 10 = November

    if (transactions && transactions.length > 0) {
      let maxDate = "";
      transactions.forEach((t) => {
        const d = normalizeDate(t.timestamp);
        if (d && d > maxDate) maxDate = d;
      });
      if (maxDate && maxDate.length >= 7) {
        const [yStr, mStr] = maxDate.split("-");
        const yNum = parseInt(yStr, 10);
        const mNum = parseInt(mStr, 10);
        if (!isNaN(yNum) && !isNaN(mNum) && mNum >= 1 && mNum <= 12) {
          anchorYear = yNum;
          anchorMonth = mNum - 1;
        }
      }
    }

    const list = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anchorYear, anchorMonth - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      list.push({
        key: `${y}-${m}`,
        name: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
        short: d.toLocaleDateString("en-IN", { month: "short" }),
      });
    }
    return list;
  }, [transactions]);

  const currentMonthKey = last6Months[last6Months.length - 1]?.key || "2026-11";
  const prevMonthKey = last6Months[last6Months.length - 2]?.key || "2026-10";
  const septMonthKey = last6Months[last6Months.length - 3]?.key || "2026-09";

  // Multi-Bar Benchmark View Mode: "cards" (individual branch boxes) vs "grouped" (unified bar chart)
  const [benchmarkView, setBenchmarkView] = useState<"cards" | "grouped">("cards");

  // Monthly Aggregation Data
  const monthlyData = useMemo(() => {
    const map: Record<
      string,
      {
        totalRevenue: number;
        txnCount: number;
        branchBreakdown: Record<string, number>;
        sourceBreakdown: Record<string, number>;
        doctorBreakdown: Record<string, number>;
      }
    > = {};

    last6Months.forEach((m) => {
      map[m.key] = {
        totalRevenue: 0,
        txnCount: 0,
        branchBreakdown: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
        sourceBreakdown: {},
        doctorBreakdown: {},
      };
    });

    transactions.forEach((t) => {
      const normDate = normalizeDate(t.timestamp);
      const monthKey = normDate?.slice(0, 7);
      if (!monthKey || !map[monthKey]) return;

      const amt = Number(t.totalAmount) || 0;
      map[monthKey].totalRevenue += amt;
      map[monthKey].txnCount += 1;

      // Branch
      const bLower = (t.branchName || "").toLowerCase();
      let bKey = "kphb";
      if (bLower.includes("nalla") || bLower.includes("nlg")) bKey = "nallagandla";
      else if (bLower.includes("chanda") || bLower.includes("cngr")) bKey = "chandanagar";
      else if (bLower.includes("dilshuk") || bLower.includes("dsnr")) bKey = "dilshuknagar";
      map[monthKey].branchBreakdown[bKey] = (map[monthKey].branchBreakdown[bKey] || 0) + amt;

      // Source
      const src = t.source || "Walk-in";
      map[monthKey].sourceBreakdown[src] = (map[monthKey].sourceBreakdown[src] || 0) + amt;

      // Doctor
      const doc = t.doctorName || "Dr. Prashanth K Vaidya";
      map[monthKey].doctorBreakdown[doc] = (map[monthKey].doctorBreakdown[doc] || 0) + amt;
    });

    return map;
  }, [transactions, last6Months]);

  // Executive Metric Calculations
  const currentMonth = monthlyData[currentMonthKey] || {
    totalRevenue: 0,
    txnCount: 0,
    branchBreakdown: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
  };
  const prevMonth = monthlyData[prevMonthKey] || {
    totalRevenue: 0,
    txnCount: 0,
    branchBreakdown: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
  };

  const momGrowth = useMemo(() => {
    if (prevMonth.totalRevenue <= 0) return 0;
    return ((currentMonth.totalRevenue - prevMonth.totalRevenue) / prevMonth.totalRevenue) * 100;
  }, [currentMonth, prevMonth]);

  const topBranch = useMemo(() => {
    let top = BRANCH_CONFIG[0];
    let topAmt = 0;
    const branches = currentMonth.branchBreakdown || {};
    BRANCH_CONFIG.forEach((b) => {
      const amt = branches[b.id] || 0;
      if (amt > topAmt) {
        topAmt = amt;
        top = b;
      }
    });
    const share = currentMonth.totalRevenue > 0 ? (topAmt / currentMonth.totalRevenue) * 100 : 0;
    return { name: top.name, amount: topAmt, percentage: share };
  }, [currentMonth]);

  const avgPerPatient = useMemo(() => {
    if (currentMonth.txnCount <= 0) return 0;
    return Math.round(currentMonth.totalRevenue / currentMonth.txnCount);
  }, [currentMonth]);

  // Compute Multi-Bar Benchmark Data per Branch strictly from live database transactions (No Mock Data)
  const branchBenchmarks = useMemo(() => {
    const septKey = septMonthKey;
    const octKey = prevMonthKey;
    const novKey = currentMonthKey;

    // Calculate maximum amount across live branch revenues for relative bar scaling
    const allAmounts: number[] = [];
    BRANCH_CONFIG.forEach((b) => {
      allAmounts.push(monthlyData[septKey]?.branchBreakdown[b.id] || 0);
      allAmounts.push(monthlyData[octKey]?.branchBreakdown[b.id] || 0);
      allAmounts.push(monthlyData[novKey]?.branchBreakdown[b.id] || 0);
    });

    const maxQuarterScale = Math.max(...allAmounts, 1000);

    const formatDisplay = (amt: number): string => {
      if (amt <= 0) return "₹0";
      if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)}Cr`;
      if (amt >= 100000) return `₹${Math.round(amt / 1000)}k`;
      if (amt >= 1000) return `₹${Math.round(amt / 1000)}k`;
      return `₹${amt.toLocaleString("en-IN")}`;
    };

    const septMeta = last6Months[last6Months.length - 3];
    const octMeta = last6Months[last6Months.length - 2];
    const novMeta = last6Months[last6Months.length - 1];

    return BRANCH_CONFIG.map((b) => {
      // 100% real database amounts from monthlyData
      const septAmount = monthlyData[septKey]?.branchBreakdown[b.id] || 0;
      const octAmount = monthlyData[octKey]?.branchBreakdown[b.id] || 0;
      const novAmount = monthlyData[novKey]?.branchBreakdown[b.id] || 0;

      const thisMonthAmount = novAmount;

      const septPct =
        septAmount > 0
          ? Math.min(100, Math.max(5, Math.round((septAmount / maxQuarterScale) * 100)))
          : 0;
      const octPct =
        octAmount > 0
          ? Math.min(100, Math.max(5, Math.round((octAmount / maxQuarterScale) * 100)))
          : 0;
      const novPct =
        novAmount > 0
          ? Math.min(100, Math.max(5, Math.round((novAmount / maxQuarterScale) * 100)))
          : 0;

      return {
        ...b,
        thisMonthAmount,
        thisMonthFormatted: thisMonthAmount.toLocaleString("en-IN"),
        months: [
          {
            label: septMeta?.short || "Sept",
            display: formatDisplay(septAmount),
            amount: septAmount,
            pct: septPct,
            isCurrent: false,
          },
          {
            label: octMeta?.short || "Oct",
            display: formatDisplay(octAmount),
            amount: octAmount,
            pct: octPct,
            isCurrent: false,
          },
          {
            label: novMeta?.short || "Nov",
            display: formatDisplay(novAmount),
            amount: novAmount,
            pct: novPct,
            isCurrent: true,
          },
        ],
      };
    });
  }, [monthlyData, currentMonthKey, prevMonthKey, septMonthKey, last6Months]);

  // --- 6-Month Spike Curve Timeline Generator (Native Smooth Bezier path) ---
  const spikeGraph = useMemo(() => {
    const rawPoints = last6Months.map((m) => {
      const rev = monthlyData[m.key]?.totalRevenue || 0;
      const txns = monthlyData[m.key]?.txnCount || 0;
      return {
        key: m.key,
        label: m.short,
        name: m.name,
        revenue: rev,
        txnCount: txns,
        val: graphMode === "revenue" ? rev : txns,
      };
    });

    const values = rawPoints.map((p) => p.val);
    const maxDataVal = Math.max(...values, 0);

    // Dynamic scale head-room
    const defaultFloor = graphMode === "revenue" ? 10000 : 5;
    const maxVal = Math.max(maxDataVal * 1.25, defaultFloor);

    // Identify Peak Month
    let peakKey = "";
    if (maxDataVal > 0) {
      const peakItem = rawPoints.find((p) => p.val === maxDataVal);
      if (peakItem) peakKey = peakItem.key;
    }

    const points = rawPoints.map((p) => ({
      ...p,
      isPeak: p.key === peakKey && p.val > 0,
    }));

    const w = 780;
    const h = 240;
    const padL = 65;
    const padR = 35;
    const padT = 45;
    const padB = 40;

    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const coords = points.map((p, idx) => {
      const x = padL + (idx / Math.max(1, points.length - 1)) * plotW;
      const y = padT + plotH - (maxVal > 0 ? (p.val / maxVal) * plotH : 0);
      return { ...p, x, y };
    });

    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const mx = (curr.x + next.x) / 2;
      pathD += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
    }

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${h - padB} L ${coords[0].x} ${h - padB
      } Z`;

    return { coords, pathD, areaD, maxVal, maxDataVal, w, h, padL, padB, padT, plotH };
  }, [last6Months, monthlyData, graphMode]);

  // --- Donut Chart Geometry (Branch Breakdown) ---
  const branchDonut = useMemo(() => {
    const total = currentMonth.totalRevenue || 1;
    let accumulatedAngle = 0;

    return BRANCH_CONFIG.map((b) => {
      const amt = currentMonth.branchBreakdown[b.id] || 0;
      const pct = (amt / total) * 100;
      const angle = (amt / total) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;

      const r = 40;
      const cx = 50;
      const cy = 50;

      // SVG Arc
      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (startAngle + angle - 90) * (Math.PI / 180);

      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;
      const pathData =
        angle >= 360
          ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`
          : `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

      return {
        branch: b,
        amount: amt,
        percentage: pct,
        pathData,
      };
    });
  }, [currentMonth]);

  // --- Filtered Acquisition Sources & Branch Matrix Calculation ---
  const { sourcesList, grandTotalRevenue, grandTotalPatients, branchTotals } = useMemo(() => {
    const counts: Record<
      string,
      {
        source: string;
        totalRevenue: number;
        totalPatients: number;
        patientBranches: Record<string, number>;
        revenueBranches: Record<string, number>;
      }
    > = {};

    ALL_KNOWN_SOURCES.forEach((s) => {
      counts[s] = {
        source: s,
        totalRevenue: 0,
        totalPatients: 0,
        patientBranches: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
        revenueBranches: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
      };
    });

    const last3Keys = last6Months.slice(-3).map((m) => m.key);
    const last6Keys = last6Months.map((m) => m.key);

    transactions.forEach((t) => {
      const normDate = normalizeDate(t.timestamp);
      const monthPrefix = normDate.slice(0, 7);

      if (timeFilter === "this_month" && !normDate.startsWith(currentMonthKey)) return;
      if (timeFilter === "last_month" && !normDate.startsWith(prevMonthKey)) return;
      if (timeFilter === "last_3_months" && !last3Keys.includes(monthPrefix)) return;
      if (timeFilter === "last_6_months" && !last6Keys.includes(monthPrefix)) return;
      if (timeFilter === "custom") {
        if (customStart && normDate < customStart) return;
        if (customEnd && normDate > customEnd) return;
      }

      const rawSrc = (t.source || "Walk-in").trim();
      let src = rawSrc;
      const matchedKnown = ALL_KNOWN_SOURCES.find(
        (s) => s.toLowerCase() === rawSrc.toLowerCase()
      );
      if (matchedKnown) src = matchedKnown;

      const amt = Number(t.totalAmount) || 0;
      const bLower = (t.branchName || "").toLowerCase();
      let bKey = "kphb";
      if (bLower.includes("nalla") || bLower.includes("nlg")) bKey = "nallagandla";
      else if (bLower.includes("chanda") || bLower.includes("cngr")) bKey = "chandanagar";
      else if (bLower.includes("dilshuk") || bLower.includes("dsnr")) bKey = "dilshuknagar";

      if (!counts[src]) {
        counts[src] = {
          source: src,
          totalRevenue: 0,
          totalPatients: 0,
          patientBranches: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
          revenueBranches: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
        };
      }

      counts[src].totalRevenue += amt;
      counts[src].totalPatients += 1;
      counts[src].patientBranches[bKey] = (counts[src].patientBranches[bKey] || 0) + 1;
      counts[src].revenueBranches[bKey] = (counts[src].revenueBranches[bKey] || 0) + amt;
    });

    let gRev = 0;
    let gPts = 0;
    const bTotals = {
      patients: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
      revenue: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
    };

    const list = Object.values(counts).sort((a, b) => {
      if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue;
      return b.totalPatients - a.totalPatients;
    });

    list.forEach((item) => {
      gRev += item.totalRevenue;
      gPts += item.totalPatients;
      bTotals.patients.kphb += item.patientBranches.kphb || 0;
      bTotals.patients.nallagandla += item.patientBranches.nallagandla || 0;
      bTotals.patients.chandanagar += item.patientBranches.chandanagar || 0;
      bTotals.patients.dilshuknagar += item.patientBranches.dilshuknagar || 0;

      bTotals.revenue.kphb += item.revenueBranches.kphb || 0;
      bTotals.revenue.nallagandla += item.revenueBranches.nallagandla || 0;
      bTotals.revenue.chandanagar += item.revenueBranches.chandanagar || 0;
      bTotals.revenue.dilshuknagar += item.revenueBranches.dilshuknagar || 0;
    });

    return {
      sourcesList: list,
      grandTotalRevenue: gRev,
      grandTotalPatients: gPts,
      branchTotals: bTotals,
    };
  }, [transactions, timeFilter, currentMonthKey, prevMonthKey, customStart, customEnd, last6Months]);

  // Current period human label
  const periodLabel = useMemo(() => {
    switch (timeFilter) {
      case "this_month":
        return "This Month";
      case "last_month":
        return "Last Month";
      case "last_3_months":
        return "Last 3 Months";
      case "last_6_months":
        return "Last 6 Months";
      case "all_time":
        return "All Time";
      case "custom":
        return customStart && customEnd ? `${customStart} to ${customEnd}` : "Custom Range";
      default:
        return "This Month";
    }
  }, [timeFilter, customStart, customEnd]);

  // Doctor-Wise & Branch Revenue Matrix Memoized Aggregation
  const {
    doctorMatrixList,
    docGrandRevenue,
    docGrandPatients,
    docBranchTotals,
    docPeriodLabel,
  } = useMemo(() => {
    const docMap: Record<
      string,
      {
        doctorName: string;
        totalRevenue: number;
        totalConsultations: number;
        patientBranches: Record<string, number>;
        revenueBranches: Record<string, number>;
      }
    > = {};

    const last3Keys = last6Months.slice(-3).map((m) => m.key);
    const last6Keys = last6Months.map((m) => m.key);

    transactions.forEach((t) => {
      const normDate = normalizeDate(t.timestamp);
      const monthPrefix = normDate.slice(0, 7);

      if (docTimeFilter === "this_month" && !normDate.startsWith(currentMonthKey)) return;
      if (docTimeFilter === "last_month" && !normDate.startsWith(prevMonthKey)) return;
      if (docTimeFilter === "last_3_months" && !last3Keys.includes(monthPrefix)) return;
      if (docTimeFilter === "last_6_months" && !last6Keys.includes(monthPrefix)) return;
      if (docTimeFilter === "custom") {
        if (docCustomStart && normDate < docCustomStart) return;
        if (docCustomEnd && normDate > docCustomEnd) return;
      }

      const docName = (t.doctorName || "Dr. Prashanth K Vaidya").trim();
      const amt = Number(t.totalAmount) || 0;

      const bLower = (t.branchName || "").toLowerCase();
      let bKey = "kphb";
      if (bLower.includes("nalla") || bLower.includes("nlg")) bKey = "nallagandla";
      else if (bLower.includes("chanda") || bLower.includes("cngr")) bKey = "chandanagar";
      else if (bLower.includes("dilshuk") || bLower.includes("dsnr")) bKey = "dilshuknagar";

      if (!docMap[docName]) {
        docMap[docName] = {
          doctorName: docName,
          totalRevenue: 0,
          totalConsultations: 0,
          patientBranches: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
          revenueBranches: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
        };
      }

      docMap[docName].totalRevenue += amt;
      docMap[docName].totalConsultations += 1;
      docMap[docName].patientBranches[bKey] = (docMap[docName].patientBranches[bKey] || 0) + 1;
      docMap[docName].revenueBranches[bKey] = (docMap[docName].revenueBranches[bKey] || 0) + amt;
    });

    let gRev = 0;
    let gPts = 0;
    const bTotals = {
      patients: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
      revenue: { kphb: 0, nallagandla: 0, chandanagar: 0, dilshuknagar: 0 },
    };

    const list = Object.values(docMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    list.forEach((item) => {
      gRev += item.totalRevenue;
      gPts += item.totalConsultations;
      bTotals.patients.kphb += item.patientBranches.kphb || 0;
      bTotals.patients.nallagandla += item.patientBranches.nallagandla || 0;
      bTotals.patients.chandanagar += item.patientBranches.chandanagar || 0;
      bTotals.patients.dilshuknagar += item.patientBranches.dilshuknagar || 0;

      bTotals.revenue.kphb += item.revenueBranches.kphb || 0;
      bTotals.revenue.nallagandla += item.revenueBranches.nallagandla || 0;
      bTotals.revenue.chandanagar += item.revenueBranches.chandanagar || 0;
      bTotals.revenue.dilshuknagar += item.revenueBranches.dilshuknagar || 0;
    });

    let pLabel = "This Month";
    if (docTimeFilter === "last_month") pLabel = "Last Month";
    else if (docTimeFilter === "last_3_months") pLabel = "Last 3 Months";
    else if (docTimeFilter === "last_6_months") pLabel = "Last 6 Months";
    else if (docTimeFilter === "all_time") pLabel = "All Time";
    else if (docTimeFilter === "custom") {
      pLabel =
        docCustomStart && docCustomEnd
          ? `${docCustomStart} to ${docCustomEnd}`
          : "Custom Date Range";
    }

    return {
      doctorMatrixList: list,
      docGrandRevenue: gRev,
      docGrandPatients: gPts,
      docBranchTotals: bTotals,
      docPeriodLabel: pLabel,
    };
  }, [
    transactions,
    docTimeFilter,
    currentMonthKey,
    prevMonthKey,
    docCustomStart,
    docCustomEnd,
    last6Months,
  ]);

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-4 md:p-5 space-y-4 font-sans text-slate-900 bg-slate-50 min-h-screen">
      {/* Header Banner (Compact) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Reports &amp; Visual Analytics Dashboard
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                MoM &amp; Trends
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Multi-month revenue trajectory, branch comparisons &amp; patient acquisition channels
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-semibold self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Active Period: {last6Months[last6Months.length - 1]?.name}</span>
        </div>
      </div>

      {/* 4 Executive Metric Cards (Compact Size & Reduced Typography) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Monthly Revenue & MoM Growth */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              <span>This Month Revenue</span>
              <div
                className={`flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${momGrowth >= 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
              >
                {momGrowth >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>
                  {momGrowth >= 0 ? "+" : ""}
                  {momGrowth.toFixed(1)}% MoM
                </span>
              </div>
            </div>
            <div className="text-lg font-black text-slate-900 mt-1">
              ₹{currentMonth.totalRevenue.toLocaleString("en-IN")}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 truncate">
            vs ₹{prevMonth.totalRevenue.toLocaleString("en-IN")} in previous month
          </p>
        </div>

        {/* Card 2: Leading Branch */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Top Branch</span>
              <div className="p-1 bg-sky-50 text-sky-600 rounded-md">
                <Building2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate">{topBranch.name}</div>
            <div className="text-[10.5px] font-semibold text-sky-700 mt-0.5 truncate">
              ₹{topBranch.amount.toLocaleString("en-IN")} ({topBranch.percentage.toFixed(1)}% of total)
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className="bg-sky-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, topBranch.percentage)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Total Patients */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Patients Treated</span>
              <div className="p-1 bg-emerald-50 text-emerald-600 rounded-md">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-black text-slate-900 mt-1">
              {currentMonth.txnCount}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 truncate">
            Consultations &amp; treatments completed
          </p>
        </div>

        {/* Card 4: Average Revenue per Patient */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Avg Revenue / Patient</span>
              <div className="p-1 bg-purple-50 text-purple-600 rounded-md">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-black text-slate-900 mt-1">
              ₹{avgPerPatient.toLocaleString("en-IN")}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 truncate">
            Average basket value per clinical encounter
          </p>
        </div>
      </div>

      {/* Main Graphs Grid: Spike Timeline + Branch Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========================================================================= */}
        {/* 6-Month Revenue Spike & Trajectory (2 cols)                                */}
        {/* ========================================================================= */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  6-Month Revenue Spike &amp; Trajectory
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                  {last6Months[0]?.short} - {last6Months[last6Months.length - 1]?.short}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic revenue curve, peak month indicators &amp; live transaction volume
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Metric Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setGraphMode("revenue")}
                  className={`px-2.5 py-1 rounded-md font-bold transition ${graphMode === "revenue"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  💰 Revenue (₹)
                </button>
                <button
                  onClick={() => setGraphMode("patients")}
                  className={`px-2.5 py-1 rounded-md font-bold transition ${graphMode === "patients"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  👥 Patients
                </button>
              </div>

              {/* Manual Refresh Button */}
              <button
                onClick={fetchAnalyticsData}
                disabled={loading}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition"
                title="Refresh live graph"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* SVG Graph Visual Viewport */}
          <div className="relative w-full overflow-hidden bg-slate-50/50 rounded-xl p-2 border border-slate-100">
            <svg
              viewBox={`0 0 ${spikeGraph.w} ${spikeGraph.h}`}
              className="w-full h-60 select-none overflow-visible"
            >
              <defs>
                <linearGradient id="spikeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.32" />
                  <stop offset="70%" stopColor="#0284c7" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feComposite in="SourceGraphic" in2="glow" operator="over" />
                </filter>
              </defs>

              {/* Horizontal Grid Lines & Y-Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = spikeGraph.h - spikeGraph.padB - pct * spikeGraph.plotH;
                const val = Math.round(pct * spikeGraph.maxVal);
                return (
                  <g key={idx}>
                    <line
                      x1={spikeGraph.padL}
                      y1={y}
                      x2={spikeGraph.w - 30}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={spikeGraph.padL - 10}
                      y={y + 3.5}
                      fill="#94a3b8"
                      fontSize="10"
                      textAnchor="end"
                      fontWeight="700"
                    >
                      {graphMode === "revenue"
                        ? val >= 100000
                          ? `₹${(val / 100000).toFixed(1)}L`
                          : `₹${(val / 1000).toFixed(0)}k`
                        : `${val} pts`}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill Under Curve */}
              <path d={spikeGraph.areaD} fill="url(#spikeGrad)" />

              {/* Smooth Bezier Stroke Line */}
              <path
                d={spikeGraph.pathD}
                fill="none"
                stroke="url(#strokeGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#glow)"
              />

              {/* Interactive Vertical Spike Guides & Nodes */}
              {spikeGraph.coords.map((pt, idx) => {
                const isHovered = hoveredPoint?.key === pt.key;

                return (
                  <g
                    key={idx}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Vertical Spike Dash Line on Hover or Peak */}
                    {(isHovered || pt.isPeak) && (
                      <line
                        x1={pt.x}
                        y1={pt.y}
                        x2={pt.x}
                        y2={spikeGraph.h - spikeGraph.padB}
                        stroke={pt.isPeak ? "#0284c7" : "#94a3b8"}
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                        opacity={isHovered ? 1 : 0.6}
                      />
                    )}

                    {/* Wide Invisible Hit Target for easy mouse interactions */}
                    <circle cx={pt.x} cy={pt.y} r={28} fill="transparent" />

                    {/* Outer Glow Halo on Hover or Peak */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 12 : pt.isPeak ? 8 : 6}
                      fill="#0284c7"
                      fillOpacity={isHovered ? 0.35 : pt.isPeak ? 0.2 : 0.1}
                      className="transition-all duration-200"
                    />

                    {/* Main Node Point */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : pt.isPeak ? 5 : 4}
                      fill="#ffffff"
                      stroke="#0284c7"
                      strokeWidth={isHovered ? 3.5 : 2.5}
                      className="transition-all duration-200"
                    />

                    {/* Value label directly above point */}
                    <text
                      x={pt.x}
                      y={pt.y - 12}
                      fill={pt.isPeak ? "#0369a1" : isHovered ? "#0f172a" : "#64748b"}
                      fontSize={pt.isPeak || isHovered ? "11" : "10"}
                      fontWeight={pt.isPeak || isHovered ? "800" : "600"}
                      textAnchor="middle"
                    >
                      {graphMode === "revenue"
                        ? pt.val >= 100000
                          ? `₹${(pt.val / 100000).toFixed(1)}L`
                          : pt.val > 0
                            ? `₹${(pt.val / 1000).toFixed(0)}k`
                            : "₹0"
                        : `${pt.val} pts`}
                    </text>

                    {/* Peak Month Badge */}
                    {pt.isPeak && (
                      <g transform={`translate(${pt.x - 22}, ${pt.y - 32})`}>
                        <rect
                          width="44"
                          height="15"
                          rx="7.5"
                          fill="#0284c7"
                          className="shadow-sm"
                        />
                        <text
                          x="22"
                          y="10.5"
                          fill="#ffffff"
                          fontSize="8"
                          fontWeight="800"
                          textAnchor="middle"
                        >
                          ★ PEAK
                        </text>
                      </g>
                    )}

                    {/* Month Label below baseline */}
                    <text
                      x={pt.x}
                      y={spikeGraph.h - 15}
                      fill={isHovered ? "#0284c7" : "#475569"}
                      fontSize="11"
                      fontWeight={isHovered ? "800" : "700"}
                      textAnchor="middle"
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay Box */}
            {hoveredPoint && (
              <div
                className="absolute z-30 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-full border border-slate-700/80 backdrop-blur-md"
                style={{
                  left: `${(hoveredPoint.x / spikeGraph.w) * 100}%`,
                  top: `${Math.max(65, (hoveredPoint.y / spikeGraph.h) * 100 - 8)}%`,
                }}
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Calendar className="w-3 h-3 text-sky-400" />
                  <span>{hoveredPoint.name}</span>
                </div>
                <div className="text-emerald-400 font-black text-sm mt-1">
                  ₹{hoveredPoint.revenue.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>{hoveredPoint.txnCount} patient consultations</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Branch Share Donut Chart (1 col) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Branch Revenue Share</h3>
              <PieChartIcon className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-400">Current month contribution per location</p>
          </div>

          {/* SVG Donut Visual */}
          <div className="relative w-36 h-36 mx-auto my-2">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {branchDonut.map((slice, idx) => (
                <path
                  key={idx}
                  d={slice.pathData}
                  fill="none"
                  stroke={slice.branch.color}
                  strokeWidth="16"
                  strokeLinecap="round"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
              <span className="text-xs font-black text-slate-800">
                ₹{(currentMonth.totalRevenue / 100000).toFixed(1)}L
              </span>
            </div>
          </div>

          {/* Legends */}
          <div className="space-y-2 mt-2">
            {branchDonut.map((slice, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: slice.branch.color }}
                  />
                  <span className="font-semibold text-slate-700">{slice.branch.short}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">
                    ₹{slice.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="text-slate-400 w-10 text-right">
                    {slice.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Branch Performance (Last 3 Months) - Multi-Bar Benchmark                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Branch Performance (Last 3 Months)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quarterly trajectory across each of the 4 clinical branches
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-md bg-[#e0f2fe] text-[#0284c7] text-xs font-bold">
            Multi-Bar Benchmark
          </span>
        </div>

        {/* 4 Stacked Branch Rows */}
        <div className="space-y-5">
          {branchBenchmarks.map((b) => (
            <div key={b.id} className="space-y-2">
              {/* Branch Row Header */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 text-sm">{b.name}</span>
                <span className="text-xs text-slate-500">
                  This Month:{" "}
                  <strong className="font-bold text-slate-900 text-sm ml-1">
                    ₹{b.thisMonthFormatted}
                  </strong>
                </span>
              </div>

              {/* 3 Horizontal Mini-Bar Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {b.months.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-[#f8fafc] border border-slate-100 rounded-lg p-2.5 sm:px-3 sm:py-2.5 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">{m.label}</span>
                      <span className="font-bold text-slate-900">{m.display}</span>
                    </div>
                    {/* Horizontal Progress Bar */}
                    <div className="w-full bg-[#e2e8f0] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${m.pct}%`,
                          backgroundColor: m.isCurrent ? b.color : "#94a3b8",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* Doctor-Wise & Branch Revenue Matrix (This Month / Last Month / Period Filter)             */}
      {/* ========================================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-5 p-5 md:p-6">
        {/* Section Header with Period Filter Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Stethoscope className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Doctor-Wise &amp; Branch Revenue Matrix
              </h2>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Data
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Doctor-wise performance across clinical branches with period filtering ({docPeriodLabel})
            </p>
          </div>

          {/* Time Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            {(
              [
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "last_3_months", label: "Last 3 Months" },
                { id: "last_6_months", label: "Last 6 Months" },
                { id: "all_time", label: "All Time" },
                { id: "custom", label: "Custom Range" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setDocTimeFilter(id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${docTimeFilter === id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range Date Pickers */}
        {docTimeFilter === "custom" && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">From Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={docCustomStart}
                onChange={(e) => setDocCustomStart(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">To Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={docCustomEnd}
                onChange={(e) => setDocCustomEnd(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Active Period Info & Metric Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>📅 {docPeriodLabel}</span>
            </span>
            <span>
              Total Consultations: <strong className="text-slate-900">{docGrandPatients} pts</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Total Doctor Revenue:{" "}
              <strong className="text-emerald-700">₹{docGrandRevenue.toLocaleString("en-IN")}</strong>
            </span>
          </div>

          {/* Metric View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs self-start sm:self-auto">
            <button
              onClick={() => setDocMatrixViewMode("revenue")}
              className={`px-3 py-1 rounded-md font-bold transition ${docMatrixViewMode === "revenue"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
                }`}
            >
              💰 Revenue (₹)
            </button>
            <button
              onClick={() => setDocMatrixViewMode("consultations")}
              className={`px-3 py-1 rounded-md font-bold transition ${docMatrixViewMode === "consultations"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
                }`}
            >
              👥 Consultations
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10.5px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Doctor Name</th>
                  <th className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-600" />
                      KPHB
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Nallagandla
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Chandanagar
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Dilshuknagar
                    </span>
                  </th>
                  <th className="py-3 px-4 text-right">
                    {docMatrixViewMode === "revenue" ? "Total Revenue" : "Total Consultations"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {doctorMatrixList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No doctor revenue recorded for {docPeriodLabel}
                    </td>
                  </tr>
                ) : (
                  doctorMatrixList.map((doc) => {
                    const revPct =
                      docGrandRevenue > 0
                        ? ((doc.totalRevenue / docGrandRevenue) * 100).toFixed(1)
                        : "0.0";
                    const ptPct =
                      docGrandPatients > 0
                        ? ((doc.totalConsultations / docGrandPatients) * 100).toFixed(1)
                        : "0.0";

                    return (
                      <tr key={doc.doctorName} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-black text-xs shrink-0">
                              {doc.doctorName.replace("Dr.", "").trim().charAt(0) || "D"}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{doc.doctorName}</div>
                              <div className="text-[10px] text-slate-400">Consulting Doctor</div>
                            </div>
                          </div>
                        </td>

                        {/* KPHB */}
                        <td className="py-3 px-4 text-center">
                          {docMatrixViewMode === "revenue" ? (
                            <span
                              className={
                                doc.revenueBranches.kphb > 0
                                  ? "font-bold text-slate-900"
                                  : "text-slate-400"
                              }
                            >
                              ₹{doc.revenueBranches.kphb.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span
                              className={
                                doc.patientBranches.kphb > 0
                                  ? "font-bold text-slate-900"
                                  : "text-slate-400"
                              }
                            >
                              {doc.patientBranches.kphb} pts
                            </span>
                          )}
                        </td>

                        {/* Nallagandla */}
                        <td className="py-3 px-4 text-center">
                          {docMatrixViewMode === "revenue" ? (
                            <span
                              className={
                                doc.revenueBranches.nallagandla > 0
                                  ? "font-bold text-slate-900"
                                  : "text-slate-400"
                              }
                            >
                              ₹{doc.revenueBranches.nallagandla.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span
                              className={
                                doc.patientBranches.nallagandla > 0
                                  ? "font-bold text-slate-900"
                                  : "text-slate-400"
                              }
                            >
                              {doc.patientBranches.nallagandla} pts
                            </span>
                          )}
                        </td>

                        {/* Chandanagar */}
                        <td className="py-3 px-4 text-center">
                          {docMatrixViewMode === "revenue" ? (
                            <span
                              className={
                                doc.revenueBranches.chandanagar > 0
                                  ? "font-bold text-slate-900"
                                  : "text-slate-400"
                              }
                            >
                              ₹{doc.revenueBranches.chandanagar.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span
                              className={
                                doc.patientBranches.chandanagar > 0
                                  ? "font-bold text-slate-900"
                                  : "text-slate-400"
                              }
                            >
                              {doc.patientBranches.chandanagar} pts
                            </span>
                          )}
                        </td>

                        {/* Dilshuknagar */}
                        <td className="py-3 px-4 text-center">
                          {docMatrixViewMode === "revenue" ? (
                            <span
                              className={
                                doc.revenueBranches.dilshuknagar > 0
                                  ? "font-bold text-slate-900"
                                  : "text-slate-400"
                              }
                            >
                              ₹{doc.revenueBranches.dilshuknagar.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span
                              className={
                                doc.patientBranches.dilshuknagar > 0
                                  ? "font-bold text-slate-900"
                                  : "text-slate-400"
                              }
                            >
                              {doc.patientBranches.dilshuknagar} pts
                            </span>
                          )}
                        </td>

                        {/* Total Revenue / Consultations */}
                        <td className="py-3 px-4 text-right">
                          {docMatrixViewMode === "revenue" ? (
                            <div>
                              <span className="font-black text-slate-900">
                                ₹{doc.totalRevenue.toLocaleString("en-IN")}
                              </span>
                              <span className="text-[10.5px] font-bold text-slate-400 ml-1.5">
                                {revPct}%
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-black text-slate-900">
                                {doc.totalConsultations} pts
                              </span>
                              <span className="text-[10.5px] font-bold text-slate-400 ml-1.5">
                                {ptPct}%
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer Totals */}
              <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="py-3 px-4 uppercase text-[11px] tracking-wider text-slate-800">
                    Total
                  </td>
                  <td className="py-3 px-4 text-center">
                    {docMatrixViewMode === "revenue" ? (
                      <span>₹{docBranchTotals.revenue.kphb.toLocaleString("en-IN")}</span>
                    ) : (
                      <span>👥 {docBranchTotals.patients.kphb} pts</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {docMatrixViewMode === "revenue" ? (
                      <span>₹{docBranchTotals.revenue.nallagandla.toLocaleString("en-IN")}</span>
                    ) : (
                      <span>👥 {docBranchTotals.patients.nallagandla} pts</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {docMatrixViewMode === "revenue" ? (
                      <span>₹{docBranchTotals.revenue.chandanagar.toLocaleString("en-IN")}</span>
                    ) : (
                      <span>👥 {docBranchTotals.patients.chandanagar} pts</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {docMatrixViewMode === "revenue" ? (
                      <span>₹{docBranchTotals.revenue.dilshuknagar.toLocaleString("en-IN")}</span>
                    ) : (
                      <span>👥 {docBranchTotals.patients.dilshuknagar} pts</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-800 font-black">
                    {docMatrixViewMode === "revenue" ? (
                      <span>₹{docGrandRevenue.toLocaleString("en-IN")}</span>
                    ) : (
                      <span>👥 {docGrandPatients} Consultations</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* Patient Acquisition Channels & Branch Matrix (Live Real-Time Data)                        */}
      {/* ========================================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-5 p-5 md:p-6">
        {/* Section Header with Period Filter Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Patient Acquisition Channels &amp; Branch Matrix
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Real-Time Data
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter by period to view dynamic patient count and revenue across branches
            </p>
          </div>

          {/* Period Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            {(
              [
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "last_3_months", label: "Last 3 Months" },
                { id: "last_6_months", label: "Last 6 Months" },
                { id: "all_time", label: "All Time" },
                { id: "custom", label: "Custom Range" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTimeFilter(id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${timeFilter === id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range Date Pickers (Shown only when 'custom' is selected) */}
        {timeFilter === "custom" && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">From Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">To Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Active Period Pill Display */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>📅 {periodLabel}</span>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Total Unique Patients: <b className="text-slate-900">{grandTotalPatients} pts</b> | Total Collections:{" "}
            <b className="text-emerald-700">₹{grandTotalRevenue.toLocaleString("en-IN")}</b>
          </div>
        </div>

        {/* Top Patient Sources Cards (Sorted by revenue contribution & unique patients) */}
        <div>
          <div className="mb-3">
            <h3 className="font-extrabold text-slate-800 text-sm">
              Top Patient Sources ({periodLabel})
            </h3>
            <p className="text-[11px] text-slate-500">
              Sorted by revenue contribution &amp; unique patients
            </p>
          </div>

          {/* Cards Grid: Old Patient, Referral, Google, Youtube, Walk-in, Practo, Facebook, Instagram, Other */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
            {sourcesList.map((item) => {
              const revShare =
                grandTotalRevenue > 0 ? (item.totalRevenue / grandTotalRevenue) * 100 : 0;
              const color = SOURCE_COLORS[item.source] || "#64748b";

              return (
                <div
                  key={item.source}
                  className="bg-slate-50/70 hover:bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="font-bold text-slate-800 text-xs truncate"
                        title={item.source}
                      >
                        {item.source}
                      </span>
                    </div>

                    <div className="font-black text-slate-900 text-sm">
                      ₹{item.totalRevenue.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                      ({revShare.toFixed(1)}%)
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between">
                    <span className="text-[11.5px] font-extrabold text-sky-700">
                      {item.totalPatients} pts
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {grandTotalPatients > 0
                        ? `${((item.totalPatients / grandTotalPatients) * 100).toFixed(0)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* All Branches & Sources Matrix */}
        <div className="pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-t border-slate-100 pt-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 text-sm">
                  All Branches &amp; Sources Matrix ({periodLabel})
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[11px] font-bold border border-sky-200">
                  👥 Number of Patients Matrix
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Branch-by-branch patient count per acquisition source (Patient numbers only)
              </p>
            </div>

            {/* Toggle between Patients Count and Revenue Matrix */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs self-start sm:self-auto">
              <button
                onClick={() => setMatrixViewMode("patients")}
                className={`px-2.5 py-1 rounded-md font-bold transition ${matrixViewMode === "patients"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                👥 Patients Count
              </button>
              <button
                onClick={() => setMatrixViewMode("revenue")}
                className={`px-2.5 py-1 rounded-md font-bold transition ${matrixViewMode === "revenue"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                💰 Revenue (₹)
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200 select-none">
                <tr>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-center">KPHB</th>
                  <th className="py-3 px-4 text-center">Nallagandla</th>
                  <th className="py-3 px-4 text-center">Chandanagar</th>
                  <th className="py-3 px-4 text-center">Dilshuknagar</th>
                  <th className="py-3 px-4 text-right">
                    {matrixViewMode === "patients" ? "Total Patients" : "Total Revenue"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sourcesList.map((item) => {
                  const ptPct =
                    grandTotalPatients > 0
                      ? ((item.totalPatients / grandTotalPatients) * 100).toFixed(1)
                      : "0.0";
                  const revPct =
                    grandTotalRevenue > 0
                      ? ((item.totalRevenue / grandTotalRevenue) * 100).toFixed(1)
                      : "0.0";

                  return (
                    <tr key={item.source} className="hover:bg-slate-50/80 transition">
                      {/* Source */}
                      <td className="py-2.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: SOURCE_COLORS[item.source] || "#64748b",
                          }}
                        />
                        <span>{item.source}</span>
                      </td>

                      {/* KPHB */}
                      <td className="py-2.5 px-4 text-center text-slate-700">
                        {matrixViewMode === "patients" ? (
                          <span
                            className={
                              item.patientBranches.kphb > 0
                                ? "font-bold text-slate-900"
                                : "text-slate-400"
                            }
                          >
                            {item.patientBranches.kphb} pts
                          </span>
                        ) : (
                          <span
                            className={
                              item.revenueBranches.kphb > 0
                                ? "font-bold text-slate-900"
                                : "text-slate-400"
                            }
                          >
                            ₹{item.revenueBranches.kphb.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Nallagandla */}
                      <td className="py-2.5 px-4 text-center text-slate-700">
                        {matrixViewMode === "patients" ? (
                          <span
                            className={
                              item.patientBranches.nallagandla > 0
                                ? "font-bold text-slate-900"
                                : "text-slate-400"
                            }
                          >
                            {item.patientBranches.nallagandla} pts
                          </span>
                        ) : (
                          <span
                            className={
                              item.revenueBranches.nallagandla > 0
                                ? "font-bold text-slate-900"
                                : "text-slate-400"
                            }
                          >
                            ₹{item.revenueBranches.nallagandla.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Chandanagar */}
                      <td className="py-2.5 px-4 text-center text-slate-700">
                        {matrixViewMode === "patients" ? (
                          <span
                            className={
                              item.patientBranches.chandanagar > 0
                                ? "font-bold text-slate-900"
                                : "text-slate-400"
                            }
                          >
                            {item.patientBranches.chandanagar} pts
                          </span>
                        ) : (
                          <span
                            className={
                              item.revenueBranches.chandanagar > 0
                                ? "font-bold text-slate-900"
                                : "text-slate-400"
                            }
                          >
                            ₹{item.revenueBranches.chandanagar.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Dilshuknagar */}
                      <td className="py-2.5 px-4 text-center text-slate-700">
                        {matrixViewMode === "patients" ? (
                          <span
                            className={
                              item.patientBranches.dilshuknagar > 0
                                ? "font-bold text-slate-900"
                                : "text-slate-400"
                            }
                          >
                            {item.patientBranches.dilshuknagar} pts
                          </span>
                        ) : (
                          <span
                            className={
                              item.revenueBranches.dilshuknagar > 0
                                ? "font-bold text-slate-900"
                                : "text-slate-400"
                            }
                          >
                            ₹{item.revenueBranches.dilshuknagar.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Total Patients / Total Revenue */}
                      <td className="py-2.5 px-4 text-right">
                        {matrixViewMode === "patients" ? (
                          <div>
                            <span className="font-black text-slate-900">
                              {item.totalPatients} pts
                            </span>
                            <span className="text-[10.5px] font-bold text-slate-400 ml-1.5">
                              {ptPct}%
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-black text-slate-900">
                              ₹{item.totalRevenue.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10.5px] font-bold text-slate-400 ml-1.5">
                              {revPct}%
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Matrix Table Footer Totals */}
              <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="py-3 px-4 uppercase text-[11px] tracking-wider text-slate-800">
                    Total Patients
                  </td>
                  <td className="py-3 px-4 text-center">
                    {matrixViewMode === "patients" ? (
                      <span>👥 {branchTotals.patients.kphb} pts</span>
                    ) : (
                      <span>₹{branchTotals.revenue.kphb.toLocaleString("en-IN")}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {matrixViewMode === "patients" ? (
                      <span>👥 {branchTotals.patients.nallagandla} pts</span>
                    ) : (
                      <span>₹{branchTotals.revenue.nallagandla.toLocaleString("en-IN")}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {matrixViewMode === "patients" ? (
                      <span>👥 {branchTotals.patients.chandanagar} pts</span>
                    ) : (
                      <span>₹{branchTotals.revenue.chandanagar.toLocaleString("en-IN")}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {matrixViewMode === "patients" ? (
                      <span>👥 {branchTotals.patients.dilshuknagar} pts</span>
                    ) : (
                      <span>₹{branchTotals.revenue.dilshuknagar.toLocaleString("en-IN")}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-800 font-black">
                    {matrixViewMode === "patients" ? (
                      <span>👥 {grandTotalPatients} Patients</span>
                    ) : (
                      <span>₹{grandTotalRevenue.toLocaleString("en-IN")}</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalyticsDashboard;
