import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __sphBranchesStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphEmployeesStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphDoctorSchedulesStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphDoctorNoShowsStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphPatientsStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphAppointmentsStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphRegistrationSequencesStore: Record<string, number> | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export * from "@prisma/client";

// Normalize phone number to pure 10 digits
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export interface BranchRecord {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  timings: string;
  photoUrl: string;
  photoName?: string;
  doctorsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Persistent fallback store file location
function getCacheFilePath(): string {
  const cacheDir = path.resolve(process.cwd(), "node_modules/.cache");
  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {
      // Fallback
      return path.resolve(process.cwd(), ".branches_store.json");
    }
  }
  return path.join(cacheDir, "branches_store.json");
}

function loadBranchesFromDisk(): BranchRecord[] {
  try {
    const file = getCacheFilePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn("Failed to load branches from disk cache:", err);
  }
  return [];
}

function saveBranchesToDisk(branches: BranchRecord[]): void {
  try {
    const file = getCacheFilePath();
    fs.writeFileSync(file, JSON.stringify(branches, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to save branches to disk cache:", err);
  }
}

const DEFAULT_BRANCHES_STORE: BranchRecord[] = [
  {
    id: "b-kphb",
    name: "KPHB Branch",
    phone: "+91 81252 60176",
    address: "Road No. 1, KPHB Colony",
    city: "Hyderabad",
    timings: "9:00 AM - 8:30 PM",
    photoUrl: "",
    doctorsCount: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "b-chn",
    name: "Chandanagar Branch",
    phone: "+91 99031 19766",
    address: "Main Road, Chandanagar",
    city: "Hyderabad",
    timings: "9:00 AM - 8:30 PM",
    photoUrl: "",
    doctorsCount: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "b-dil",
    name: "Dilshuknagar Branch",
    phone: "+91 94908 08582",
    address: "Near Metro, Dilshuknagar",
    city: "Hyderabad",
    timings: "9:00 AM - 8:30 PM",
    photoUrl: "",
    doctorsCount: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "b-ngl",
    name: "Nallagandla Branch",
    phone: "+91 11111 11111",
    address: "HUDA Layout, Nallagandla",
    city: "Hyderabad",
    timings: "9:00 AM - 8:30 PM",
    photoUrl: "",
    doctorsCount: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

// Shared In-Memory & Cache Store
function getMemoryStore(): BranchRecord[] {
  if (!global.__sphBranchesStore) {
    const fromDisk = loadBranchesFromDisk();
    global.__sphBranchesStore = fromDisk.length > 0 ? fromDisk : DEFAULT_BRANCHES_STORE;
  }
  return global.__sphBranchesStore;
}

export const branchService = {
  // Get all active branches (checks Prisma first, falls back to store)
  async getAllBranches(): Promise<BranchRecord[]> {
    try {
      const branches = await prisma.branch.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (branches && branches.length > 0) {
        return branches.map((b) => ({
          ...b,
          photoName: b.photoName || undefined,
          photoUrl: b.photoUrl || "",
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt ? b.updatedAt.toISOString() : undefined,
        }));
      }
    } catch {
      // Database not connected
    }

    const memory = getMemoryStore();
    return memory.length > 0 ? memory : DEFAULT_BRANCHES_STORE;
  },

  // Create a new branch (saves to Prisma + local store)
  async createBranch(input: {
    name: string;
    phone: string;
    address: string;
    city?: string;
    timings?: string;
    photoUrl?: string;
    photoName?: string;
  }): Promise<BranchRecord> {
    const newRecord: BranchRecord = {
      id: Date.now().toString(),
      name: input.name.trim(),
      phone: input.phone.trim(),
      address: input.address.trim(),
      city: input.city?.trim() || "Hyderabad",
      timings: input.timings?.trim() || "9:00 AM - 8:30 PM (Mon - Sat)",
      photoUrl:
        input.photoUrl ||
        "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500&q=80",
      photoName: input.photoName || "branch_photo.jpg",
      doctorsCount: Math.floor(Math.random() * 3) + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Try saving to Prisma DB
    try {
      const dbBranch = await prisma.branch.create({
        data: {
          name: newRecord.name,
          phone: newRecord.phone,
          address: newRecord.address,
          city: newRecord.city,
          timings: newRecord.timings,
          photoUrl: newRecord.photoUrl,
          photoName: newRecord.photoName,
          doctorsCount: newRecord.doctorsCount,
          isActive: true,
        },
      });
      newRecord.id = dbBranch.id;
    } catch {
      // Prisma offline, kept in shared memory
    }

    const store = getMemoryStore();
    // Add to top of list
    store.unshift(newRecord);
    global.__sphBranchesStore = store;
    saveBranchesToDisk(store);

    return newRecord;
  },

  // Delete branch
  async deleteBranch(id: string): Promise<boolean> {
    try {
      await prisma.branch.delete({ where: { id } });
    } catch {
      // Ignore
    }

    const store = getMemoryStore().filter((b) => b.id !== id);
    global.__sphBranchesStore = store;
    saveBranchesToDisk(store);
    return true;
  },

  // Find branch matching a phone number
  async findBranchByPhone(phone: string): Promise<BranchRecord | null> {
    const cleanSearch = normalizePhone(phone);
    if (!cleanSearch) return null;

    // 1. Try Prisma DB
    try {
      const branches = await prisma.branch.findMany({
        where: { isActive: true },
      });
      const found = branches.find((b) => normalizePhone(b.phone) === cleanSearch);
      if (found) {
        return {
          ...found,
          photoName: found.photoName || undefined,
          photoUrl: found.photoUrl || "",
          createdAt: found.createdAt.toISOString(),
          updatedAt: found.updatedAt ? found.updatedAt.toISOString() : undefined,
        };
      }
    } catch {
      // Prisma offline
    }

    // 2. Check shared store
    const store = getMemoryStore();
    const match = store.find((b) => normalizePhone(b.phone) === cleanSearch);
    return match || null;
  },
};

// ---------------------------------------------------------------------------
// Employee Management Model & Service (Staff, Reception, Doctors, HR)
// ---------------------------------------------------------------------------

export interface EmployeeRecord {
  id: string;
  name: string;
  category: "STAFF" | "DOCTOR" | "HR";
  doctorCategory?: "HEAD" | "EMPLOYEE";
  email: string;
  password?: string;
  phone: string;
  branchName: string;
  branchId?: string;
  salary: number;
  shiftType: "SINGLE_STRICT" | "MULTI_STRICT";
  shiftHours: string;
  dailyHours: string;
  shift1Start?: string;
  shift1End?: string;
  shift2Start?: string;
  shift2End?: string;
  createdAt: string;
  updatedAt?: string;
}

export const INITIAL_EMPLOYEES: EmployeeRecord[] = [];

function getEmployeesCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "employees_store.json"))) {
    return path.join(webCache, "employees_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "employees_store.json"))) {
    return path.join(rootCache, "employees_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "employees_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".employees_store.json");
    }
  }
  return path.join(rootCache, "employees_store.json");
}

function loadEmployeesFromDisk(): EmployeeRecord[] {
  try {
    const file = getEmployeesCachePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Failed to read employees cache:", err);
  }
  saveEmployeesToDisk(INITIAL_EMPLOYEES);
  return [...INITIAL_EMPLOYEES];
}

function saveEmployeesToDisk(data: EmployeeRecord[]): void {
  try {
    const file = getEmployeesCachePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write employees cache:", err);
  }
}

function getEmployeesStore(): EmployeeRecord[] {
  if (!global.__sphEmployeesStore) {
    global.__sphEmployeesStore = loadEmployeesFromDisk();
  }
  return global.__sphEmployeesStore;
}
export const employeeService = {
  async getAllEmployees(category?: string): Promise<EmployeeRecord[]> {
    const store = getEmployeesStore();
    if (!category || category === "ALL") return store;
    return store.filter((e) => e.category === category.toUpperCase());
  },

  async createEmployee(input: Partial<EmployeeRecord>): Promise<EmployeeRecord> {
    const store = getEmployeesStore();
    const newRecord: EmployeeRecord = {
      id: Date.now().toString(),
      name: input.name ? input.name.trim() : "Staff Member",
      category: (input.category || "STAFF") as any,
      doctorCategory: input.doctorCategory,
      email: input.email ? input.email.trim() : `${Date.now()}@sph.com`,
      password: input.password || "email123",
      phone: input.phone?.trim().startsWith("+91") ? input.phone.trim() : `+91 ${input.phone?.trim() || ""}`,
      branchName: input.category === "DOCTOR" ? (input.branchName?.trim() || "") : (input.branchName?.trim() || "KPHB"),
      branchId: input.branchId,
      salary: input.doctorCategory === "HEAD" ? 0 : (Number(input.salary) || (input.category === "DOCTOR" ? 0 : 20000)),
      shiftType: input.shiftType || "SINGLE_STRICT",
      shiftHours: input.doctorCategory === "HEAD" ? "-" : (input.shiftHours || "09:00 AM - 06:00 PM"),
      dailyHours: input.doctorCategory === "HEAD" ? "-" : (input.dailyHours || "9 hrs/day"),
      shift1Start: input.shift1Start,
      shift1End: input.shift1End,
      shift2Start: input.shift2Start,
      shift2End: input.shift2End,
      createdAt: new Date().toISOString(),
    };
    store.unshift(newRecord);
    global.__sphEmployeesStore = store;
    saveEmployeesToDisk(store);
    return newRecord;
  },

  async updateEmployee(id: string, updates: Partial<EmployeeRecord>): Promise<EmployeeRecord | null> {
    const store = getEmployeesStore();
    const idx = store.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const updated: EmployeeRecord = {
      ...store[idx],
      ...updates,
      phone: updates.phone
        ? updates.phone.trim().startsWith("+91")
          ? updates.phone.trim()
          : `+91 ${updates.phone.trim()}`
        : store[idx].phone,
      updatedAt: new Date().toISOString(),
    };

    store[idx] = updated;
    global.__sphEmployeesStore = store;
    saveEmployeesToDisk(store);
    return updated;
  },

  async deleteEmployee(id: string): Promise<boolean> {
    const store = getEmployeesStore();
    const filtered = store.filter((e) => e.id !== id);
    global.__sphEmployeesStore = filtered;
    saveEmployeesToDisk(filtered);
    return true;
  },
};

// ============================================================================
// DOCTOR TIMINGS & MASTER SCHEDULES
// ============================================================================

export interface TimeSlotRange {
  id: string;
  startHour: string;
  startMin: string;
  startAmPm: "AM" | "PM";
  endHour: string;
  endMin: string;
  endAmPm: "AM" | "PM";
  displayText: string;
}

export interface DaySchedule {
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  isAvailable: boolean;
  slots: TimeSlotRange[];
}

export interface BranchSchedule {
  id: string;
  branchName: string;
  days: Record<string, DaySchedule>;
}

export interface DoctorScheduleRecord {
  id: string;
  doctorId: string;
  doctorName: string;
  phone: string;
  specialty?: string;
  branchSchedules: BranchSchedule[];
  updatedAt?: string;
}

function getSchedulesCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "doctor_schedules_store.json"))) {
    return path.join(webCache, "doctor_schedules_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "doctor_schedules_store.json"))) {
    return path.join(rootCache, "doctor_schedules_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "doctor_schedules_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".doctor_schedules_store.json");
    }
  }
  return path.join(rootCache, "doctor_schedules_store.json");
}

function normalizeBranchName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/spiritual\s*homeopathy/gi, "")
    .replace(/\bbranch\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function getDefaultDoctorSchedules(): DoctorScheduleRecord[] {
  const defaultSlots: TimeSlotRange[] = [
    {
      id: "slot-1",
      startHour: "10",
      startMin: "00",
      startAmPm: "AM",
      endHour: "01",
      endMin: "00",
      endAmPm: "PM",
      displayText: "10:00 AM - 01:00 PM",
    },
    {
      id: "slot-2",
      startHour: "05",
      startMin: "00",
      startAmPm: "PM",
      endHour: "09",
      endMin: "00",
      endAmPm: "PM",
      displayText: "05:00 PM - 09:00 PM",
    },
  ];

  const makeWeekDays = (availableDays: string[]): Record<string, DaySchedule> => {
    const days: ("Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun")[] = [
      "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
    ];
    const map: Record<string, DaySchedule> = {};
    for (const d of days) {
      const isAvail = availableDays.includes(d);
      map[d] = {
        day: d,
        isAvailable: isAvail,
        slots: isAvail ? defaultSlots : [],
      };
    }
    return map;
  };

  return [
    {
      id: "doc-1",
      doctorId: "doc-1",
      doctorName: "Dr. Prashanth K Vaidya",
      phone: "+91 81252 60176",
      specialty: "Senior Chief Homeopath",
      branchSchedules: [
        {
          id: "bs-kphb-1",
          branchName: "KPHB Branch",
          days: makeWeekDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
        },
        {
          id: "bs-chn-1",
          branchName: "Chandanagar Branch",
          days: makeWeekDays(["Mon", "Wed", "Fri", "Sat", "Sun"]),
        },
      ],
    },
    {
      id: "doc-2",
      doctorId: "doc-2",
      doctorName: "Dr. Jobeadh Begum",
      phone: "+91 99031 19766",
      specialty: "Senior Consultant Homeopath",
      branchSchedules: [
        {
          id: "bs-dil-1",
          branchName: "Dilshuknagar Branch",
          days: makeWeekDays(["Mon", "Tue", "Wed", "Thu", "Sun"]),
        },
      ],
    },
    {
      id: "doc-3",
      doctorId: "doc-3",
      doctorName: "Dr. Padma Priya",
      phone: "+91 94908 08582",
      specialty: "Women Specialist Homeopath",
      branchSchedules: [
        {
          id: "bs-ngl-1",
          branchName: "Nallagandla Branch",
          days: makeWeekDays(["Mon", "Wed", "Fri", "Sat"]),
        },
      ],
    },
    {
      id: "doc-4",
      doctorId: "doc-4",
      doctorName: "Dr. Ramakrishna Chanduri",
      phone: "+91 11111 11111",
      specialty: "Chronic Care Specialist",
      branchSchedules: [
        {
          id: "bs-dil-2",
          branchName: "Dilshuknagar Branch",
          days: makeWeekDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
        },
      ],
    },
  ];
}

function loadSchedulesFromDisk(): DoctorScheduleRecord[] {
  try {
    const file = getSchedulesCachePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
    }
  } catch (err) {
    console.warn("Failed to read doctor schedules cache:", err);
  }
  const defaults = getDefaultDoctorSchedules();
  saveSchedulesToDisk(defaults);
  return defaults;
}

function saveSchedulesToDisk(data: DoctorScheduleRecord[]): void {
  try {
    const file = getSchedulesCachePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write doctor schedules cache:", err);
  }
}

function getDoctorSchedulesStore(): DoctorScheduleRecord[] {
  if (!global.__sphDoctorSchedulesStore) {
    global.__sphDoctorSchedulesStore = loadSchedulesFromDisk();
  }
  return global.__sphDoctorSchedulesStore;
}

export const doctorScheduleService = {
  async getAllSchedules(): Promise<DoctorScheduleRecord[]> {
    return getDoctorSchedulesStore();
  },

  async getScheduleByDoctorId(doctorId: string): Promise<DoctorScheduleRecord | null> {
    const store = getDoctorSchedulesStore();
    return store.find((s) => s.doctorId === doctorId || s.id === doctorId) || null;
  },

  async saveSchedule(record: DoctorScheduleRecord): Promise<DoctorScheduleRecord> {
    const store = getDoctorSchedulesStore();
    const idx = store.findIndex((s) => s.doctorId === record.doctorId || s.id === record.id);

    // Auto-normalize inverted AM/PM in saved branch schedules
    if (record.branchSchedules && Array.isArray(record.branchSchedules)) {
      record.branchSchedules.forEach((bs) => {
        const normalizeSlot = (s: any) => {
          if (!s) return;
          const shNum = parseInt(s.startHour || "0", 10);
          const ehNum = parseInt(s.endHour || "0", 10);
          if (s.startAmPm === "PM" && s.endAmPm === "PM" && shNum >= 8 && shNum <= 11 && ehNum < shNum) {
            s.startAmPm = "AM";
          }
          if (s.startHour === "12" && s.startAmPm === "AM" && s.endAmPm === "PM") {
            s.startAmPm = "PM";
          }
          const sMin = s.startMin ?? s.startMinute ?? "00";
          const eMin = s.endMin ?? s.endMinute ?? "00";
          s.displayText = `${s.startHour || "10"}:${sMin} ${s.startAmPm || "AM"} - ${s.endHour || "02"}:${eMin} ${s.endAmPm || "PM"}`;
        };

        if (bs.days) {
          Object.values(bs.days).forEach((d: any) => {
            if (d && Array.isArray(d.slots)) d.slots.forEach(normalizeSlot);
          });
        }
        if ((bs as any).daySchedules) {
          Object.values((bs as any).daySchedules).forEach((ds: any) => {
            if (ds && Array.isArray(ds.slots)) ds.slots.forEach(normalizeSlot);
          });
        }
      });
    }

    const updatedRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      store[idx] = updatedRecord;
    } else {
      store.unshift(updatedRecord);
    }

    global.__sphDoctorSchedulesStore = store;
    saveSchedulesToDisk(store);
    return updatedRecord;
  },

  async deleteSchedule(doctorId: string): Promise<boolean> {
    const store = getDoctorSchedulesStore();
    const filtered = store.filter((s) => s.doctorId !== doctorId && s.id !== doctorId);
    global.__sphDoctorSchedulesStore = filtered;
    saveSchedulesToDisk(filtered);
    return true;
  },

  async getDoctorsAvailable(branchName: string, dayAbbr: string): Promise<{
    doctorId: string;
    doctorName: string;
    phone: string;
    slots: TimeSlotRange[];
  }[]> {
    const store = getDoctorSchedulesStore();
    const cleanTarget = normalizeBranchName(branchName);
    if (!cleanTarget) return [];

    const result: { doctorId: string; doctorName: string; phone: string; slots: TimeSlotRange[] }[] = [];

    for (const doc of store) {
      if (!doc.branchSchedules || !Array.isArray(doc.branchSchedules)) continue;

      for (const bs of doc.branchSchedules) {
        const rawBs = bs.branchName || (bs as any).targetBranch || "";
        const cleanBs = normalizeBranchName(rawBs);
        if (!cleanBs) continue;

        const branchMatches =
          cleanBs === cleanTarget ||
          (cleanBs.length >= 4 && cleanTarget.length >= 4 && (cleanBs.startsWith(cleanTarget) || cleanTarget.startsWith(cleanBs)));

        if (branchMatches) {
          const daySched = bs.days?.[dayAbbr];
          const daySchedAlt = (bs as any).daySchedules?.[dayAbbr];

          let isAvailable = false;
          let rawSlots: any[] = [];

          if (daySched && daySched.isAvailable === true && Array.isArray(daySched.slots) && daySched.slots.length > 0) {
            isAvailable = true;
            rawSlots = daySched.slots;
          } else if (daySchedAlt && daySchedAlt.status === "Available" && Array.isArray(daySchedAlt.slots) && daySchedAlt.slots.length > 0) {
            isAvailable = true;
            rawSlots = daySchedAlt.slots;
          } else if (daySched && daySched.isAvailable === true) {
            isAvailable = true;
            rawSlots = Array.isArray(daySched.slots) ? daySched.slots : [];
          } else if (daySchedAlt && daySchedAlt.status === "Available") {
            isAvailable = true;
            rawSlots = Array.isArray(daySchedAlt.slots) ? daySchedAlt.slots : [];
          }

          if (isAvailable) {
            // If doctor is marked available on this day but has no explicit slot objects, default to clinic hours
            if (!rawSlots || rawSlots.length === 0) {
              rawSlots = [
                {
                  id: `${dayAbbr}-slot-1`,
                  startHour: "10",
                  startMin: "00",
                  startAmPm: "AM",
                  endHour: "01",
                  endMin: "00",
                  endAmPm: "PM",
                  displayText: "10:00 AM - 01:00 PM",
                },
                {
                  id: `${dayAbbr}-slot-2`,
                  startHour: "05",
                  startMin: "00",
                  startAmPm: "PM",
                  endHour: "09",
                  endMin: "00",
                  endAmPm: "PM",
                  displayText: "05:00 PM - 09:00 PM",
                },
              ];
            }

            const normalizedSlots: TimeSlotRange[] = rawSlots.map((s: any, idx: number) => {
              let sHour = s.startHour || "10";
              let sMin = s.startMin ?? s.startMinute ?? "00";
              let sAmPm = s.startAmPm || "AM";
              let eHour = s.endHour || "01";
              let eMin = s.endMin ?? s.endMinute ?? "00";
              let eAmPm = s.endAmPm || "PM";

              // Detect inverted PM/AM (e.g. 10:00 PM - 08:00 PM -> 10:00 AM - 08:00 PM)
              const shNum = parseInt(sHour, 10);
              const ehNum = parseInt(eHour, 10);
              if (sAmPm === "PM" && eAmPm === "PM" && shNum >= 8 && shNum <= 11 && ehNum < shNum) {
                sAmPm = "AM";
              }
              if (sHour === "12" && sAmPm === "AM" && eAmPm === "PM") {
                sAmPm = "PM";
              }

              const disp = s.displayText && !s.displayText.includes("10:00 PM - 08:00 PM")
                ? s.displayText
                : `${sHour}:${sMin} ${sAmPm} - ${eHour}:${eMin} ${eAmPm}`;

              return {
                id: s.id || `${dayAbbr}-slot-${idx + 1}`,
                startHour: sHour,
                startMin: sMin,
                startMinute: sMin,
                startAmPm: sAmPm,
                endHour: eHour,
                endMin: eMin,
                endMinute: eMin,
                endAmPm: eAmPm,
                displayText: disp,
              };
            });

            const existingDoc = result.find((r) => r.doctorId === (doc.doctorId || doc.id));
            if (!existingDoc) {
              result.push({
                doctorId: doc.doctorId || doc.id,
                doctorName: doc.doctorName || (doc as any).name,
                phone: doc.phone || "",
                slots: normalizedSlots,
              });
            } else {
              for (const ns of normalizedSlots) {
                if (!existingDoc.slots.some((es) => es.displayText === ns.displayText)) {
                  existingDoc.slots.push(ns);
                }
              }
            }
          }
        }
      }
    }

    return result;
  },
};

// ============================================================================
// DOCTOR NO-SHOW MANAGEMENT
// ============================================================================

export interface DoctorNoShowRecord {
  id: string;
  doctorId: string;
  doctorName: string;
  branch: string;
  type: "FULL_DAY" | "HALF_DAY" | "SPECIFIC_TIME";
  startDate: string; // YYYY-MM-DD or DD-MM-YYYY
  endDate: string;   // YYYY-MM-DD or DD-MM-YYYY
  halfDayType?: "FIRST_HALF" | "SECOND_HALF";
  startTime?: string; // e.g. "10:00 AM" or "10:00"
  endTime?: string;   // e.g. "01:00 PM" or "13:00"
  reason?: string;
  createdAt: string;
}

function getNoShowsCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "doctor_noshows_store.json"))) {
    return path.join(webCache, "doctor_noshows_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "doctor_noshows_store.json"))) {
    return path.join(rootCache, "doctor_noshows_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "doctor_noshows_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".doctor_noshows_store.json");
    }
  }
  return path.join(rootCache, "doctor_noshows_store.json");
}

function loadNoShowsFromDisk(): DoctorNoShowRecord[] {
  try {
    const file = getNoShowsCachePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to read doctor no-shows cache:", err);
  }
  return [];
}

function saveNoShowsToDisk(data: DoctorNoShowRecord[]): void {
  try {
    const file = getNoShowsCachePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write doctor no-shows cache:", err);
  }
}

function getDoctorNoShowsStore(): DoctorNoShowRecord[] {
  if (!global.__sphDoctorNoShowsStore) {
    global.__sphDoctorNoShowsStore = loadNoShowsFromDisk();
  }
  return global.__sphDoctorNoShowsStore;
}

function normalizeDateStr(dt: string): string {
  if (!dt) return "";
  const parts = dt.trim().split("-");
  if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dt.trim();
}

export const doctorNoShowService = {
  async getAllNoShows(branch?: string, date?: string): Promise<DoctorNoShowRecord[]> {
    let store = getDoctorNoShowsStore();
    if (branch) {
      const cleanBranch = branch.toLowerCase().replace(/branch/gi, "").trim();
      store = store.filter((item) => {
        const itemBranch = item.branch.toLowerCase().replace(/branch/gi, "").trim();
        return itemBranch === cleanBranch || cleanBranch.includes(itemBranch) || itemBranch.includes(cleanBranch);
      });
    }
    if (date) {
      const normalizedQueryDate = normalizeDateStr(date);
      store = store.filter((item) => {
        const s = normalizeDateStr(item.startDate);
        const e = normalizeDateStr(item.endDate || item.startDate);
        return normalizedQueryDate >= s && normalizedQueryDate <= e;
      });
    }
    return store;
  },

  async addNoShow(record: Omit<DoctorNoShowRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<DoctorNoShowRecord> {
    const store = getDoctorNoShowsStore();
    const newRecord: DoctorNoShowRecord = {
      ...record,
      id: record.id || `noshow_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: record.createdAt || new Date().toISOString(),
    };
    store.unshift(newRecord);
    global.__sphDoctorNoShowsStore = store;
    saveNoShowsToDisk(store);
    return newRecord;
  },

  async deleteNoShow(id: string): Promise<boolean> {
    const store = getDoctorNoShowsStore();
    const filtered = store.filter((item) => item.id !== id);
    global.__sphDoctorNoShowsStore = filtered;
    saveNoShowsToDisk(filtered);
    return true;
  },

  async getDoctorsAvailableForBranch(branchName: string): Promise<{ doctorId: string; doctorName: string; phone: string }[]> {
    const schedules = getDoctorSchedulesStore();
    const cleanTarget = normalizeBranchName(branchName);
    if (!cleanTarget) return [];
    const matchedDoctors: { doctorId: string; doctorName: string; phone: string }[] = [];

    for (const doc of schedules) {
      const worksInBranch = (doc.branchSchedules || []).some((bs) => {
        const cleanBs = normalizeBranchName(bs.branchName || (bs as any).targetBranch || "");
        if (!cleanBs) return false;
        return (
          cleanBs === cleanTarget ||
          (cleanBs.length >= 4 && cleanTarget.length >= 4 && (cleanBs.startsWith(cleanTarget) || cleanTarget.startsWith(cleanBs)))
        );
      });
      if (worksInBranch) {
        matchedDoctors.push({
          doctorId: doc.doctorId,
          doctorName: doc.doctorName,
          phone: doc.phone,
        });
      }
    }
    return matchedDoctors;
  },
};

// ============================================================================
// PATIENTS & APPOINTMENTS SERVICES
// ============================================================================

export interface PatientRecord {
  id: string;
  regId: string;
  name: string;
  phone: string;
  email?: string;
  diseases?: string;
  branch: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
  retentionUntil?: string; // 30-day retention window
  mergedInto?: string;
  mergedAt?: string;
}

export interface AppointmentRecord {
  id: string;
  token: string;
  registrationId: string;
  patientName: string;
  phone: string;
  email?: string;
  diseases?: string;
  marketingSource: string;
  consultationMode: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  timeSlot: string;
  branch: string;
  isReback: boolean;
  status: "SCHEDULED" | "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
  createdAt: string;
}

function getPatientsCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "patients_store.json"))) {
    return path.join(webCache, "patients_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "patients_store.json"))) {
    return path.join(rootCache, "patients_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "patients_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".patients_store.json");
    }
  }
  return path.join(rootCache, "patients_store.json");
}

function loadPatientsFromDisk(): PatientRecord[] {
  try {
    const file = getPatientsCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to load patients from cache:", err);
  }
  return [];
}

function savePatientsToDisk(data: PatientRecord[]): void {
  try {
    const file = getPatientsCachePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to save patients cache:", err);
  }
}

function getPatientsStore(): PatientRecord[] {
  if (!global.__sphPatientsStore) {
    global.__sphPatientsStore = loadPatientsFromDisk();
  }
  return global.__sphPatientsStore;
}

export const patientService = {
  async getAllPatients(branch?: string): Promise<PatientRecord[]> {
    const store = getPatientsStore();
    const active = store.filter((p) => !p.isDeleted);
    if (!branch) return active;
    const cleanB = branch.toLowerCase().replace(/branch/gi, "").trim();
    return active.filter((p) => {
      const pb = p.branch.toLowerCase().replace(/branch/gi, "").trim();
      return pb === cleanB || cleanB.includes(pb) || pb.includes(cleanB);
    });
  },

  async getByRegId(regId: string): Promise<PatientRecord | null> {
    const clean = regId.trim().toUpperCase();
    const store = getPatientsStore();
    return store.find((p) => p.regId.trim().toUpperCase() === clean && !p.isDeleted) || null;
  },

  async searchPatients(query: string, branch?: string): Promise<PatientRecord[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    let list = await this.getAllPatients(branch);
    return list.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.regId.toLowerCase().includes(q)
    );
  },

  /**
   * Returns all active profiles sharing this mobile number
   */
  async getProfilesByPhone(phone: string): Promise<Array<PatientRecord & { appointmentCount: number; lastVisit?: string }>> {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) return [];
    const last10 = cleanPhone.slice(-10);
    const store = getPatientsStore();
    const active = store.filter(
      (p) => !p.isDeleted && normalizePhone(p.phone).endsWith(last10)
    );
    const appointments = getAppointmentsStore();

    return active.map((patient) => {
      const pAppointments = appointments.filter(
        (a) => a.registrationId.toUpperCase() === patient.regId.toUpperCase()
      );
      const lastAppt = pAppointments[0];
      return {
        ...patient,
        appointmentCount: pAppointments.length,
        lastVisit: lastAppt ? `${lastAppt.appointmentDate} (${lastAppt.doctorName})` : undefined,
      };
    });
  },

  /**
   * Upsert patient matching strictly by regId so multiple profiles can exist per mobile number
   */
  async upsertPatient(data: Omit<PatientRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<PatientRecord> {
    const store = getPatientsStore();
    const cleanReg = data.regId.trim().toUpperCase();
    const cleanPhone = normalizePhone(data.phone);

    const existingIdx = store.findIndex(
      (p) => p.regId.trim().toUpperCase() === cleanReg
    );

    if (existingIdx >= 0) {
      const updated: PatientRecord = {
        ...store[existingIdx],
        ...data,
        regId: cleanReg,
        phone: cleanPhone || store[existingIdx].phone,
        updatedAt: new Date().toISOString(),
      };
      store[existingIdx] = updated;
      global.__sphPatientsStore = store;
      savePatientsToDisk(store);
      return updated;
    }

    const newRecord: PatientRecord = {
      id: data.id || `pat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      regId: cleanReg,
      name: data.name,
      phone: cleanPhone,
      email: data.email,
      diseases: data.diseases,
      branch: data.branch,
      isDeleted: false,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    store.unshift(newRecord);
    global.__sphPatientsStore = store;
    savePatientsToDisk(store);
    return newRecord;
  },

  /**
   * Updates profile name across patient record and existing appointments
   */
  async updatePatientName(regId: string, newName: string): Promise<PatientRecord | null> {
    const cleanReg = regId.trim().toUpperCase();
    const trimmedName = newName.trim();
    if (!trimmedName) return null;

    const store = getPatientsStore();
    const idx = store.findIndex((p) => p.regId.trim().toUpperCase() === cleanReg);
    if (idx === -1) return null;

    store[idx].name = trimmedName;
    store[idx].updatedAt = new Date().toISOString();
    global.__sphPatientsStore = store;
    savePatientsToDisk(store);

    // Update in appointments store too
    const appts = getAppointmentsStore();
    let apptUpdated = false;
    appts.forEach((a) => {
      if (a.registrationId.trim().toUpperCase() === cleanReg) {
        a.patientName = trimmedName;
        apptUpdated = true;
      }
    });
    if (apptUpdated) {
      global.__sphAppointmentsStore = appts;
      saveAppointmentsToDisk(appts);
    }

    return store[idx];
  },

  /**
   * Soft deletes a patient profile and moves to 30-day retention trash.
   * Note: The regId sequence counter is NEVER rolled back or reassigned.
   */
  async deletePatientProfile(regId: string, deletedBy = "Reception", reason = "User Request"): Promise<PatientRecord | null> {
    const cleanReg = regId.trim().toUpperCase();
    const store = getPatientsStore();
    const idx = store.findIndex((p) => p.regId.trim().toUpperCase() === cleanReg);
    if (idx === -1) return null;

    const now = new Date();
    const retentionUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days retention

    store[idx].isDeleted = true;
    store[idx].deletedAt = now.toISOString();
    store[idx].deletedBy = deletedBy;
    store[idx].deletedReason = reason;
    store[idx].retentionUntil = retentionUntil;

    global.__sphPatientsStore = store;
    savePatientsToDisk(store);
    return store[idx];
  },

  /**
   * Restores a deleted profile back to active status (within 30 days)
   */
  async restorePatientProfile(regId: string): Promise<PatientRecord | null> {
    const cleanReg = regId.trim().toUpperCase();
    const store = getPatientsStore();
    const idx = store.findIndex((p) => p.regId.trim().toUpperCase() === cleanReg);
    if (idx === -1) return null;

    store[idx].isDeleted = false;
    delete store[idx].deletedAt;
    delete store[idx].deletedBy;
    delete store[idx].deletedReason;
    delete store[idx].retentionUntil;
    store[idx].updatedAt = new Date().toISOString();

    global.__sphPatientsStore = store;
    savePatientsToDisk(store);
    return store[idx];
  },

  /**
   * Permanently purges a deleted profile
   */
  async permanentlyDeletePatientProfile(regId: string): Promise<boolean> {
    const cleanReg = regId.trim().toUpperCase();
    let store = getPatientsStore();
    const initialLen = store.length;
    store = store.filter((p) => p.regId.trim().toUpperCase() !== cleanReg);

    if (store.length !== initialLen) {
      global.__sphPatientsStore = store;
      savePatientsToDisk(store);
      return true;
    }
    return false;
  },

  /**
   * Merges a duplicate profile under the same mobile number:
   * Transfers all appointments from sourceRegId to targetRegId, then soft-deletes source.
   */
  async mergeProfiles(targetRegId: string, sourceRegId: string): Promise<{ target: PatientRecord; mergedCount: number }> {
    const cleanTarget = targetRegId.trim().toUpperCase();
    const cleanSource = sourceRegId.trim().toUpperCase();

    if (cleanTarget === cleanSource) {
      throw new Error("Target and source profiles cannot be the same.");
    }

    const store = getPatientsStore();
    const targetIdx = store.findIndex((p) => p.regId.trim().toUpperCase() === cleanTarget);
    const sourceIdx = store.findIndex((p) => p.regId.trim().toUpperCase() === cleanSource);

    if (targetIdx === -1 || sourceIdx === -1) {
      throw new Error("Target or source profile not found.");
    }

    const targetPatient = store[targetIdx];
    const sourcePatient = store[sourceIdx];

    // Transfer appointments from source to target
    const appts = getAppointmentsStore();
    let mergedCount = 0;
    appts.forEach((a) => {
      if (a.registrationId.trim().toUpperCase() === cleanSource) {
        a.registrationId = targetPatient.regId;
        a.patientName = targetPatient.name;
        mergedCount++;
      }
    });

    if (mergedCount > 0) {
      global.__sphAppointmentsStore = appts;
      saveAppointmentsToDisk(appts);
    }

    // Mark source as merged and disabled/deleted
    sourcePatient.isDeleted = true;
    sourcePatient.mergedInto = targetPatient.regId;
    sourcePatient.mergedAt = new Date().toISOString();
    sourcePatient.deletedReason = `Merged into ${targetPatient.regId} (${targetPatient.name})`;

    global.__sphPatientsStore = store;
    savePatientsToDisk(store);

    return { target: targetPatient, mergedCount };
  },

  /**
   * Gets deleted profiles for Admin with branch filter, search, and sorting.
   * Also auto-purges any records exceeding the 30-day retention window.
   */
  async getDeletedProfiles(
    branch?: string,
    searchQuery?: string,
    sortBy: "newest" | "oldest" = "newest"
  ): Promise<Array<PatientRecord & { daysRemaining: number }>> {
    let store = getPatientsStore();
    const now = Date.now();

    // Auto-purge records exceeding 30 days
    const validStore = store.filter((p) => {
      if (!p.isDeleted || !p.retentionUntil) return true;
      const expireTime = new Date(p.retentionUntil).getTime();
      return expireTime > now;
    });

    if (validStore.length !== store.length) {
      store = validStore;
      global.__sphPatientsStore = store;
      savePatientsToDisk(store);
    }

    let deleted = store.filter((p) => p.isDeleted);

    if (branch && branch.toLowerCase() !== "all") {
      const cleanB = branch.toLowerCase().replace(/branch/gi, "").trim();
      deleted = deleted.filter((p) => {
        const pb = p.branch.toLowerCase().replace(/branch/gi, "").trim();
        return pb === cleanB || cleanB.includes(pb) || pb.includes(cleanB);
      });
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      deleted = deleted.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.regId.toLowerCase().includes(q)
      );
    }

    deleted.sort((a, b) => {
      const timeA = new Date(a.deletedAt || a.createdAt).getTime();
      const timeB = new Date(b.deletedAt || b.createdAt).getTime();
      return sortBy === "oldest" ? timeA - timeB : timeB - timeA;
    });

    return deleted.map((p) => {
      const expireTime = p.retentionUntil ? new Date(p.retentionUntil).getTime() : now + 30 * 86400000;
      const diffMs = Math.max(0, expireTime - now);
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        ...p,
        daysRemaining,
      };
    });
  },
};

function getAppointmentsCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "appointments_store.json"))) {
    return path.join(webCache, "appointments_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "appointments_store.json"))) {
    return path.join(rootCache, "appointments_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "appointments_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".appointments_store.json");
    }
  }
  return path.join(rootCache, "appointments_store.json");
}

function loadAppointmentsFromDisk(): AppointmentRecord[] {
  try {
    const file = getAppointmentsCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to load appointments from cache:", err);
  }
  return [];
}

function saveAppointmentsToDisk(data: AppointmentRecord[]): void {
  try {
    const file = getAppointmentsCachePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to save appointments cache:", err);
  }
}

function getAppointmentsStore(): AppointmentRecord[] {
  if (!global.__sphAppointmentsStore) {
    global.__sphAppointmentsStore = loadAppointmentsFromDisk();
  }
  return global.__sphAppointmentsStore;
}

export const appointmentService = {
  async getAppointments(branch?: string, date?: string, doctorId?: string): Promise<AppointmentRecord[]> {
    let list = getAppointmentsStore();
    if (branch) {
      const cleanB = branch.toLowerCase().replace(/branch/gi, "").trim();
      list = list.filter((a) => {
        const ab = a.branch.toLowerCase().replace(/branch/gi, "").trim();
        return ab === cleanB || cleanB.includes(ab) || ab.includes(cleanB);
      });
    }
    if (date) {
      const normQuery = normalizeDateStr(date);
      list = list.filter((a) => normalizeDateStr(a.appointmentDate) === normQuery);
    }
    if (doctorId) {
      list = list.filter((a) => a.doctorId === doctorId);
    }
    return list;
  },

  async createAppointment(data: Omit<AppointmentRecord, "id" | "token" | "createdAt" | "status"> & {
    id?: string;
    token?: string;
    status?: AppointmentRecord["status"];
    createdAt?: string;
  }): Promise<AppointmentRecord> {
    const store = getAppointmentsStore();
    const tokenNum = Math.floor(10 + Math.random() * 90);
    const newRecord: AppointmentRecord = {
      id: data.id || `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      token: data.token || `SPH-${tokenNum}`,
      status: data.status || "WAITING",
      createdAt: data.createdAt || new Date().toISOString(),
      ...data,
    };
    store.unshift(newRecord);
    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);

    // Also auto-upsert patient record
    await patientService.upsertPatient({
      regId: newRecord.registrationId,
      name: newRecord.patientName,
      phone: newRecord.phone,
      email: newRecord.email,
      diseases: newRecord.diseases,
      branch: newRecord.branch,
    });

    return newRecord;
  },

  async getSlotBookedCount(branch: string, date: string, doctorId: string, timeSlot: string): Promise<number> {
    const appointments = await this.getAppointments(branch, date, doctorId);
    const cleanSlot = timeSlot.trim().toUpperCase();
    return appointments.filter(
      (a) => a.timeSlot.trim().toUpperCase() === cleanSlot && a.status !== "CANCELLED"
    ).length;
  },
};

// ============================================================================
// TEMPORARY CONSULTATION SLOTS EXTENSION
// ============================================================================
export interface TemporarySlotRecord {
  id: string;
  branch: string;
  doctorId: string;
  date: string; // "DD-MM-YYYY"
  time: string; // e.g. "09:45 AM" or "06:00 PM"
  sessionIndex?: number; // 0 for Session 1, 1 for Session 2, etc.
  createdAt: string;
}

function getTemporarySlotsCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "temporary_slots_store.json"))) {
    return path.join(webCache, "temporary_slots_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "temporary_slots_store.json"))) {
    return path.join(rootCache, "temporary_slots_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "temporary_slots_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".temporary_slots_store.json");
    }
  }
  return path.join(rootCache, "temporary_slots_store.json");
}

function loadTemporarySlotsFromDisk(): TemporarySlotRecord[] {
  try {
    const file = getTemporarySlotsCachePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to read temporary slots cache:", err);
  }
  return [];
}

function saveTemporarySlotsToDisk(data: TemporarySlotRecord[]): void {
  try {
    const file = getTemporarySlotsCachePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write temporary slots cache:", err);
  }
}

function getTemporarySlotsStore(): TemporarySlotRecord[] {
  if (!(global as any).__sphTemporarySlotsStore) {
    (global as any).__sphTemporarySlotsStore = loadTemporarySlotsFromDisk();
  }
  return (global as any).__sphTemporarySlotsStore;
}

export const temporarySlotsService = {
  async getTemporarySlots(branch: string, doctorId: string, date: string): Promise<{ time: string; sessionIndex?: number }[]> {
    const store = getTemporarySlotsStore();
    const cleanBranch = normalizeBranchName(branch);
    const cleanDate = date.trim();
    return store
      .filter(
        (s) =>
          normalizeBranchName(s.branch) === cleanBranch &&
          (s.doctorId === doctorId || doctorId === "ALL") &&
          s.date.trim() === cleanDate
      )
      .map((s) => ({ time: s.time, sessionIndex: s.sessionIndex }));
  },

  async addTemporarySlot(
    branch: string,
    doctorId: string,
    date: string,
    time: string,
    sessionIndex?: number
  ): Promise<{ time: string; sessionIndex?: number }[]> {
    const store = getTemporarySlotsStore();
    const cleanBranch = normalizeBranchName(branch);
    const cleanDate = date.trim();
    const cleanTime = time.trim();

    const exists = store.some(
      (s) =>
        normalizeBranchName(s.branch) === cleanBranch &&
        s.doctorId === doctorId &&
        s.date.trim() === cleanDate &&
        s.time.trim() === cleanTime
    );

    if (!exists) {
      const newRecord: TemporarySlotRecord = {
        id: `ts_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        branch,
        doctorId,
        date: cleanDate,
        time: cleanTime,
        sessionIndex: typeof sessionIndex === "number" ? sessionIndex : undefined,
        createdAt: new Date().toISOString(),
      };
      store.push(newRecord);
      (global as any).__sphTemporarySlotsStore = store;
      saveTemporarySlotsToDisk(store);
    }

    return this.getTemporarySlots(branch, doctorId, date);
  },

  async removeTemporarySlot(
    branch: string,
    doctorId: string,
    date: string,
    time: string
  ): Promise<{ time: string; sessionIndex?: number }[]> {
    let store = getTemporarySlotsStore();
    const cleanBranch = normalizeBranchName(branch);
    const cleanDate = date.trim();
    const cleanTime = time.trim();

    store = store.filter(
      (s) =>
        !(
          normalizeBranchName(s.branch) === cleanBranch &&
          s.doctorId === doctorId &&
          s.date.trim() === cleanDate &&
          s.time.trim() === cleanTime
        )
    );

    (global as any).__sphTemporarySlotsStore = store;
    saveTemporarySlotsToDisk(store);
    return this.getTemporarySlots(branch, doctorId, date);
  },
};

// ============================================================================
// PER-BRANCH SEQUENTIAL REGISTRATION ID SERVICE
// ============================================================================

export type BranchCode = "KPB" | "CHN" | "DIL" | "NGL";

export function getBranchShortcut(branchNameOrId?: string): BranchCode {
  if (!branchNameOrId) return "KPB";
  const b = branchNameOrId.toLowerCase();
  if (b.includes("chanda") || b.includes("chn")) return "CHN";
  if (b.includes("dilshuk") || b.includes("dil") || b.includes("dls")) return "DIL";
  if (b.includes("nalla") || b.includes("ngl") || b.includes("nlg")) return "NGL";
  return "KPB"; // Default to KPHB
}

function getRegistrationSequenceCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "registration_sequences_store.json"))) {
    return path.join(webCache, "registration_sequences_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "registration_sequences_store.json"))) {
    return path.join(rootCache, "registration_sequences_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "registration_sequences_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".registration_sequences_store.json");
    }
  }
  return path.join(rootCache, "registration_sequences_store.json");
}

function loadRegistrationSequencesFromDisk(): Record<string, number> {
  try {
    const file = getRegistrationSequenceCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (err) {
    console.warn("Failed to load registration sequences from disk cache:", err);
  }
  return { KPB: 0, CHN: 0, DIL: 0, NGL: 0 };
}

function saveRegistrationSequencesToDisk(data: Record<string, number>): void {
  try {
    const file = getRegistrationSequenceCachePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to save registration sequences cache:", err);
  }
}

function getRegistrationSequencesStore(): Record<string, number> {
  if (!global.__sphRegistrationSequencesStore) {
    global.__sphRegistrationSequencesStore = loadRegistrationSequencesFromDisk();
  }
  return global.__sphRegistrationSequencesStore;
}

export const registrationSequenceService = {
  getBranchCode(branchNameOrId?: string): BranchCode {
    return getBranchShortcut(branchNameOrId);
  },

  async getNextRegistrationId(branchNameOrId?: string): Promise<string> {
    const code = getBranchShortcut(branchNameOrId);
    const store = getRegistrationSequencesStore();

    // Scan existing patients and appointments to ensure monotonic sequence
    const patients = getPatientsStore();
    const appointments = getAppointmentsStore();

    let maxNum = store[code] || 0;
    const regex = new RegExp(`^SPH-${code}-(\\d+)`, "i");

    patients.forEach((p) => {
      const match = (p.regId || "").match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    appointments.forEach((a) => {
      const match = (a.registrationId || "").match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    store[code] = nextNum;
    global.__sphRegistrationSequencesStore = store;
    saveRegistrationSequencesToDisk(store);

    const formattedNum = String(nextNum).padStart(4, "0");
    return `SPH-${code}-${formattedNum}`;
  },

  async peekNextRegistrationId(branchNameOrId?: string): Promise<string> {
    const code = getBranchShortcut(branchNameOrId);
    const store = getRegistrationSequencesStore();
    const patients = getPatientsStore();
    const appointments = getAppointmentsStore();

    let maxNum = store[code] || 0;
    const regex = new RegExp(`^SPH-${code}-(\\d+)`, "i");

    patients.forEach((p) => {
      const match = (p.regId || "").match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    appointments.forEach((a) => {
      const match = (a.registrationId || "").match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    const formattedNum = String(nextNum).padStart(4, "0");
    return `SPH-${code}-${formattedNum}`;
  },

  async resetSequence(branchCode: BranchCode, startValue = 0): Promise<void> {
    const store = getRegistrationSequencesStore();
    store[branchCode] = startValue;
    global.__sphRegistrationSequencesStore = store;
    saveRegistrationSequencesToDisk(store);
  },
};





