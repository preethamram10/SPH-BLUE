"use client";

import React, { useState, useEffect } from "react";
import { Clock, Plus, Minus, Check } from "lucide-react";

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
  };

  const handleSelectMinute = (m: number) => {
    setMinute(m);
    emitTime(hour, m, period);
  };

  const handleStepMinute = (delta: number) => {
    let nextM = minute + delta;
    if (nextM >= 60) nextM = 0;
    if (nextM < 0) nextM = 55;
    setMinute(nextM);
    emitTime(hour, nextM, period);
  };

  const handleTogglePeriod = (p: "AM" | "PM") => {
    setPeriod(p);
    emitTime(hour, minute, p);
  };

  const handleQuickPreset = (presetStr: string) => {
    const parsed = parseTime(presetStr);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setPeriod(parsed.period);
    onChange(presetStr);
  };

  // Clock Hand angles
  // Hour hand: 30 deg per hour + 0.5 deg per minute
  const hourAngle = (hour % 12) * 30 + (minute / 60) * 30;
  // Minute hand: 6 deg per minute
  const minuteAngle = minute * 6;

  // Geometry for 12 hours around a 200px diameter circle (center: 100, 100, radius: 76)
  const clockNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const radius = 76;
  const center = 100;

  const quickPresets = [
    "09:00 AM",
    "10:30 AM",
    "11:45 AM",
    "02:00 PM",
    "03:30 PM",
    "05:00 PM",
    "06:30 PM",
    "08:00 PM",
  ];

  const currentTimeFormatted = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-sky-50/40 border border-sky-100 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#0284c7] flex items-center justify-center font-bold">
            <Clock className="w-4 h-4 text-[#0284c7]" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Online Consultation Time (Analog Clock)
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Doctor is available at any time. Pick your preferred consultation time below.
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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Analog Clock Circle Face */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-[200px] h-[200px] rounded-full bg-white border-4 border-slate-200/80 shadow-inner flex items-center justify-center select-none">
            {/* Center Axis Pin */}
            <div className="absolute w-3.5 h-3.5 bg-[#0284c7] rounded-full z-20 shadow-md border-2 border-white" />

            {/* Hour Hand */}
            <div
              className="absolute w-1.5 bg-slate-800 rounded-full z-10 origin-bottom transition-transform duration-200 ease-out shadow-sm"
              style={{
                height: "44px",
                bottom: "100px",
                left: "calc(50% - 3px)",
                transform: `rotate(${hourAngle}deg)`,
              }}
            />

            {/* Minute Hand */}
            <div
              className="absolute w-1 bg-[#0284c7] rounded-full z-15 origin-bottom transition-transform duration-200 ease-out shadow-sm"
              style={{
                height: "64px",
                bottom: "100px",
                left: "calc(50% - 2px)",
                transform: `rotate(${minuteAngle}deg)`,
              }}
            />

            {/* 12 Hour Number Buttons around the circle */}
            {clockNumbers.map((num) => {
              const angle = (num * 30 - 90) * (Math.PI / 180);
              const x = center + radius * Math.cos(angle);
              const y = center + radius * Math.sin(angle);
              const isSelected = hour === num;

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSelectHour(num)}
                  style={{
                    position: "absolute",
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-[#0284c7] text-white ring-2 ring-sky-300 shadow-md scale-110 z-20"
                      : "text-slate-600 hover:bg-sky-50 hover:text-[#0284c7]"
                  }`}
                  title={`Select ${num} o'clock`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 font-semibold mt-2.5">
            Click any number on the dial to set hour
          </p>
        </div>

        {/* Right: Minute Selection, AM/PM Toggle, and Quick Chips */}
        <div className="md:col-span-7 space-y-4">
          {/* Digital Time & AM/PM Selector Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">
                Consultation Hour
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black text-slate-800">
                  {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
                </span>
                <span className="text-sm font-extrabold text-[#0284c7]">
                  {period}
                </span>
              </div>
            </div>

            {/* AM / PM Segmented Control */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
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

          {/* Minute Adjuster Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Minutes
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[0, 15, 30, 45].map((m) => {
                const isSelected = minute === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelectMinute(m)}
                    className={`flex-1 min-w-[50px] py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? "bg-[#0284c7] border-[#0284c7] text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50/50"
                    }`}
                  >
                    :{String(m).padStart(2, "0")}
                  </button>
                );
              })}

              {/* Stepper Buttons for fine-tuning */}
              <button
                type="button"
                onClick={() => handleStepMinute(-5)}
                className="p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all active:scale-95"
                title="Subtract 5 minutes"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleStepMinute(5)}
                className="p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all active:scale-95"
                title="Add 5 minutes"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Preset Times */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Quick Popular Times
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {quickPresets.map((preset) => {
                const isSelected = value === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickPreset(preset)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center truncate ${
                      isSelected
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                        : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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
