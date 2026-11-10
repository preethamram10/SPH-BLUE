"use client";

import React, { useState, useEffect } from "react";
import { Clock, Check } from "lucide-react";

interface AnalogClockPickerProps {
  value: string; // e.g. "10:30 AM"
  onChange: (time: string) => void;
  doctorName?: string;
}

export default function AnalogClockPicker({
  value,
  onChange,
  doctorName,
}: AnalogClockPickerProps) {
  // Parse incoming value or default to 10:00 AM
  const parseTime = (val: string) => {
    if (!val) return { hour: 10, minute: 0, period: "AM" as const };
    const match = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return { hour: 10, minute: 0, period: "AM" as const };
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const p = match[3].toUpperCase() === "PM" ? ("PM" as const) : ("AM" as const);
    if (h < 1 || h > 12) h = 10;
    return { hour: h, minute: isNaN(m) ? 0 : m, period: p };
  };

  const initial = parseTime(value);
  const [hour, setHour] = useState<number>(initial.hour);
  const [minute, setMinute] = useState<number>(initial.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period);
  const [pickerMode, setPickerMode] = useState<"hour" | "minute">("hour");

  useEffect(() => {
    if (value) {
      const parsed = parseTime(value);
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
    }
  }, [value]);

  const emitTime = (h: number, m: number, p: "AM" | "PM") => {
    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${p}`;
    onChange(formatted);
  };

  const handleSelectHour = (h: number) => {
    setHour(h);
    emitTime(h, minute, period);
    // Smoothly auto-switch to minute mode like standard Material Clock
    setPickerMode("minute");
  };

  const handleSelectMinute = (m: number) => {
    setMinute(m);
    emitTime(hour, m, period);
  };

  const handleTogglePeriod = (p: "AM" | "PM") => {
    setPeriod(p);
    emitTime(hour, minute, p);
  };

  // Dial Geometry (Diameter 240px, Center 120, Radius 86)
  const center = 120;
  const radius = 86;

  // Hours: 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  // Minutes: 00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  // Clock Hand angles
  const currentAngle =
    pickerMode === "hour"
      ? (hour % 12) * 30
      : (minute / 60) * 360;

  // Handle click anywhere on the clock face dial
  const handleDialClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;

    // Angle from 12 o'clock (top): 0 deg at top, clockwise
    let deg = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;

    if (pickerMode === "hour") {
      let selectedH = Math.round(deg / 30);
      if (selectedH === 0) selectedH = 12;
      if (selectedH > 12) selectedH = 12;
      handleSelectHour(selectedH);
    } else {
      let selectedM = Math.round(deg / 6);
      if (selectedM >= 60) selectedM = 0;
      // Round to nearest 5 minutes for clean scheduling
      selectedM = Math.round(selectedM / 5) * 5;
      if (selectedM >= 60) selectedM = 0;
      handleSelectMinute(selectedM);
    }
  };

  const currentTimeFormatted = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-sky-50/40 border border-sky-100 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#0284c7] flex items-center justify-center font-bold">
            <Clock className="w-4 h-4 text-[#0284c7]" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Online Consultation Time (Clock Dial)
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Click numbers on the clock to set hour and minutes. Doctor is available anytime.
            </p>
          </div>
        </div>

        {/* Selected Time Badge */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-sky-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400">Selected Time:</span>
          <span className="text-sm font-black text-[#0284c7] tracking-wide">
            {currentTimeFormatted}
          </span>
        </div>
      </div>

      {/* Main Clock Picker Layout */}
      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Digital Header Tabs: [ HOUR ] : [ MINUTE ] and [ AM | PM ] */}
        <div className="flex items-center gap-3 bg-slate-100/80 p-2 rounded-2xl border border-slate-200 shadow-inner">
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl shadow-sm border border-slate-200/70">
            {/* Hour Button */}
            <button
              type="button"
              onClick={() => setPickerMode("hour")}
              className={`px-3 py-1.5 rounded-lg text-2xl font-black transition-all ${
                pickerMode === "hour"
                  ? "bg-[#0284c7] text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              title="Click to select Hour on clock"
            >
              {String(hour).padStart(2, "0")}
            </button>

            <span className="text-2xl font-black text-slate-400 px-0.5 animate-pulse">:</span>

            {/* Minute Button */}
            <button
              type="button"
              onClick={() => setPickerMode("minute")}
              className={`px-3 py-1.5 rounded-lg text-2xl font-black transition-all ${
                pickerMode === "minute"
                  ? "bg-[#0284c7] text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              title="Click to select Minute on clock"
            >
              {String(minute).padStart(2, "0")}
            </button>
          </div>

          {/* AM / PM Segmented Control */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200/70 shadow-sm">
            <button
              type="button"
              onClick={() => handleTogglePeriod("AM")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                period === "AM"
                  ? "bg-[#0284c7] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handleTogglePeriod("PM")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                period === "PM"
                  ? "bg-[#0284c7] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              PM
            </button>
          </div>
        </div>

        {/* Mode Indicator & Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Currently setting:</span>
          <button
            type="button"
            onClick={() => setPickerMode(pickerMode === "hour" ? "minute" : "hour")}
            className="text-xs font-black px-2.5 py-1 rounded-full bg-sky-100 text-[#0284c7] hover:bg-sky-200 transition-colors uppercase tracking-wider"
          >
            {pickerMode === "hour" ? "Hour (1 - 12) 👉 Switch to Minutes" : "Minutes (:00 - :55) 👉 Switch to Hour"}
          </button>
        </div>

        {/* Analog Clock Face (240px) */}
        <div
          onClick={handleDialClick}
          className="relative w-[240px] h-[240px] rounded-full bg-white border-4 border-slate-200/90 shadow-lg flex items-center justify-center select-none cursor-pointer hover:border-sky-300 transition-colors"
          style={{ touchAction: "none" }}
        >
          {/* Subtle 5-minute tick ring / center guide */}
          <div className="absolute w-[220px] h-[220px] rounded-full border border-dashed border-slate-200/60 pointer-events-none" />

          {/* Center Axis Pin */}
          <div className="absolute w-4 h-4 bg-[#0284c7] rounded-full z-30 shadow-md border-2 border-white pointer-events-none" />

          {/* Clock Hand Pointer */}
          <div
            className="absolute origin-bottom transition-transform duration-200 ease-out pointer-events-none z-10"
            style={{
              width: "3px",
              height: pickerMode === "hour" ? "56px" : "78px",
              bottom: "120px",
              left: "calc(50% - 1.5px)",
              transform: `rotate(${currentAngle}deg)`,
              backgroundColor: "#0284c7",
            }}
          >
            {/* Hand End Circle Knob */}
            <div
              className="absolute -top-3.5 -left-3.5 w-8 h-8 rounded-full bg-[#0284c7] opacity-25"
            />
          </div>

          {/* Clock Dial Numbers */}
          {pickerMode === "hour"
            ? hoursList.map((num) => {
                const angle = (num * 30 - 90) * (Math.PI / 180);
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                const isSelected = hour === num;

                return (
                  <button
                    key={`h-${num}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectHour(num);
                    }}
                    style={{
                      position: "absolute",
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all z-20 cursor-pointer ${
                      isSelected
                        ? "bg-[#0284c7] text-white shadow-md scale-110 ring-4 ring-sky-200"
                        : "text-slate-700 hover:bg-sky-100 hover:text-[#0284c7]"
                    }`}
                    title={`Select ${num} o'clock`}
                  >
                    {num}
                  </button>
                );
              })
            : minutesList.map((m) => {
                const angle = (m * 6 - 90) * (Math.PI / 180);
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                const isSelected = minute === m;

                return (
                  <button
                    key={`m-${m}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectMinute(m);
                    }}
                    style={{
                      position: "absolute",
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all z-20 cursor-pointer ${
                      isSelected
                        ? "bg-[#0284c7] text-white shadow-md scale-110 ring-4 ring-sky-200"
                        : "text-slate-700 hover:bg-sky-100 hover:text-[#0284c7]"
                    }`}
                    title={`Select :${String(m).padStart(2, "0")} minutes`}
                  >
                    {String(m).padStart(2, "0")}
                  </button>
                );
              })}
        </div>

        <p className="text-[11px] text-slate-400 font-medium">
          {pickerMode === "hour"
            ? "Click an hour on the dial to set hour, then it switches to minutes"
            : "Click a minute on the dial (:00, :05, :10 ... :55)"}
        </p>
      </div>

      {/* Online Confirmation Banner */}
      <div className="flex items-center gap-2 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          Selected Online Time: <strong>{currentTimeFormatted}</strong> with{" "}
          <strong>{doctorName || "Selected Doctor"}</strong>. Online consultations do not block in-clinic room slots.
        </span>
      </div>
    </div>
  );
}
