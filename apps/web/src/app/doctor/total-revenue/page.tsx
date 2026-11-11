"use client";

import React, { useState, useEffect } from "react";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Stethoscope,
  Lock,
} from "lucide-react";

export default function DoctorTotalRevenuePage() {
  const router = useRouter();
  const [revenueData, setRevenueData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [doctorName, setDoctorName] = useState("Dr. Prashanth K Vaidya");

  useEffect(() => {
    const savedDoc = localStorage.getItem("doctor_name") || "Dr. Prashanth K Vaidya";
    setDoctorName(savedDoc);
    const isHead = savedDoc.toLowerCase().includes("prashanth") || savedDoc.toLowerCase().includes("head");
    if (isHead) {
      router.replace("/admin/total-revenue");
      return;
    }

    fetch("/api/doctor/revenue")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRevenueData(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [router]);

  const isHeadDoctor =
    doctorName.toLowerCase().includes("prashanth") ||
    doctorName.toLowerCase().includes("head");

  if (!isHeadDoctor) {
    return (
      <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
        <DoctorSidebar activePage="dashboard" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Restricted Access</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Total Revenue analytics is restricted to Head Doctors, Clinic Administration & HR only.
          </p>
          <a
            href="/doctor/dashboard"
            className="mt-4 px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition"
          >
            Return to Doctor Dashboard
          </a>
        </div>
      </div>
    );
  }

  const stats = revenueData?.stats || {
    doctorName: "Dr. Prashanth K Vaidya",
    totalRevenue: 38500,
    consultationEarnings: 6500,
    packageEarnings: 32000,
    completedConsultations: 13,
    pendingConsultations: 4,
    monthlyTarget: 50000,
    targetProgress: 77,
  };

  const transactions = revenueData?.recentTransactions || [];

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <DoctorSidebar activePage="total-revenue" />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Doctor Total Revenue &amp; Earnings</h2>
                <p className="text-[10px] text-slate-400">Consultation Fees &amp; Treatment Package Earnings</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Current Month Overview</span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-3.5 max-w-7xl w-full mx-auto space-y-3.5">
          {/* Head Doctor Banner */}
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0284c7] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                👑
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900">Head Doctor Master Revenue Access</h3>
                  <span className="text-[9px] font-black text-[#0284c7] bg-sky-100 border border-sky-300 px-1.5 py-0.2 rounded">
                    AUTHORIZED
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Access multi-branch collections, custom date filters, payment methods &amp; page-wise transaction ledger.
                </p>
              </div>
            </div>
            <a
              href="/admin/total-revenue"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
            >
              <span>View Clinic Master Revenue</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Top Revenue Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Card 1: Total Earnings */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Total Generated Revenue</p>
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-3 h-3" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xl font-black text-emerald-600">₹{stats.totalRevenue.toLocaleString("en-IN")}</p>
                <span className="text-[10px] text-emerald-700 font-semibold">{stats.targetProgress}% of ₹50k monthly target</span>
              </div>
            </div>

            {/* Card 2: Consultation Fees */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Consultation Fees</p>
                <div className="w-6 h-6 rounded-md bg-sky-50 text-[#0284c7] flex items-center justify-center">
                  <Stethoscope className="w-3 h-3" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xl font-black text-[#0284c7]">₹{stats.consultationEarnings.toLocaleString("en-IN")}</p>
                <span className="text-[10px] text-slate-400 font-medium">{stats.completedConsultations} Completed Cases</span>
              </div>
            </div>

            {/* Card 3: Package Revenue */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Package Conversions</p>
                <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Package className="w-3 h-3" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xl font-black text-amber-600">₹{stats.packageEarnings.toLocaleString("en-IN")}</p>
                <span className="text-[10px] text-amber-700 font-medium">Annual &amp; Semi-Annual Plans</span>
              </div>
            </div>

            {/* Card 4: Patients Treated */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Patient Volume</p>
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xl font-black text-slate-800">{stats.completedConsultations + stats.pendingConsultations}</p>
                <span className="text-[10px] text-slate-400 font-medium">{stats.pendingConsultations} Pending in queue</span>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown / Transactions Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Recent Consultation Earnings</h3>
              <span className="text-[10.5px] text-slate-400">Real-time doctor fee tracking</span>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading revenue records...</div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No completed consultations recorded today.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Patient Details</th>
                      <th className="py-2 px-3">Clinical Service</th>
                      <th className="py-2 px-3">Mode</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">{tx.date}</td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 text-xs block">{tx.patientName}</span>
                          <span className="text-[10px] text-slate-400">{tx.registrationId}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-medium">{tx.service}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-slate-100 text-slate-600">
                            {tx.paymentMode}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-black text-emerald-600 text-xs">₹{tx.amount}</td>
                        <td className="py-2 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

