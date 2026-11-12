"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Shield,
  Building2,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Mail,
  Key,
  Phone,
  Edit2,
  Trash2,
  Plus,
  X,
  Eye,
  EyeOff,
  Clock,
  Briefcase,
  Check,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  category: "STAFF" | "DOCTOR" | "HR";
  doctorCategory?: "HEAD" | "EMPLOYEE";
  email?: string;
  password?: string;
  phone: string;
  branchName: string;
  salary: number;
  shiftType: "SINGLE_STRICT" | "MULTI_STRICT";
  shiftHours: string;
  dailyHours: string;
  shift1Start?: string;
  shift1End?: string;
  shift2Start?: string;
  shift2End?: string;
  isAccessGranted?: boolean;
  shiftStartTime?: string;
  graceMinutes?: number;
  qualification?: string;
  specialty?: string;
  status?: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function StaffManagementPage() {
  const router = useRouter();

  // Active Category: Staff Members, Doctors, HR
  const [activeCategory, setActiveCategory] = useState<"STAFF" | "DOCTOR" | "HR">("STAFF");

  // Employees data: synchronized live with backend API
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form Fields - Common
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBranch, setFormBranch] = useState("KPHB");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("email123");
  const [showPassword, setShowPassword] = useState(false);
  const [formSalary, setFormSalary] = useState("25000");
  const [formAccessGranted, setFormAccessGranted] = useState(false);
  const [formGraceMinutes, setFormGraceMinutes] = useState("15");

  // Doctor Specific
  const [doctorCategory, setDoctorCategory] = useState<"HEAD" | "EMPLOYEE">("EMPLOYEE");
  const [formQualification, setFormQualification] = useState("");
  const [formSpecialty, setFormSpecialty] = useState("");

  // Shift & Hours State
  const [shiftType, setShiftType] = useState<"SINGLE_STRICT" | "MULTI_STRICT">("SINGLE_STRICT");
  // Single shift times
  const [loginHour, setLoginHour] = useState("09");
  const [loginMin, setLoginMin] = useState("00");
  const [loginAmPm, setLoginAmPm] = useState("AM");
  const [logoutHour, setLogoutHour] = useState("06");
  const [logoutMin, setLogoutMin] = useState("00");
  const [logoutAmPm, setLogoutAmPm] = useState("PM");

  // Multi shift (split shift) times
  const [s1LoginH, setS1LoginH] = useState("10");
  const [s1LoginM, setS1LoginM] = useState("00");
  const [s1LoginAmPm, setS1LoginAmPm] = useState("AM");
  const [s1LogoutH, setS1LogoutH] = useState("02");
  const [s1LogoutM, setS1LogoutM] = useState("00");
  const [s1LogoutAmPm, setS1LogoutAmPm] = useState("PM");

  const [s2LoginH, setS2LoginH] = useState("04");
  const [s2LoginM, setS2LoginM] = useState("30");
  const [s2LoginAmPm, setS2LoginAmPm] = useState("PM");
  const [s2LogoutH, setS2LogoutH] = useState("08");
  const [s2LogoutM, setS2LogoutM] = useState("30");
  const [s2LogoutAmPm, setS2LogoutAmPm] = useState("PM");

  // Fetch employees and branches on mount
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/employees");
      const data = await res.json();
      if (data.success && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      const list = data.data || data.branches || [];
      if (Array.isArray(list) && list.length > 0) {
        setBranches(list);
        if (!formBranch) {
          setFormBranch(list[0].name.replace(/Spiritual Homeopathy/gi, "").replace(/Branch/gi, "").trim() || "KPHB");
        }
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, []);

  // Helper: Calculate daily hours dynamically
  const calculateHours = (
    h1: string, m1: string, ap1: string,
    h2: string, m2: string, ap2: string
  ): number => {
    let hour1 = parseInt(h1, 10) || 9;
    if (ap1 === "PM" && hour1 !== 12) hour1 += 12;
    if (ap1 === "AM" && hour1 === 12) hour1 = 0;
    const min1 = parseInt(m1, 10) || 0;

    let hour2 = parseInt(h2, 10) || 18;
    if (ap2 === "PM" && hour2 !== 12) hour2 += 12;
    if (ap2 === "AM" && hour2 === 12) hour2 = 0;
    const min2 = parseInt(m2, 10) || 0;

    const diffMinutes = (hour2 * 60 + min2) - (hour1 * 60 + min1);
    const hrs = diffMinutes > 0 ? diffMinutes / 60 : 8;
    return parseFloat(hrs.toFixed(1));
  };

  const calculatedDailyHours = useMemo(() => {
    if (shiftType === "SINGLE_STRICT") {
      const total = calculateHours(loginHour, loginMin, loginAmPm, logoutHour, logoutMin, logoutAmPm);
      return `${total} hrs/day`;
    } else {
      const shift1 = calculateHours(s1LoginH, s1LoginM, s1LoginAmPm, s1LogoutH, s1LogoutM, s1LogoutAmPm);
      const shift2 = calculateHours(s2LoginH, s2LoginM, s2LoginAmPm, s2LogoutH, s2LogoutM, s2LogoutAmPm);
      const total = parseFloat((shift1 + shift2).toFixed(1));
      return `${total} hrs/day`;
    }
  }, [
    shiftType,
    loginHour, loginMin, loginAmPm, logoutHour, logoutMin, logoutAmPm,
    s1LoginH, s1LoginM, s1LoginAmPm, s1LogoutH, s1LogoutM, s1LogoutAmPm,
    s2LoginH, s2LoginM, s2LoginAmPm, s2LogoutH, s2LogoutM, s2LogoutAmPm,
  ]);

  const formattedShiftHours = useMemo(() => {
    if (shiftType === "SINGLE_STRICT") {
      return `${loginHour}:${loginMin} ${loginAmPm} - ${logoutHour}:${logoutMin} ${logoutAmPm}`;
    } else {
      return `Shift 1: ${s1LoginH}:${s1LoginM} ${s1LoginAmPm} - ${s1LogoutH}:${s1LogoutM} ${s1LogoutAmPm} | Shift 2: ${s2LoginH}:${s2LoginM} ${s2LoginAmPm} - ${s2LogoutH}:${s2LogoutM} ${s2LogoutAmPm}`;
    }
  }, [
    shiftType,
    loginHour, loginMin, loginAmPm, logoutHour, logoutMin, logoutAmPm,
    s1LoginH, s1LoginM, s1LoginAmPm, s1LogoutH, s1LogoutM, s1LogoutAmPm,
    s2LoginH, s2LoginM, s2LoginAmPm, s2LogoutH, s2LogoutM, s2LogoutAmPm,
  ]);

  // Reset form to defaults
  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormBranch(branches[0]?.name ? branches[0].name.replace(/Spiritual Homeopathy/gi, "").replace(/Branch/gi, "").trim() : "KPHB");
    setFormEmail("");
    setFormPassword("");
    setFormSalary("25000");
    setDoctorCategory("EMPLOYEE");
    setShiftType("SINGLE_STRICT");
    setLoginHour("09");
    setLoginMin("00");
    setLoginAmPm("AM");
    setLogoutHour("06");
    setLogoutMin("00");
    setLogoutAmPm("PM");
    setFormAccessGranted(true);
    setFormGraceMinutes("15");
    setFormQualification("");
    setFormSpecialty("");
    setEditingEmployee(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    if (activeCategory === "DOCTOR") {
      setIsAddDoctorOpen(true);
    } else {
      setIsAddStaffOpen(true);
    }
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormName(emp.name);
    setFormPhone(emp.phone.replace("+91", "").trim());
    setFormBranch(emp.branchName);
    setFormEmail(emp.email || "");
    setFormPassword(emp.password || "");
    setFormSalary(String(emp.salary));
    setShiftType(emp.shiftType || "SINGLE_STRICT");
    setFormAccessGranted(emp.isAccessGranted !== false);
    setFormGraceMinutes(String(emp.graceMinutes || 15));
    setFormQualification(emp.qualification || "");
    setFormSpecialty(emp.specialty || "");
    if (emp.doctorCategory) setDoctorCategory(emp.doctorCategory);

    if (emp.category === "DOCTOR") {
      setIsAddDoctorOpen(true);
    } else {
      setIsAddStaffOpen(true);
    }
  };

  // Submit Handler for Staff / Doctor creation or edit
  const handleSaveEmployee = async (categoryToSave: "STAFF" | "DOCTOR" | "HR") => {
    if (!formName.trim() || !formPhone.trim()) {
      alert("Please enter Name and Mobile number.");
      return;
    }

    if (categoryToSave === "HR" && (!formEmail.trim() || !formPassword.trim())) {
      alert("Please enter HR Login ID and Password.");
      return;
    }

    const isHeadDoctor = categoryToSave === "DOCTOR" && doctorCategory === "HEAD";
    const isHR = categoryToSave === "HR";

    const payload = {
      id: editingEmployee ? editingEmployee.id : undefined,
      name: formName.trim(),
      category: categoryToSave,
      doctorCategory: categoryToSave === "DOCTOR" ? doctorCategory : undefined,
      email: formEmail.trim() || "",
      password: formPassword.trim() || "",
      phone: formPhone.trim().startsWith("+91") ? formPhone.trim() : `+91 ${formPhone.trim()}`,
      branchName: (categoryToSave === "STAFF" || categoryToSave === "DOCTOR") ? (formBranch?.trim() || "KPHB") : "",
      salary: (isHeadDoctor || isHR) ? 0 : (parseInt(formSalary, 10) || 0),
      shiftType: (isHeadDoctor || isHR) ? "SINGLE_STRICT" : shiftType,
      shiftHours: (isHeadDoctor || isHR) ? "-" : formattedShiftHours,
      dailyHours: (isHeadDoctor || isHR) ? "-" : calculatedDailyHours,
      shift1Start: (isHeadDoctor || isHR) ? undefined : (shiftType === "MULTI_STRICT" ? `${s1LoginH}:${s1LoginM} ${s1LoginAmPm}` : `${loginHour}:${loginMin} ${loginAmPm}`),
      shift1End: (isHeadDoctor || isHR) ? undefined : (shiftType === "MULTI_STRICT" ? `${s1LogoutH}:${s1LogoutM} ${s1LogoutAmPm}` : `${logoutHour}:${logoutMin} ${logoutAmPm}`),
      shift2Start: (isHeadDoctor || isHR) ? undefined : (shiftType === "MULTI_STRICT" ? `${s2LoginH}:${s2LoginM} ${s2LoginAmPm}` : undefined),
      shift2End: (isHeadDoctor || isHR) ? undefined : (shiftType === "MULTI_STRICT" ? `${s2LogoutH}:${s2LogoutM} ${s2LogoutAmPm}` : undefined),
      isAccessGranted: true,
      shiftStartTime: `${loginHour}:${loginMin} ${loginAmPm}`,
      graceMinutes: parseInt(formGraceMinutes, 10) || 15,
      qualification: formQualification.trim() || undefined,
      specialty: formSpecialty.trim() || undefined,
    };

    try {
      const res = await fetch("/api/admin/employees", {
        method: editingEmployee ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAddStaffOpen(false);
        setIsAddDoctorOpen(false);
        resetForm();
        await fetchEmployees();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save record");
      }
    } catch (err: any) {
      alert("Error saving employee: " + err.message);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/employees?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchEmployees();
      } else {
        alert("Failed to delete record");
      }
    } catch {
      alert("Network error while deleting");
    }
  };

  // Toggle staff login access (Admin or HR grants/revokes access)
  const handleToggleAccess = async (emp: Employee) => {
    const nextAccess = emp.isAccessGranted === false;
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}/toggle-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAccessGranted: nextAccess }),
      });
      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === emp.id ? { ...e, isAccessGranted: nextAccess } : e))
        );
      } else {
        alert("Failed to update staff access");
      }
    } catch {
      alert("Network error updating access");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user_role");
    router.replace("/login");
  };

  // Filter employees matching active tab
  const filteredEmployees = employees.filter((emp) => emp.category === activeCategory);

  // Clean branch name helper
  const cleanBranch = (name: string) => {
    return name.replace(/Spiritual Homeopathy/gi, "").replace(/Branch/gi, "").trim() || "KPHB";
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      {/* UNIFIED ADMIN SIDEBAR */}
      <AdminSidebar currentPath="/admin/employee-management" />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <main className="flex-1 p-8 max-w-[1380px] w-full mx-auto space-y-6">
          {/* Header Title & Subtitle */}
          <div>
            <h2 className="text-[22px] font-extrabold text-slate-900 tracking-tight">
              Staff Management &amp; Working Hours
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Select a category below to view and manage working hours, shifts, and compensation.
            </p>
          </div>

          {/* Category Tabs & Add Button (Staff Members, Doctors, HR) */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 shadow-inner">
              {[
                { id: "STAFF", label: "Staff Members" },
                { id: "DOCTOR", label: "Doctors" },
                { id: "HR", label: "HR" },
              ].map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id as any)}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-white text-[#0284c7] shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Action Button: + Add Staff or + Add Doctor or + Add HR Member */}
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {activeCategory === "DOCTOR"
                  ? "+ Add Doctor"
                  : activeCategory === "HR"
                  ? "+ Add HR Member"
                  : "+ Add Staff"}
              </span>
            </button>
          </div>

          {/* Table Container (Matching Screenshot media_1793823296865_138980c4.jpg) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* Header */}
                <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-[11px] font-bold text-slate-700 tracking-wider">
                  <tr>
                    <th className="px-6 py-4">
                      {activeCategory === "DOCTOR" ? "DOCTOR NAME" : activeCategory === "HR" ? "HR NAME" : "STAFF NAME"}
                    </th>
                    <th className="px-6 py-4">MOBILE NUMBER</th>
                    {(activeCategory === "STAFF" || activeCategory === "DOCTOR") && <th className="px-6 py-4">ASSIGNED BRANCH</th>}
                    {activeCategory === "HR" && <th className="px-6 py-4">LOGIN ID</th>}
                    {activeCategory !== "HR" && (
                      <>
                        <th className="px-6 py-4">SHIFT HOURS</th>
                        <th className="px-6 py-4">DAILY HOURS</th>
                        <th className="px-6 py-4">MONTHLY SALARY</th>
                      </>
                    )}
                    <th className="px-6 py-4 text-center">ACTIONS</th>
                  </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={activeCategory === "HR" ? 4 : 7} className="px-6 py-12 text-center text-slate-400">
                        Loading {activeCategory === "DOCTOR" ? "doctors" : activeCategory === "HR" ? "HR staff" : "staff members"}...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={activeCategory === "HR" ? 4 : 7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Users className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                          <p className="text-sm font-semibold text-slate-700">
                            No {activeCategory === "DOCTOR" ? "doctors" : activeCategory === "HR" ? "HR staff" : "staff members"} found
                          </p>
                          <p className="text-xs text-slate-400">
                            Click &quot;{activeCategory === "DOCTOR" ? "+ Add Doctor" : activeCategory === "HR" ? "+ Add HR Member" : "+ Add Staff"}&quot; to add a new record.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isMulti = emp.shiftType === "MULTI_STRICT" || emp.shiftHours?.includes("|");
                      const isHeadDoc = emp.category === "DOCTOR" && emp.doctorCategory === "HEAD";
                      const isDoctor = emp.category === "DOCTOR";

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* 1. NAME */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{emp.name}</span>
                                {isDoctor && (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      isHeadDoc
                                        ? "bg-slate-900 text-white shadow-xs"
                                        : "bg-sky-50 text-[#0284c7] border border-sky-200"
                                    }`}
                                  >
                                    {isHeadDoc ? "Head Doctor" : "Consulting Doctor"}
                                  </span>
                                )}
                              </div>
                              {isDoctor && (emp.qualification || emp.specialty) && (
                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                                  <span>🩺</span>
                                  <span>{[emp.qualification, emp.specialty].filter(Boolean).join(" • ")}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 2. MOBILE NUMBER */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                              <span className="text-[#0284c7]">📞</span>
                              <span>{emp.phone}</span>
                            </div>
                          </td>

                          {/* 3. ASSIGNED BRANCH (Staff & Doctor) */}
                          {(activeCategory === "STAFF" || activeCategory === "DOCTOR") && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <span className="text-[#0284c7]">📍</span>
                                <span>{emp.branchName || "All Branches"}</span>
                              </div>
                            </td>
                          )}

                          {/* 4. LOGIN ID (HR Only) */}
                          {activeCategory === "HR" && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono text-xs text-slate-700 font-semibold">
                                {emp.email || "-"}
                              </span>
                            </td>
                          )}

                          {/* 5. SHIFT HOURS, DAILY HOURS, SALARY (Staff & Doctor Only) */}
                          {activeCategory !== "HR" && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {isHeadDoc ? (
                                  <span className="text-slate-400 font-medium text-xs">-</span>
                                ) : !isMulti ? (
                                  <span className="font-medium text-slate-700 text-xs">
                                    {emp.shiftHours && emp.shiftHours !== "-" ? emp.shiftHours : "-"}
                                  </span>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#0284c7] font-bold text-[10px]">
                                        Shift 1
                                      </span>
                                      <span className="font-medium text-slate-700">
                                        {emp.shift1Start && emp.shift1End
                                          ? `${emp.shift1Start} - ${emp.shift1End}`
                                          : "10:00 AM - 02:00 PM"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#0284c7] font-bold text-[10px]">
                                        Shift 2
                                      </span>
                                      <span className="font-medium text-slate-700">
                                        {emp.shift2Start && emp.shift2End
                                          ? `${emp.shift2Start} - ${emp.shift2End}`
                                          : "04:30 PM - 08:30 PM"}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                {isHeadDoc ? (
                                  <span className="text-slate-400 font-medium text-xs">-</span>
                                ) : (
                                  <span className="text-emerald-600 font-bold text-xs">
                                    {emp.dailyHours && emp.dailyHours !== "-" ? emp.dailyHours : "-"}
                                  </span>
                                )}
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                {isHeadDoc || !emp.salary ? (
                                  <span className="text-slate-400 font-medium text-xs">-</span>
                                ) : (
                                  <span className="font-extrabold text-slate-900 text-xs">
                                    ₹{emp.salary.toLocaleString("en-IN")}
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {/* ACTIONS */}
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEdit(emp)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#0284c7] font-bold text-xs transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDelete(emp.id, emp.name)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* =================================================================== */}
      {/* ➕ ADD / EDIT STAFF MEMBER MODAL                                   */}
      {/* =================================================================== */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingEmployee
                    ? `✏️ Edit ${activeCategory === "HR" ? "HR Member" : "Staff Member"}`
                    : `➕ Add ${activeCategory === "HR" ? "HR Member" : "Staff Member"}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeCategory === "HR"
                    ? "Enter HR member details, login ID and password."
                    : "Assign branch location, monthly salary & shift timings."}
                </p>
              </div>
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200/60 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Assign Staff Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Assign Staff Role
                </label>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[#0284c7] font-bold text-xs">
                  <span>
                    {activeCategory === "HR"
                      ? "HR Staff"
                      : "Regular Staff"}
                  </span>
                </div>
              </div>

              {/* Full Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number (without +91) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="without +91 (e.g. 9876543210)"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                  />
                </div>
              </div>

              {/* FOR HR: Login ID & Password ONLY */}
              {activeCategory === "HR" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      HR Login ID / Email ID *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. hr.divya or divya@sph.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Login Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-slate-600 font-semibold hover:underline"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter HR login password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* FOR STAFF ONLY: Assign to Branch */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Assign to Branch *
                    </label>
                    <select
                      value={formBranch}
                      onChange={(e) => setFormBranch(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    >
                      {branches.length === 0 ? (
                        <>
                          <option value="KPHB">KPHB</option>
                          <option value="Nallagandla">Nallagandla</option>
                          <option value="Chandanagar">Chandanagar</option>
                          <option value="Dilshuknagar">Dilshuknagar</option>
                        </>
                      ) : (
                        branches.map((b) => (
                          <option key={b.id} value={cleanBranch(b.name)}>
                            {cleanBranch(b.name)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Salary & Work Schedule Container */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                    <span>💼</span>
                    <span>Salary &amp; Work Schedule</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                    ⏱️ {calculatedDailyHours}
                  </span>
                </div>

                {/* Base Salary */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Base Salary (Rs)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                  />
                </div>

                {/* Shift Type Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shift Type
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShiftType("SINGLE_STRICT")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        shiftType === "SINGLE_STRICT"
                          ? "bg-[#0284c7] text-white border-[#0284c7]"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Single Strict
                    </button>
                    <button
                      type="button"
                      onClick={() => setShiftType("MULTI_STRICT")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        shiftType === "MULTI_STRICT"
                          ? "bg-[#0284c7] text-white border-[#0284c7]"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Multi Strict
                    </button>
                  </div>
                </div>

                {/* Shift Hours Schedule */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Shift Hours Schedule
                  </label>

                  {shiftType === "SINGLE_STRICT" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Login Time */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                          ⏰ Login Time
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={2}
                            value={loginHour}
                            onChange={(e) => setLoginHour(e.target.value)}
                            className="w-10 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          />
                          <span className="font-bold">:</span>
                          <input
                            type="text"
                            maxLength={2}
                            value={loginMin}
                            onChange={(e) => setLoginMin(e.target.value)}
                            className="w-10 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          />
                          <select
                            value={loginAmPm}
                            onChange={(e) => setLoginAmPm(e.target.value)}
                            className="py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>

                      {/* Logout Time */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                          ⏰ Logout Time
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={2}
                            value={logoutHour}
                            onChange={(e) => setLogoutHour(e.target.value)}
                            className="w-10 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          />
                          <span className="font-bold">:</span>
                          <input
                            type="text"
                            maxLength={2}
                            value={logoutMin}
                            onChange={(e) => setLogoutMin(e.target.value)}
                            className="w-10 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          />
                          <select
                            value={logoutAmPm}
                            onChange={(e) => setLogoutAmPm(e.target.value)}
                            className="py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Multi Strict (2 Shifts) */
                    <div className="space-y-2">
                      {/* Shift 1 */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0284c7]">Shift 1</span>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              maxLength={2}
                              value={s1LoginH}
                              onChange={(e) => setS1LoginH(e.target.value)}
                              className="w-8 text-center py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                            />
                            <span>:</span>
                            <input
                              type="text"
                              maxLength={2}
                              value={s1LoginM}
                              onChange={(e) => setS1LoginM(e.target.value)}
                              className="w-8 text-center py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                            />
                            <select
                              value={s1LoginAmPm}
                              onChange={(e) => setS1LoginAmPm(e.target.value)}
                              className="py-1 px-1 bg-white border border-slate-200 rounded text-[11px] font-bold"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                          <span className="text-slate-400">to</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              maxLength={2}
                              value={s1LogoutH}
                              onChange={(e) => setS1LogoutH(e.target.value)}
                              className="w-8 text-center py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                            />
                            <span>:</span>
                            <input
                              type="text"
                              maxLength={2}
                              value={s1LogoutM}
                              onChange={(e) => setS1LogoutM(e.target.value)}
                              className="w-8 text-center py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                            />
                            <select
                              value={s1LogoutAmPm}
                              onChange={(e) => setS1LogoutAmPm(e.target.value)}
                              className="py-1 px-1 bg-white border border-slate-200 rounded text-[11px] font-bold"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Shift 2 */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0284c7]">Shift 2</span>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              maxLength={2}
                              value={s2LoginH}
                              onChange={(e) => setS2LoginH(e.target.value)}
                              className="w-8 text-center py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                            />
                            <span>:</span>
                            <input
                              type="text"
                              maxLength={2}
                              value={s2LoginM}
                              onChange={(e) => setS2LoginM(e.target.value)}
                              className="w-8 text-center py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                            />
                            <select
                              value={s2LoginAmPm}
                              onChange={(e) => setS2LoginAmPm(e.target.value)}
                              className="py-1 px-1 bg-white border border-slate-200 rounded text-[11px] font-bold"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                          <span className="text-slate-400">to</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              maxLength={2}
                              value={s2LogoutH}
                              onChange={(e) => setS2LogoutH(e.target.value)}
                              className="w-8 text-center py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                            />
                            <span>:</span>
                            <input
                              type="text"
                              maxLength={2}
                              value={s2LogoutM}
                              onChange={(e) => setS2LogoutM(e.target.value)}
                              className="w-8 text-center py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                            />
                            <select
                              value={s2LogoutAmPm}
                              onChange={(e) => setS2LogoutAmPm(e.target.value)}
                              className="py-1 px-1 bg-white border border-slate-200 rounded text-[11px] font-bold"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEmployee(activeCategory)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-md transition-all cursor-pointer"
                >
                  {editingEmployee
                    ? `Update ${activeCategory === "HR" ? "HR Member" : "Staff Member"}`
                    : `Save ${activeCategory === "HR" ? "HR Member" : "Staff Member"}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ➕ ADD / EDIT DOCTOR MODAL                                         */}
      {/* =================================================================== */}
      {isAddDoctorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingEmployee ? "✏️ Edit Doctor Profile" : "Add New Doctor"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure practitioner details and work schedule.
                </p>
              </div>
              <button
                onClick={() => setIsAddDoctorOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200/60 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Assign Staff Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Assign Staff Role
                </label>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[#0284c7] font-bold text-xs">
                  <span>Doctor</span>
                </div>
              </div>

              {/* Doctor Category (Head Doctor vs Employee Doctor) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Doctor Category
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDoctorCategory("HEAD")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      doctorCategory === "HEAD"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Head Doctor
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorCategory("EMPLOYEE")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      doctorCategory === "EMPLOYEE"
                        ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Employee Doctor
                  </button>
                </div>
              </div>

              {/* Full Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. John Doe"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number (without +91) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                  />
                </div>
              </div>

              {/* Branch, Qualification & Specialty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Branch *
                  </label>
                  <select
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] bg-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id || b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                    <option value="All Branches">All Branches</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MD (Hom), BHMS"
                    value={formQualification}
                    onChange={(e) => setFormQualification(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Classical Homeopathy"
                    value={formSpecialty}
                    onChange={(e) => setFormSpecialty(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                  />
                </div>
              </div>

              {/* Salary & Work Schedule (Only for Employee Doctor as requested) */}
              {doctorCategory === "EMPLOYEE" && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                      <span>💼</span>
                      <span>Salary &amp; Work Schedule</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                      ⏱️ {calculatedDailyHours}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Base Salary (Rs)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 25000"
                      value={formSalary}
                      onChange={(e) => setFormSalary(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                    />
                  </div>

                  {/* Shift Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Shift Type
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShiftType("SINGLE_STRICT")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          shiftType === "SINGLE_STRICT"
                            ? "bg-[#0284c7] text-white border-[#0284c7]"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Single Strict
                      </button>
                      <button
                        type="button"
                        onClick={() => setShiftType("MULTI_STRICT")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          shiftType === "MULTI_STRICT"
                            ? "bg-[#0284c7] text-white border-[#0284c7]"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Multi Strict
                      </button>
                    </div>
                  </div>

                  {/* Shift Hours Schedule */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Shift Hours Schedule
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Login Time */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                          Login Time
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={2}
                            value={loginHour}
                            onChange={(e) => setLoginHour(e.target.value)}
                            className="w-10 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          />
                          <span className="font-bold">:</span>
                          <input
                            type="text"
                            maxLength={2}
                            value={loginMin}
                            onChange={(e) => setLoginMin(e.target.value)}
                            className="w-10 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          />
                          <select
                            value={loginAmPm}
                            onChange={(e) => setLoginAmPm(e.target.value)}
                            className="py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>

                      {/* Logout Time */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                          Logout Time
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={2}
                            value={logoutHour}
                            onChange={(e) => setLogoutHour(e.target.value)}
                            className="w-10 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          />
                          <span className="font-bold">:</span>
                          <input
                            type="text"
                            maxLength={2}
                            value={logoutMin}
                            onChange={(e) => setLogoutMin(e.target.value)}
                            className="w-10 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          />
                          <select
                            value={logoutAmPm}
                            onChange={(e) => setLogoutAmPm(e.target.value)}
                            className="py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDoctorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEmployee("DOCTOR")}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-md transition-all cursor-pointer"
                >
                  {editingEmployee ? "Update Doctor Profile" : "Save Doctor"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
