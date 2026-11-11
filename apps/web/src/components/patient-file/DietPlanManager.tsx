"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  DIET_CONDITIONS,
  DietCondition,
  calculateBMI,
  generate30DayDietPlan,
  generate30DayDietSchedule,
  DayDietPlan,
  PatientMetrics,
} from "./dietPlanData";
import {
  Activity,
  Info,
  Sparkles,
  Maximize2,
  Minimize2,
  Printer,
  Copy,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  HeartPulse,
  Save,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

interface DietPlanManagerProps {
  appointmentId: string;
  patientData: {
    patientName?: string;
    age?: number;
    gender?: string;
    phone?: string;
    branch?: string;
    registrationId?: string;
    doctorName?: string;
    dietPlan?: string;
    dietPlanFee?: number;
    dietFee?: number;
  };
  initialDietPlan?: string;
  initialDietFee?: number;
  onSavePlan: (planText: string, dietFee: number, sendToReception?: boolean) => Promise<void>;
  isSaving?: boolean;
}

export function DietPlanManager({
  appointmentId,
  patientData,
  initialDietPlan = "",
  initialDietFee = 0,
  onSavePlan,
  isSaving = false,
}: DietPlanManagerProps) {
  // Metrics & BMI
  const [metrics, setMetrics] = useState<PatientMetrics>({
    age: 0,
    gender: "",
    heightCm: 0,
    weightKg: 0,
  });

  const [showBMIInfoModal, setShowBMIInfoModal] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  const [dietFee, setDietFee] = useState<number>(initialDietFee || (initialDietPlan ? 500 : 0));
  const [planText, setPlanText] = useState<string>(initialDietPlan || "");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"all" | "digestive" | "deficiency" | "metabolic">("all");
  const [viewMode, setViewMode] = useState<"table" | "raw">("table");
  const [activeDayFilter, setActiveDayFilter] = useState<"all" | "1-15" | "16-30">("all");

  // Sync initial plan if passed later
  useEffect(() => {
    if (initialDietPlan && !planText) {
      setPlanText(initialDietPlan);
    }
  }, [initialDietPlan]);

  const bmiInfo = useMemo(() => {
    return calculateBMI(metrics.heightCm, metrics.weightKg);
  }, [metrics.heightCm, metrics.weightKg]);

  const toggleCondition = (id: string) => {
    setSelectedConditions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllCategory = (category: "digestive" | "deficiency" | "metabolic") => {
    const ids = DIET_CONDITIONS.filter((c) => c.category === category).map((c) => c.id);
    setSelectedConditions((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearAllCategory = (category: "digestive" | "deficiency" | "metabolic") => {
    const ids = new Set(DIET_CONDITIONS.filter((c) => c.category === category).map((c) => c.id));
    setSelectedConditions((prev) => prev.filter((id) => !ids.has(id)));
  };

  // Parse or compute day-wise meals from planText / state
  const daySchedule = useMemo<DayDietPlan[]>(() => {
    return generate30DayDietSchedule(
      selectedConditions,
      metrics.age,
      bmiInfo.category
    );
  }, [selectedConditions, metrics.age, bmiInfo.category]);

  const displayedDays = useMemo(() => {
    if (activeDayFilter === "1-15") return daySchedule.filter((d) => d.day <= 15);
    if (activeDayFilter === "16-30") return daySchedule.filter((d) => d.day > 15);
    return daySchedule;
  }, [daySchedule, activeDayFilter]);

  // Generate 30-Day Plan based on options
  const handleGeneratePlan = () => {
    const generated = generate30DayDietPlan(
      {
        name: patientData.patientName,
        age: metrics.age,
        gender: metrics.gender,
        branch: patientData.branch,
        registrationId: patientData.registrationId,
      },
      metrics,
      selectedConditions,
      dietFee
    );
    setPlanText(generated);
    setViewMode("table");
  };

  const handleCopy = () => {
    if (!planText) return;
    navigator.clipboard.writeText(planText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the Diet Plan.");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Spiritual Homeopathy - Diet Plan - ${patientData.patientName || "Patient"}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; line-height: 1.5; font-size: 13px; }
            h1 { color: #0284c7; font-size: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin-bottom: 12px; }
            pre { white-space: pre-wrap; font-family: monospace; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; background: #e0f2fe; color: #0369a1; font-weight: bold; font-size: 11px; margin-right: 6px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Spiritual Homeopathy Clinics - 30-Day Diet & Regimen Chart</h1>
          <p><strong>Patient:</strong> ${patientData.patientName || "N/A"} (${patientData.registrationId || "Reg ID N/A"}) | <strong>Doctor:</strong> ${patientData.doctorName || "Dr. Prashanth K Vaidya"}</p>
          <pre>${planText || "No diet plan generated yet."}</pre>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredConditions = useMemo(() => {
    if (activeCategory === "all") return DIET_CONDITIONS;
    return DIET_CONDITIONS.filter((c) => c.category === activeCategory);
  }, [activeCategory]);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 transition-all ${
        isFullScreen
          ? "fixed inset-0 z-50 p-6 overflow-y-auto bg-slate-50/95 backdrop-blur-md shadow-2xl"
          : "p-4 sm:p-5 shadow-xs"
      }`}
    >
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-black">
              🥗
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                30-Day Homeopathic Diet & Regimen Plan
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                  Smart Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Tailored clinical nutrition based on conditions, deficiencies & BMI
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            title={isFullScreen ? "Exit Fullscreen" : "Full Screen View"}
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Full Screen</span>
              </>
            )}
          </button>

          {planText && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* STEP 1: PHYSICAL METRICS & BMI CALCULATOR */}
      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-sky-50/60 via-slate-50 to-blue-50/60 border border-sky-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              1. Physical Parameters & Body Mass Index (BMI)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowBMIInfoModal(true)}
            className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-100/60 hover:bg-sky-100 px-2 py-0.5 rounded-md transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            <span>(i) BMI Standards Info</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Age (Years)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={metrics.age || ""}
              onChange={(e) => setMetrics({ ...metrics, age: parseInt(e.target.value) || 0 })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Gender</label>
            <select
              value={metrics.gender}
              onChange={(e) => setMetrics({ ...metrics, gender: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Height (cm)</label>
            <input
              type="number"
              min={40}
              max={250}
              value={metrics.heightCm || ""}
              onChange={(e) => setMetrics({ ...metrics, heightCm: parseFloat(e.target.value) || 0 })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Weight (kg)</label>
            <input
              type="number"
              min={2}
              max={300}
              value={metrics.weightKg || ""}
              onChange={(e) => setMetrics({ ...metrics, weightKg: parseFloat(e.target.value) || 0 })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            />
          </div>

          {/* CALCULATED BMI PILL */}
          <div className="col-span-2 rounded-xl bg-white border border-slate-200 p-2.5 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Calculated BMI
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900">
                  {bmiInfo.bmi > 0 ? bmiInfo.bmi : "—"}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">kg/m²</span>
              </div>
            </div>

            <div className="text-right">
              <span
                className="inline-block px-2 py-0.5 rounded-md text-[11px] font-black"
                style={{
                  backgroundColor: `${bmiInfo.color}15`,
                  color: bmiInfo.color,
                  border: `1px solid ${bmiInfo.color}40`,
                }}
              >
                {bmiInfo.category}
              </span>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Ideal: {bmiInfo.idealWeightRange}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: CONDITIONS & DEFICIENCIES CHECKLIST */}
      <div className="mt-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span>2. Select Medical Conditions & Deficiencies</span>
              <span className="px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black">
                {selectedConditions.length} Selected
              </span>
            </span>
            <p className="text-[11px] text-slate-500">
              Check all clinical indications. Foods to eat & avoid will adapt automatically.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeCategory === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({DIET_CONDITIONS.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("digestive")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeCategory === "digestive" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Digestive (6)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("deficiency")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeCategory === "deficiency" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Deficiencies (10)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("metabolic")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeCategory === "metabolic" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Metabolic & Systemic (11)
            </button>
          </div>
        </div>

        {/* Condition Checkbox Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
          {filteredConditions.map((cond) => {
            const isSelected = selectedConditions.includes(cond.id);
            return (
              <div
                key={cond.id}
                onClick={() => toggleCondition(cond.id)}
                className={`cursor-pointer p-2.5 rounded-xl border transition-all select-none flex flex-col justify-between ${
                  isSelected
                    ? "bg-sky-50 border-sky-400 text-sky-950 shadow-2xs ring-1 ring-sky-300"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="font-bold text-xs leading-tight">{cond.name}</div>
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span
                    className={`font-semibold px-1.5 py-0.2 rounded-md ${
                      cond.category === "digestive"
                        ? "bg-amber-100 text-amber-800"
                        : cond.category === "deficiency"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {cond.badge}
                  </span>
                  <span className="text-slate-400 font-medium">
                    {cond.foodsToEat.length} foods
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 3: ACTION CONTROLS & GENERATE */}
      <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Diet Fee & Quick Select */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div>
            <label className="block text-[11px] font-bold text-slate-700">
              Diet Plan Fee (₹)
            </label>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-black text-slate-400">₹</span>
              <input
                type="number"
                min={0}
                step={50}
                value={dietFee}
                onChange={(e) => setDietFee(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 self-end">
            {[0, 300, 500, 1000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setDietFee(amt)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                  dietFee === amt
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {amt === 0 ? "Free" : `₹${amt}`}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={handleGeneratePlan}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Generate 30-Day Plan</span>
          </button>

          <button
            type="button"
            disabled={isSaving || !planText}
            onClick={() => onSavePlan(planText, dietFee, false)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>Save Plan</span>
          </button>

          <button
            type="button"
            disabled={isSaving || !planText}
            onClick={() => onSavePlan(planText, dietFee, true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            title="Saves plan and sends directly to Reception for Fee Collection"
          >
            <Send className="w-4 h-4 text-emerald-200" />
            <span>Save & Send to Reception (₹{dietFee})</span>
          </button>
        </div>
      </div>

      {/* CRITICAL 30-MINUTE DIGESTION RULE BANNER */}
      <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-black text-amber-950">
            Mandatory Homeopathic Digestion Rule (30-Minute Protocol):
          </strong>{" "}
          Strictly avoid drinking water 30 minutes before and 30 minutes after major meals. This
          preserves the gastric fire (Agni) and prevents enzyme dilution. Sips of lukewarm water may
          be consumed between meals (aim for 2.5 - 3.5 Liters daily).
        </div>
      </div>

      {/* PLAN OUTPUT / EDITOR VIEW */}
      {planText ? (
        <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Personalized 30-Day Regimen (Breakfast, Lunch, Snacks, Dinner)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Selector: Table View vs Raw Text */}
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 rounded-md transition ${
                    viewMode === "table" ? "bg-sky-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📅 30-Day Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("raw")}
                  className={`px-3 py-1 rounded-md transition ${
                    viewMode === "raw" ? "bg-sky-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📝 Raw Text Editor
                </button>
              </div>

              {viewMode === "table" && (
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveDayFilter("all")}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      activeDayFilter === "all" ? "bg-slate-800 text-white" : "text-slate-600"
                    }`}
                  >
                    All 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDayFilter("1-15")}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      activeDayFilter === "1-15" ? "bg-slate-800 text-white" : "text-slate-600"
                    }`}
                  >
                    Days 1–15
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDayFilter("16-30")}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      activeDayFilter === "16-30" ? "bg-slate-800 text-white" : "text-slate-600"
                    }`}
                  >
                    Days 16–30
                  </button>
                </div>
              )}
            </div>
          </div>

          {viewMode === "table" ? (
            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-300 shadow-xs z-10">
                  <tr className="text-slate-800 font-black uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 border-r border-slate-200 w-16 text-center">Day</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-1/4 bg-amber-50/60 text-amber-950">
                      🌅 Breakfast (08:30 AM)
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-1/4 bg-sky-50/60 text-sky-950">
                      ☀️ Lunch (01:15 PM)
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-1/4 bg-emerald-50/60 text-emerald-950">
                      🍵 Snacks (05:00 PM)
                    </th>
                    <th className="py-2.5 px-3 w-1/4 bg-indigo-50/60 text-indigo-950">
                      🌙 Dinner (07:45 PM)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-700">
                  {displayedDays.map((d) => (
                    <tr
                      key={d.day}
                      className={d.day % 2 === 0 ? "bg-slate-50/50 hover:bg-sky-50/30" : "bg-white hover:bg-sky-50/30"}
                    >
                      <td className="py-2.5 px-3 border-r border-slate-200 font-black text-center text-sky-700 text-xs">
                        Day {d.day}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-[11px] leading-relaxed">
                        {d.breakfast}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-[11px] leading-relaxed">
                        {d.lunch}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-[11px] leading-relaxed">
                        {d.snacks}
                      </td>
                      <td className="py-2 px-3 text-[11px] leading-relaxed">
                        {d.dinner}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <textarea
              rows={isFullScreen ? 24 : 14}
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              className="w-full p-4 font-mono text-xs leading-relaxed text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 border-none resize-y"
              placeholder="Diet plan text will appear here once generated..."
            />
          )}
        </div>
      ) : null}

      {/* BMI REFERENCE MODAL */}
      {showBMIInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-black text-sm">
                  i
                </span>
                <h3 className="font-black text-slate-900 text-sm">
                  Body Mass Index (BMI) Reference Standards
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBMIInfoModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Body Mass Index is calculated as:{" "}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-bold">
                Weight (kg) ÷ [Height (m)]²
              </code>
              . It guides daily caloric density and clinical macro-nutrient distribution:
            </p>

            <div className="space-y-2">
              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/70 flex items-center justify-between text-xs">
                <div>
                  <span className="font-black text-blue-900">Underweight</span>
                  <div className="text-[11px] text-blue-700">
                    BMI &lt; 18.5 • Requires nutrient-dense healthy calories, protein & healthy fats
                  </div>
                </div>
                <span className="font-bold text-blue-900">&lt; 18.5</span>
              </div>

              <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 flex items-center justify-between text-xs">
                <div>
                  <span className="font-black text-emerald-900">Normal / Healthy Weight</span>
                  <div className="text-[11px] text-emerald-700">
                    BMI 18.5 – 24.9 • Optimal metabolic balance, focus on micronutrient repletion
                  </div>
                </div>
                <span className="font-bold text-emerald-900">18.5 - 24.9</span>
              </div>

              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 flex items-center justify-between text-xs">
                <div>
                  <span className="font-black text-amber-900">Overweight</span>
                  <div className="text-[11px] text-amber-700">
                    BMI 25.0 – 29.9 • Gentle caloric regulation, insulin stabilization, evening light meal
                  </div>
                </div>
                <span className="font-bold text-amber-900">25.0 - 29.9</span>
              </div>

              <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/70 flex items-center justify-between text-xs">
                <div>
                  <span className="font-black text-rose-900">Obesity Class I & II</span>
                  <div className="text-[11px] text-rose-700">
                    BMI 30.0 – 39.9 • Anti-inflammatory low-GI diet, gut restoration, 14-hr fast
                  </div>
                </div>
                <span className="font-bold text-rose-900">30.0 - 39.9</span>
              </div>

              <div className="p-2.5 rounded-lg border border-red-300 bg-red-50/70 flex items-center justify-between text-xs">
                <div>
                  <span className="font-black text-red-950">Severe / Morbid Obesity</span>
                  <div className="text-[11px] text-red-800">
                    BMI ≥ 40.0 • Strict elimination of refined sugars, trans-fats & comprehensive lifestyle
                  </div>
                </div>
                <span className="font-bold text-red-950">≥ 40.0</span>
              </div>
            </div>

            <div className="text-right pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBMIInfoModal(false)}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

