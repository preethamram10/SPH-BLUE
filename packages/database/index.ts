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
  // eslint-disable-next-line no-var
  var __sphBranchTargetsStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphCleaningTasksStore: any[] | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.PRISMA_LOG === "true" ? ["query", "error", "warn"] : [],
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
  category: "STAFF" | "DOCTOR" | "HR" | "RECEPTION" | "TELECALLER" | "ADMIN" | string;
  doctorCategory?: "HEAD" | "EMPLOYEE";
  email?: string;
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
  isAccessGranted?: boolean;
  shiftStartTime?: string;
  graceMinutes?: number;
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
      email: input.email ? input.email.trim() : undefined,
      password: input.password ? input.password.trim() : undefined,
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
      isAccessGranted: input.isAccessGranted !== undefined ? Boolean(input.isAccessGranted) : (input.category === "DOCTOR" || input.category === "ADMIN" || input.category === "HR"),
      shiftStartTime: input.shiftStartTime || "09:00 AM",
      graceMinutes: input.graceMinutes !== undefined ? Number(input.graceMinutes) : 15,
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

function safeAtomicWrite(filePath: string, data: any): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (fallbackErr) {
      console.warn("Failed to write cache safely:", fallbackErr);
    }
  }
}

function saveNoShowsToDisk(data: DoctorNoShowRecord[]): void {
  const file = getNoShowsCachePath();
  safeAtomicWrite(file, data);
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
  status: "SCHEDULED" | "WAITING" | "IN_CONSULTATION" | "COLLECT_FEE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedRole?: "RECEPTION" | "ADMIN";
  deletedReason?: string;
  // Patient File & Clinical Consultation fields
  diagnosisNotes?: string;
  prescriptionImages?: string[];
  followUpInterval?: string;
  followUpDate?: string;
  consultationFee?: number;
  dietPlan?: string;
  isSentToReception?: boolean;
  isFeeCollected?: boolean;
  medicineFee?: number;
  dietPlanFee?: number;
  totalAmountDue?: number;
  paymentMethod?: "CASH" | "COUNTER_UPI" | "ONLINE_UPI" | "CARD" | "SPLIT" | "SEND_TO_APP";
  medicinesList?: Array<{
    name: string;
    type: string;
    timing: string;
    amount: number;
  }>;
  medicineDuration?: string;
  discountRequested?: number;
  discountApproved?: number;
  discountNotes?: string;
  discountStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  paidAt?: string;
  otherCharges?: number;
  discount?: number;
  discountReason?: string;
  totalPaid?: number;
  invoiceId?: string;
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
  const file = getPatientsCachePath();
  safeAtomicWrite(file, data);
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
  const file = getAppointmentsCachePath();
  safeAtomicWrite(file, data);
}

function getAppointmentsStore(): AppointmentRecord[] {
  if (!global.__sphAppointmentsStore) {
    global.__sphAppointmentsStore = loadAppointmentsFromDisk();
  }
  return global.__sphAppointmentsStore;
}

export const appointmentService = {
  async getAppointments(branch?: string, date?: string, doctorId?: string, includeDeleted = false): Promise<AppointmentRecord[]> {
    let list = getAppointmentsStore();
    if (!includeDeleted) {
      list = list.filter((a) => !a.isDeleted);
    }
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
      const cleanDoc = doctorId.toLowerCase().trim();
      list = list.filter((a) => {
        const dId = (a.doctorId || "").toLowerCase().trim();
        const dName = (a.doctorName || "").toLowerCase().trim();
        return dId === cleanDoc || dName.includes(cleanDoc) || cleanDoc.includes(dName);
      });
    }
    return list;
  },

  async createAppointment(data: Omit<AppointmentRecord, "id" | "token" | "createdAt" | "status"> & {
    id?: string;
    token?: string;
    status?: AppointmentRecord["status"];
    createdAt?: string;
  }): Promise<AppointmentRecord> {
    // Sanitization: Strip dangerous script/HTML tags and trim whitespace
    const sanitize = (val?: string) =>
      typeof val === "string" ? val.replace(/<[^>]*>?/gm, "").trim() : "";

    const cleanPatientName = sanitize(data.patientName);
    const cleanPhone = (data.phone || "").replace(/\D/g, "");
    const cleanRegId = sanitize(data.registrationId);
    const cleanTimeSlot = sanitize(data.timeSlot);
    const cleanDate = sanitize(data.appointmentDate);
    const cleanDoctorId = sanitize(data.doctorId);
    const cleanBranch = sanitize(data.branch);

    if (!cleanPatientName) {
      throw new Error("Patient name is required.");
    }
    if (cleanPhone.length < 10) {
      throw new Error("Invalid phone number: must be at least 10 digits.");
    }
    if (!cleanTimeSlot || !cleanDate) {
      throw new Error("Appointment date and time slot are required.");
    }

    // Anti-overbooking guardrail: Check capacity before creating appointment
    const currentBookedCount = await this.getSlotBookedCount(
      cleanBranch,
      cleanDate,
      cleanDoctorId,
      cleanTimeSlot
    );
    if (currentBookedCount >= 3) {
      throw new Error(
        `Slot "${cleanTimeSlot}" is already fully booked (${currentBookedCount}/3 capacity). Please choose another time slot.`
      );
    }

    const store = getAppointmentsStore();
    const tokenNum = Math.floor(10 + Math.random() * 90);
    const newRecord: AppointmentRecord = {
      ...data,
      id: data.id || `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      token: data.token || `SPH-${tokenNum}`,
      status: data.status || "WAITING",
      createdAt: data.createdAt || new Date().toISOString(),
      patientName: cleanPatientName,
      phone: cleanPhone,
      registrationId: cleanRegId,
      timeSlot: cleanTimeSlot,
      appointmentDate: cleanDate,
      doctorId: cleanDoctorId,
      branch: cleanBranch,
      diseases: sanitize(data.diseases),
      notes: sanitize(data.notes),
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
      (a) => a.timeSlot.trim().toUpperCase() === cleanSlot && a.status !== "CANCELLED" && !a.isDeleted
    ).length;
  },

  /**
   * Soft-deletes an appointment with 24h (Reception) / 48h (Admin) retention window.
   */
  async deleteAppointment(
    id: string,
    deletedBy = "Reception",
    role: "RECEPTION" | "ADMIN" = "RECEPTION",
    reason = "Cancelled by user"
  ): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const idx = store.findIndex((a) => a.id === id || a.token === id);
    if (idx === -1) return null;

    store[idx].isDeleted = true;
    store[idx].deletedAt = new Date().toISOString();
    store[idx].deletedBy = deletedBy;
    store[idx].deletedRole = role;
    store[idx].deletedReason = reason;
    store[idx].status = "CANCELLED";

    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return store[idx];
  },

  /**
   * Restores a deleted appointment back to active status.
   */
  async restoreAppointment(id: string): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const idx = store.findIndex((a) => a.id === id || a.token === id);
    if (idx === -1) return null;

    store[idx].isDeleted = false;
    store[idx].deletedAt = undefined;
    store[idx].deletedBy = undefined;
    store[idx].deletedRole = undefined;
    store[idx].deletedReason = undefined;
    store[idx].status = "SCHEDULED";

    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return store[idx];
  },

  /**
   * Retrieves a single appointment by id or token.
   */
  async getAppointmentById(id: string): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const appt = store.find((a) => a.id === id || a.token === id);
    return appt || null;
  },

  /**
   * Updates an appointment's status (e.g. IN_CONSULTATION, COMPLETED).
   */
  async updateAppointmentStatus(id: string, status: AppointmentRecord["status"]): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const appt = store.find((a) => a.id === id || a.token === id);
    if (!appt) return null;
    appt.status = status;
    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return appt;
  },

  /**
   * Records payment details, fees, itemized medicines, and marks appointment COMPLETED.
   */
  async recordAppointmentPayment(
    id: string,
    data: {
      consultationFee?: number;
      medicineFee?: number;
      dietPlanFee?: number;
      totalAmountDue?: number;
      paymentMethod?: "CASH" | "COUNTER_UPI" | "ONLINE_UPI" | "CARD" | "SPLIT" | "SEND_TO_APP";
      medicinesList?: Array<{
        name: string;
        type: string;
        timing: string;
        amount: number;
      }>;
      medicineDuration?: string;
      discountRequested?: number;
      discountApproved?: number;
      discountNotes?: string;
      discountStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
      otherCharges?: number;
      discount?: number;
      discountReason?: string;
      totalPaid?: number;
      invoiceId?: string;
    }
  ): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const appt = store.find((a) => a.id === id || a.token === id);
    if (!appt) return null;

    if (data.consultationFee !== undefined) appt.consultationFee = data.consultationFee;
    if (data.medicineFee !== undefined) appt.medicineFee = data.medicineFee;
    if (data.dietPlanFee !== undefined) appt.dietPlanFee = data.dietPlanFee;
    if (data.totalAmountDue !== undefined) appt.totalAmountDue = data.totalAmountDue;
    if (data.paymentMethod !== undefined) appt.paymentMethod = data.paymentMethod;
    if (data.medicinesList !== undefined) appt.medicinesList = data.medicinesList;
    if (data.medicineDuration !== undefined) appt.medicineDuration = data.medicineDuration;
    if (data.discountRequested !== undefined) appt.discountRequested = data.discountRequested;
    if (data.discountApproved !== undefined) appt.discountApproved = data.discountApproved;
    if (data.discountNotes !== undefined) appt.discountNotes = data.discountNotes;
    if (data.discountStatus !== undefined) appt.discountStatus = data.discountStatus;
    if (data.otherCharges !== undefined) appt.otherCharges = data.otherCharges;
    if (data.discount !== undefined) appt.discount = data.discount;
    if (data.discountReason !== undefined) appt.discountReason = data.discountReason;
    if (data.totalPaid !== undefined) appt.totalPaid = data.totalPaid;
    if (data.invoiceId) {
      appt.invoiceId = data.invoiceId;
    } else if (!appt.invoiceId) {
      appt.invoiceId = `INV-${Date.now().toString().slice(-6)}`;
    }

    appt.status = "COMPLETED";
    appt.isFeeCollected = true;
    appt.paidAt = new Date().toISOString();

    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return appt;
  },

  /**
   * Requests a medicine discount for HR/Admin approval.
   */
  async requestMedicineDiscount(
    id: string,
    data: { discountAmount: number; notes: string }
  ): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const appt = store.find((a) => a.id === id || a.token === id);
    if (!appt) return null;

    appt.discountRequested = data.discountAmount;
    appt.discountNotes = data.notes;
    appt.discountStatus = "PENDING";

    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return appt;
  },

  /**
   * HR or Admin responds (ACCEPT or REJECT) to a pending medicine discount request.
   */
  async respondMedicineDiscount(
    id: string,
    data: { action: "ACCEPT" | "REJECT"; approvedAmount?: number; notes?: string }
  ): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const appt = store.find((a) => a.id === id || a.token === id);
    if (!appt) return null;

    if (data.action === "ACCEPT") {
      appt.discountStatus = "APPROVED";
      appt.discountApproved = data.approvedAmount !== undefined ? data.approvedAmount : (appt.discountRequested || 0);
    } else {
      appt.discountStatus = "REJECTED";
      appt.discountApproved = 0;
    }
    if (data.notes) {
      appt.discountNotes = `${appt.discountNotes || ""} | HR/Admin Note: ${data.notes}`.trim();
    }

    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return appt;
  },

  /**
   * Returns all pending discount requests for HR / Admin.
   */
  async getPendingDiscounts(): Promise<AppointmentRecord[]> {
    const store = getAppointmentsStore();
    return store.filter((a) => a.discountStatus === "PENDING" && !a.isDeleted);
  },

  /**
   * Updates clinical patient file details and hands off to reception.
   */
  async updatePatientFile(
    id: string,
    data: {
      diagnosisNotes?: string;
      prescriptionImages?: string[];
      followUpInterval?: string;
      followUpDate?: string;
      consultationFee?: number;
      dietPlan?: string;
      isSentToReception?: boolean;
      status?: AppointmentRecord["status"];
    }
  ): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const appt = store.find((a) => a.id === id || a.token === id);
    if (!appt) return null;

    if (data.diagnosisNotes !== undefined) appt.diagnosisNotes = data.diagnosisNotes;
    if (data.prescriptionImages !== undefined) appt.prescriptionImages = data.prescriptionImages;
    if (data.followUpInterval !== undefined) appt.followUpInterval = data.followUpInterval;
    if (data.followUpDate !== undefined) appt.followUpDate = data.followUpDate;
    if (data.consultationFee !== undefined) appt.consultationFee = data.consultationFee;
    if (data.dietPlan !== undefined) appt.dietPlan = data.dietPlan;
    if (data.isSentToReception !== undefined) appt.isSentToReception = data.isSentToReception;
    if (data.status !== undefined) appt.status = data.status;

    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return appt;
  },

  /**
   * Reorders appointments to match the specified order of IDs.
   */
  async reorderAppointments(orderedIds: string[]): Promise<boolean> {
    const store = getAppointmentsStore();
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return false;
    const idIndexMap = new Map(orderedIds.map((id, index) => [id, index]));
    store.sort((a, b) => {
      const idxA = idIndexMap.has(a.id) ? idIndexMap.get(a.id)! : 999999;
      const idxB = idIndexMap.has(b.id) ? idIndexMap.get(b.id)! : 999999;
      return idxA - idxB;
    });
    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return true;
  },

  /**
   * Reschedules an appointment to a new date and time slot.
   */
  async rescheduleAppointment(id: string, newDate: string, newTimeSlot: string): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const appt = store.find((a) => a.id === id || a.token === id);
    if (!appt) return null;
    appt.appointmentDate = newDate;
    appt.timeSlot = newTimeSlot;
    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return appt;
  },

  /**
   * Permanently deletes an appointment record.
   */
  async permanentlyDeleteAppointment(id: string): Promise<boolean> {
    let store = getAppointmentsStore();
    const initLen = store.length;
    store = store.filter((a) => a.id !== id && a.token !== id);
    if (store.length !== initLen) {
      global.__sphAppointmentsStore = store;
      saveAppointmentsToDisk(store);
      return true;
    }
    return false;
  },

  /**
   * Retrieves deleted appointments based on role visibility:
   * - RECEPTION: only appointments deleted within the last 24 HOURS
   * - ADMIN: appointments deleted within the last 48 HOURS
   * Auto-purges records older than 48 hours.
   */
  async getDeletedAppointments(
    role: "RECEPTION" | "ADMIN" = "RECEPTION",
    branch?: string
  ): Promise<Array<AppointmentRecord & { hoursRemaining: number }>> {
    let store = getAppointmentsStore();
    const now = Date.now();
    const maxHours = role === "ADMIN" ? 48 : 24;
    const maxMs = maxHours * 60 * 60 * 1000;

    // Purge records older than 48 hours completely
    const purge48Ms = 48 * 60 * 60 * 1000;
    const activeStore = store.filter((a) => {
      if (!a.isDeleted || !a.deletedAt) return true;
      const elapsed = now - new Date(a.deletedAt).getTime();
      return elapsed <= purge48Ms;
    });
    if (activeStore.length !== store.length) {
      global.__sphAppointmentsStore = activeStore;
      saveAppointmentsToDisk(activeStore);
      store = activeStore;
    }

    let deleted = store.filter((a) => {
      if (!a.isDeleted || !a.deletedAt) return false;
      const elapsed = now - new Date(a.deletedAt).getTime();
      return elapsed <= maxMs;
    });

    if (branch && branch !== "All Branches" && branch !== "All") {
      const cleanB = branch.toLowerCase().replace(/branch/gi, "").trim();
      deleted = deleted.filter((a) => {
        const ab = a.branch.toLowerCase().replace(/branch/gi, "").trim();
        return ab === cleanB || cleanB.includes(ab) || ab.includes(cleanB);
      });
    }

    return deleted.map((a) => {
      const elapsed = now - new Date(a.deletedAt!).getTime();
      const remainingMs = Math.max(0, maxMs - elapsed);
      const hoursRemaining = Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)));
      return {
        ...a,
        hoursRemaining,
      };
    });
  },

  /**
   * Calculates monthly branch-wise deleted appointments count.
   * Resets automatically at the start of every calendar month.
   */
  async getMonthlyDeletedAppointmentsCount(): Promise<{
    monthName: string;
    total: number;
    branchWise: Record<string, number>;
  }> {
    const store = getAppointmentsStore();
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const allBranches = await branchService.getAllBranches();
    const branchWise: Record<string, number> = {};
    allBranches.forEach((b) => {
      branchWise[b.name] = 0;
    });

    let total = 0;

    store.forEach((a) => {
      if (!a.deletedAt) return;
      const dt = new Date(a.deletedAt);
      if (dt.getFullYear() === curYear && dt.getMonth() === curMonth) {
        total++;
        const rawBranch = (a.branch || "").trim();
        const matched = allBranches.find(
          (b) =>
            b.name.toLowerCase() === rawBranch.toLowerCase() ||
            rawBranch.toLowerCase().includes(b.name.toLowerCase()) ||
            b.name.toLowerCase().includes(rawBranch.toLowerCase())
        );
        const branchKey = matched ? matched.name : (rawBranch || "Other");
        branchWise[branchKey] = (branchWise[branchKey] || 0) + 1;
      }
    });

    return {
      monthName: `${monthNames[curMonth]} ${curYear}`,
      total,
      branchWise,
    };
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

// ============================================================================
// 10. BRANCH TARGET MANAGEMENT SERVICE
// ============================================================================

export interface BranchTargetRecord {
  id: string;
  branch: string;
  monthYear: string; // format "YYYY-MM" e.g. "2026-11"
  targetAmount: number;
  setByRole: "ADMIN" | "HR";
  setByName?: string;
  setAt: string;
  updatedAt: string;
  hrLocked?: boolean;
}

function getBranchTargetsCachePath(): string {
  const rootCache = path.join(process.cwd(), "..", "..", ".cache");
  if (!fs.existsSync(rootCache)) {
    fs.mkdirSync(rootCache, { recursive: true });
  }
  return path.join(rootCache, "branch_targets_store.json");
}

function loadBranchTargetsFromDisk(): BranchTargetRecord[] {
  try {
    const file = getBranchTargetsCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to load branch targets from cache:", err);
  }
  return [];
}

function saveBranchTargetsToDisk(data: BranchTargetRecord[]): void {
  const file = getBranchTargetsCachePath();
  safeAtomicWrite(file, data);
}

function getBranchTargetsStore(): BranchTargetRecord[] {
  if (!global.__sphBranchTargetsStore) {
    global.__sphBranchTargetsStore = loadBranchTargetsFromDisk();
  }
  return global.__sphBranchTargetsStore;
}

function getMonthWindowInfo() {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const currentMonthKey = `${curYear}-${String(curMonth + 1).padStart(2, "0")}`;

  const nextDate = new Date(curYear, curMonth + 1, 1);
  const nextMonthKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

  const daysInCurrentMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const currentDay = now.getDate();
  // Enabled during the last 3 days of the current month (e.g., days 28-30 in a 30-day month)
  const isNextMonthWindowOpen = currentDay >= daysInCurrentMonth - 2;
  const daysUntilNextMonthWindow = Math.max(0, daysInCurrentMonth - 2 - currentDay);

  return {
    currentMonthKey,
    nextMonthKey,
    daysInCurrentMonth,
    currentDay,
    isNextMonthWindowOpen,
    daysUntilNextMonthWindow,
  };
}

export const branchTargetService = {
  getMonthWindowInfo,

  async canSetTarget(
    monthYear: string,
    role: "ADMIN" | "HR",
    branch: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const info = getMonthWindowInfo();
    const cleanBranch = normalizeBranchName(branch);
    const store = getBranchTargetsStore();
    const existing = store.find(
      (t) => normalizeBranchName(t.branch) === cleanBranch && t.monthYear === monthYear
    );

    // 1. Next Month Check: Must be within 3 days before month end
    if (monthYear === info.nextMonthKey) {
      if (!info.isNextMonthWindowOpen) {
        return {
          allowed: false,
          reason: `Next month (${monthYear}) target can only be set during the last 3 days of the current month (in ${info.daysUntilNextMonthWindow} day(s)).`,
        };
      }
    }

    // 2. Future Month (beyond next month) is not allowed yet
    if (monthYear > info.nextMonthKey) {
      return {
        allowed: false,
        reason: "Targets cannot be set more than one month in advance.",
      };
    }

    // 3. HR Specific Rule: HR can set only ONCE per month
    if (role === "HR") {
      if (existing?.hrLocked) {
        return {
          allowed: false,
          reason: "HR can only set the target once per month for this branch. Only Admin can update it now.",
        };
      }
      // HR cannot edit past months
      if (monthYear < info.currentMonthKey) {
        return {
          allowed: false,
          reason: "HR cannot edit targets for past months. Only Admin can modify past targets.",
        };
      }
    }

    // 4. Admin can set or change targets at any time
    return { allowed: true };
  },

  async setBranchTarget(data: {
    branch: string;
    monthYear: string;
    targetAmount: number;
    role: "ADMIN" | "HR";
    userName?: string;
  }): Promise<{ success: boolean; target?: BranchTargetRecord; error?: string }> {
    const { branch, monthYear, targetAmount, role, userName } = data;

    const check = await this.canSetTarget(monthYear, role, branch);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    if (typeof targetAmount !== "number" || targetAmount < 0) {
      return { success: false, error: "Please enter a valid target amount (₹)." };
    }

    const store = getBranchTargetsStore();
    const cleanBranch = normalizeBranchName(branch);
    const existingIdx = store.findIndex(
      (t) => normalizeBranchName(t.branch) === cleanBranch && t.monthYear === monthYear
    );

    const nowIso = new Date().toISOString();

    if (existingIdx >= 0) {
      const existing = store[existingIdx];
      existing.targetAmount = targetAmount;
      existing.updatedAt = nowIso;
      existing.setByRole = role;
      if (userName) existing.setByName = userName;
      if (role === "HR") existing.hrLocked = true;
      global.__sphBranchTargetsStore = store;
      saveBranchTargetsToDisk(store);
      return { success: true, target: existing };
    } else {
      const newRecord: BranchTargetRecord = {
        id: `TGT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        branch: branch.trim(),
        monthYear,
        targetAmount,
        setByRole: role,
        setByName: userName || (role === "ADMIN" ? "Admin" : "HR"),
        setAt: nowIso,
        updatedAt: nowIso,
        hrLocked: role === "HR",
      };
      store.push(newRecord);
      global.__sphBranchTargetsStore = store;
      saveBranchTargetsToDisk(store);
      return { success: true, target: newRecord };
    }
  },

  async getBranchTargets(monthYear?: string, userRole: "ADMIN" | "HR" = "ADMIN") {
    const info = getMonthWindowInfo();
    const activeMonth = monthYear || info.currentMonthKey;

    const allBranches = await branchService.getAllBranches();
    const targetsStore = getBranchTargetsStore();
    const appointments = getAppointmentsStore();

    // Map targets with live revenue calculated per branch
    const branchResults = allBranches.map((b) => {
      const cleanBranch = normalizeBranchName(b.name);

      // 1. Target configured for this month
      const targetRecord = targetsStore.find(
        (t) => normalizeBranchName(t.branch) === cleanBranch && t.monthYear === activeMonth
      );
      const targetGoal = targetRecord ? targetRecord.targetAmount : 0;

      // 2. Real-time live revenue reached: calculate sum of all completed appointments for THIS branch in THIS month
      const branchAppts = appointments.filter((a) => {
        if (a.isDeleted) return false;
        // Check branch match
        const apptBranch = normalizeBranchName(a.branch);
        if (apptBranch !== cleanBranch) return false;

        // Check completion status or paid payment
        const isPaidOrCompleted =
          a.status === "COMPLETED" ||
          Boolean(a.paidAt) ||
          Boolean(a.paymentMethod);
        if (!isPaidOrCompleted) return false;

        // Check if appointment falls in the specified monthYear
        if (a.paidAt && typeof a.paidAt === "string" && a.paidAt.startsWith(activeMonth)) {
          return true;
        }
        if (a.appointmentDate && typeof a.appointmentDate === "string") {
          const parts = a.appointmentDate.split("-");
          if (parts.length === 3) {
            let yyyy = parts[2];
            let mm = parts[1];
            if (parts[0].length === 4) {
              yyyy = parts[0];
              mm = parts[1];
            }
            if (`${yyyy}-${mm.padStart(2, "0")}` === activeMonth) {
              return true;
            }
          }
        }
        return false;
      });

      const targetReached = branchAppts.reduce((sum, a) => {
        const fee =
          typeof a.totalAmountDue === "number" && a.totalAmountDue > 0
            ? a.totalAmountDue
            : (a.consultationFee || 0) + (a.medicineFee || 0) + (a.dietPlanFee || 0);
        return sum + fee;
      }, 0);

      const percentage = targetGoal > 0 ? Math.round((targetReached / targetGoal) * 1000) / 10 : 0;
      const remaining = Math.max(0, targetGoal - targetReached);

      let status = "Not Set";
      if (targetGoal > 0) {
        if (targetReached >= targetGoal) status = "Achieved";
        else if (percentage >= 75) status = "On Track";
        else if (percentage >= 40) status = "In Progress";
        else status = "Needs Attention";
      }

      // Permissions check
      const canEdit =
        userRole === "ADMIN" ||
        (userRole === "HR" && !targetRecord?.hrLocked && activeMonth >= info.currentMonthKey);

      return {
        id: targetRecord?.id || `draft-${b.id}`,
        branch: b.name,
        branchId: b.id,
        monthYear: activeMonth,
        targetGoal,
        targetReached,
        percentage,
        remaining,
        status,
        completedAppointmentsCount: branchAppts.length,
        setByRole: targetRecord?.setByRole || null,
        setByName: targetRecord?.setByName || null,
        hrLocked: Boolean(targetRecord?.hrLocked),
        canEdit,
      };
    });

    const totalGoal = branchResults.reduce((sum, b) => sum + b.targetGoal, 0);
    const totalReached = branchResults.reduce((sum, b) => sum + b.targetReached, 0);
    const overallPercentage = totalGoal > 0 ? Math.round((totalReached / totalGoal) * 1000) / 10 : 0;

    return {
      monthYear: activeMonth,
      isCurrentMonth: activeMonth === info.currentMonthKey,
      isNextMonth: activeMonth === info.nextMonthKey,
      isNextMonthWindowOpen: info.isNextMonthWindowOpen,
      daysUntilNextMonthWindow: info.daysUntilNextMonthWindow,
      totalGoal,
      totalReached,
      overallPercentage,
      branches: branchResults,
    };
  },

  getHistoricalMonthsList(monthsBack = 12) {
    const info = getMonthWindowInfo();
    const now = new Date();
    const months = [];

    // Next Month
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
    const nextLabel = nextDate.toLocaleString("default", { month: "short", year: "numeric" });
    months.push({
      key: nextKey,
      label: `Next Month (${nextLabel})`,
      isNextMonth: true,
      windowOpen: info.isNextMonthWindowOpen,
    });

    // Current Month
    const curLabel = now.toLocaleString("default", { month: "short", year: "numeric" });
    months.push({
      key: info.currentMonthKey,
      label: `This Month (${curLabel})`,
      isCurrentMonth: true,
    });

    // Past Months
    for (let i = 1; i <= monthsBack; i++) {
      const pastDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pastKey = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, "0")}`;
      const pastLabel = pastDate.toLocaleString("default", { month: "short", year: "numeric" });
      const labelPrefix = i === 1 ? "Last Month" : i === 2 ? "Month Before Last" : pastLabel;
      months.push({
        key: pastKey,
        label: `${labelPrefix} (${pastLabel})`,
        isPastMonth: true,
      });
    }

    return months;
  },
};

// ---------------------------------------------------------------------------
// Branch Cleaning & Sanitation Audit System (DD-MM-YYYY)
// ---------------------------------------------------------------------------

export type CleaningStatus = "PENDING_UPLOAD" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
export type CleaningFieldStatus = "PENDING" | "UPLOADED" | "APPROVED" | "REJECTED";

export interface CleaningPhotoRecord {
  id: string;
  url: string;
  key: string;
  uploadedAt: string;
}

export interface CleaningFieldRecord {
  id: string;
  name: string;
  photos: CleaningPhotoRecord[];
  status: CleaningFieldStatus;
  rejectReason?: string;
}

export interface CleaningHistoryLogRecord {
  action: string;
  performedBy: string;
  performedRole: string;
  timestamp: string;
  remarks?: string;
}

export interface CleaningTaskRecord {
  id: string;
  branchId: string;
  branchName: string;
  assignedDate: string; // Strictly DD-MM-YYYY
  status: CleaningStatus;
  assignedBy: string;
  assignedRole: "ADMIN" | "HR";
  assignedAt: string;
  fields: CleaningFieldRecord[];
  reviewedBy?: string;
  reviewedRole?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
  historyLogs: CleaningHistoryLogRecord[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Returns today's date formatted strictly as DD-MM-YYYY
 */
export function getTodayDDMMYYYY(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}-${m}-${y}`;
}

/**
 * Normalizes any date string (ISO, YYYY-MM-DD, etc.) into DD-MM-YYYY
 */
export function toDDMMYYYY(input?: string): string {
  if (!input) return getTodayDDMMYYYY();
  const trimmed = input.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${d}-${m}-${y}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, "0");
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }
  return trimmed;
}

/**
 * Converts DD-MM-YYYY to YYYY-MM-DD for native HTML <input type="date">
 */
export function toYYYYMMDD(ddmmyyyy?: string): string {
  if (!ddmmyyyy) return "";
  const trimmed = ddmmyyyy.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("-");
    return `${y}-${m}-${d}`;
  }
  return trimmed;
}

function getCleaningCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "cleaning_tasks_store.json"))) {
    return path.join(webCache, "cleaning_tasks_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "cleaning_tasks_store.json"))) {
    return path.join(rootCache, "cleaning_tasks_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "cleaning_tasks_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".cleaning_tasks_store.json");
    }
  }
  return path.join(rootCache, "cleaning_tasks_store.json");
}

function loadCleaningTasksFromDisk(): CleaningTaskRecord[] {
  try {
    const file = getCleaningCachePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to read cleaning tasks cache:", err);
  }
  return [];
}

function saveCleaningTasksToDisk(data: CleaningTaskRecord[]): void {
  try {
    const file = getCleaningCachePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write cleaning tasks cache:", err);
  }
}

function getCleaningTasksStore(): CleaningTaskRecord[] {
  if (!global.__sphCleaningTasksStore) {
    global.__sphCleaningTasksStore = loadCleaningTasksFromDisk();
  }
  return global.__sphCleaningTasksStore;
}

export const cleaningTaskService = {
  async getAllTasks(filter?: {
    branchName?: string;
    date?: string;
    status?: string;
  }): Promise<CleaningTaskRecord[]> {
    let tasks = getCleaningTasksStore();

    if (filter?.branchName && filter.branchName !== "ALL") {
      const cleanFilter = filter.branchName.toLowerCase().replace(/branch/gi, "").trim();
      tasks = tasks.filter((t) =>
        t.branchName.toLowerCase().replace(/branch/gi, "").trim().includes(cleanFilter)
      );
    }

    if (filter?.date && filter.date !== "ALL") {
      const targetDate = toDDMMYYYY(filter.date);
      tasks = tasks.filter((t) => t.assignedDate === targetDate);
    }

    if (filter?.status && filter.status !== "ALL") {
      tasks = tasks.filter((t) => t.status === filter.status);
    }

    return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getTaskById(id: string): Promise<CleaningTaskRecord | null> {
    const tasks = getCleaningTasksStore();
    return tasks.find((t) => t.id === id) || null;
  },

  async createTask(input: {
    branchId?: string;
    branchName: string;
    assignedDate: string; // DD-MM-YYYY
    assignedBy: string;
    assignedRole?: "ADMIN" | "HR";
    fieldNames: string[];
  }): Promise<CleaningTaskRecord> {
    const tasks = getCleaningTasksStore();
    const dateFormatted = toDDMMYYYY(input.assignedDate);

    // Build fields array
    const fields: CleaningFieldRecord[] = input.fieldNames.map((name, index) => ({
      id: `fld-${Date.now()}-${index}`,
      name: name.trim(),
      photos: [],
      status: "PENDING",
    }));

    const newTask: CleaningTaskRecord = {
      id: `ct-${Date.now()}`,
      branchId: input.branchId || `b-${Date.now()}`,
      branchName: input.branchName.trim(),
      assignedDate: dateFormatted,
      status: "PENDING_UPLOAD",
      assignedBy: input.assignedBy || "Admin / HR",
      assignedRole: input.assignedRole || "ADMIN",
      assignedAt: new Date().toISOString(),
      fields,
      historyLogs: [
        {
          action: "TASK_CREATED",
          performedBy: input.assignedBy || "Admin / HR",
          performedRole: input.assignedRole || "ADMIN",
          timestamp: new Date().toISOString(),
          remarks: `Assigned cleaning inspection for ${dateFormatted} with ${fields.length} areas.`,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.unshift(newTask);
    global.__sphCleaningTasksStore = tasks;
    saveCleaningTasksToDisk(tasks);
    return newTask;
  },

  async updateTask(
    id: string,
    updates: Partial<CleaningTaskRecord>
  ): Promise<CleaningTaskRecord | null> {
    const tasks = getCleaningTasksStore();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const existing = tasks[idx];
    const updated: CleaningTaskRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    tasks[idx] = updated;
    global.__sphCleaningTasksStore = tasks;
    saveCleaningTasksToDisk(tasks);
    return updated;
  },

  async submitPhotosForVerification(
    taskId: string,
    fieldsData: { fieldId: string; photos: CleaningPhotoRecord[] }[],
    submittedBy: string
  ): Promise<CleaningTaskRecord | null> {
    const tasks = getCleaningTasksStore();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    const task = tasks[idx];

    // Update each field's photos
    const updatedFields = task.fields.map((field) => {
      const match = fieldsData.find((f) => f.fieldId === field.id);
      if (match) {
        return {
          ...field,
          photos: match.photos,
          status: match.photos.length > 0 ? ("UPLOADED" as const) : field.status,
          rejectReason: undefined,
        };
      }
      return field;
    });

    task.fields = updatedFields;
    task.status = "UNDER_REVIEW";
    task.updatedAt = new Date().toISOString();
    task.historyLogs.push({
      action: "SUBMITTED_FOR_VERIFICATION",
      performedBy: submittedBy || "Branch Reception",
      performedRole: "RECEPTION",
      timestamp: new Date().toISOString(),
      remarks: "All inspection photos uploaded and submitted for review.",
    });

    tasks[idx] = task;
    global.__sphCleaningTasksStore = tasks;
    saveCleaningTasksToDisk(tasks);
    return task;
  },

  async reviewTask(
    taskId: string,
    review: {
      action: "APPROVE" | "REJECT";
      reviewedBy: string;
      reviewedRole: "ADMIN" | "HR";
      remarks?: string;
      rejectedFieldIds?: string[];
      fieldRemarks?: Record<string, string>;
    }
  ): Promise<CleaningTaskRecord | null> {
    const tasks = getCleaningTasksStore();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    const task = tasks[idx];

    if (review.action === "APPROVE") {
      task.status = "APPROVED";
      task.reviewedBy = review.reviewedBy;
      task.reviewedRole = review.reviewedRole;
      task.reviewedAt = new Date().toISOString();
      task.reviewRemarks = review.remarks || "All cleaning photos verified and approved.";
      task.fields = task.fields.map((f) => ({
        ...f,
        status: "APPROVED" as const,
        rejectReason: undefined,
      }));
      task.historyLogs.push({
        action: "TASK_APPROVED",
        performedBy: review.reviewedBy,
        performedRole: review.reviewedRole,
        timestamp: new Date().toISOString(),
        remarks: review.remarks || "Approved all inspection areas. Reception unlocked.",
      });
    } else {
      task.status = "REJECTED";
      task.reviewedBy = review.reviewedBy;
      task.reviewedRole = review.reviewedRole;
      task.reviewedAt = new Date().toISOString();
      task.reviewRemarks = review.remarks || "Some or all photos were rejected.";

      const rejSet = new Set(review.rejectedFieldIds || []);
      const rejectAll = !review.rejectedFieldIds || review.rejectedFieldIds.length === 0;

      task.fields = task.fields.map((f) => {
        if (rejectAll || rejSet.has(f.id)) {
          const reason = review.fieldRemarks?.[f.id] || review.remarks || "Requires cleaning re-inspection.";
          return {
            ...f,
            status: "REJECTED" as const,
            rejectReason: reason,
          };
        }
        return f;
      });

      task.historyLogs.push({
        action: "TASK_REJECTED",
        performedBy: review.reviewedBy,
        performedRole: review.reviewedRole,
        timestamp: new Date().toISOString(),
        remarks: review.remarks || `Rejected areas: ${review.rejectedFieldIds?.join(", ") || "All"}. Re-upload required.`,
      });
    }

    task.updatedAt = new Date().toISOString();
    tasks[idx] = task;
    global.__sphCleaningTasksStore = tasks;
    saveCleaningTasksToDisk(tasks);
    return task;
  },

  async checkLockout(
    branchName: string,
    targetDateStr?: string
  ): Promise<{
    lockout: boolean;
    task: CleaningTaskRecord | null;
    message?: string;
  }> {
    if (!branchName) return { lockout: false, task: null };

    const dateStr = targetDateStr ? toDDMMYYYY(targetDateStr) : getTodayDDMMYYYY();
    const cleanBranch = branchName.toLowerCase().replace(/branch/gi, "").trim();

    const tasks = getCleaningTasksStore();
    const matchingTask = tasks.find(
      (t) =>
        t.branchName.toLowerCase().replace(/branch/gi, "").trim().includes(cleanBranch) &&
        t.assignedDate === dateStr
    );

    if (!matchingTask) {
      return { lockout: false, task: null };
    }

    // If already approved, lockout is lifted!
    if (matchingTask.status === "APPROVED") {
      return { lockout: false, task: matchingTask, message: "Cleaning verified and approved." };
    }

    // If PENDING_UPLOAD, UNDER_REVIEW, or REJECTED, Reception is locked!
    let msg = "Cleaning audit is mandatory today. Please upload photos for all inspection areas.";
    if (matchingTask.status === "UNDER_REVIEW") {
      msg = "Cleaning photos submitted for verification. Waiting for Admin / HR approval.";
    } else if (matchingTask.status === "REJECTED") {
      msg = "Cleaning photos were rejected. Please check feedback and re-upload.";
    }

    return {
      lockout: true,
      task: matchingTask,
      message: msg,
    };
  },

  async deleteTask(id: string): Promise<boolean> {
    const tasks = getCleaningTasksStore();
    const filtered = tasks.filter((t) => t.id !== id);
    if (filtered.length === tasks.length) return false;
    global.__sphCleaningTasksStore = filtered;
    saveCleaningTasksToDisk(filtered);
    return true;
  },
};

// ==========================================
// 11. MEDICINE / MEDICAL REQUESTS SERVICE
// ==========================================

export interface MedicineRequestItem {
  id: string;
  name: string;
  type?: string;
  timing?: string;
  amount?: number;
}

export interface MedicineRequestRecord {
  id: string;
  requestId: string;
  patientName: string;
  phone: string;
  gender: string;
  age?: string;
  branchName: string;
  duration: string;
  totalAmount: number;
  medicines: MedicineRequestItem[];
  deliveryAddress?: string;
  status: "pending" | "completed" | "dispatched";
  createdAt: string;
  updatedAt?: string;
}

declare global {
  var __sphMedicineRequestsStore: MedicineRequestRecord[] | undefined;
}

function getMedicineRequestsCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "medicine_requests_store.json"))) {
    return path.join(webCache, "medicine_requests_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "medicine_requests_store.json"))) {
    return path.join(rootCache, "medicine_requests_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "medicine_requests_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".medicine_requests_store.json");
    }
  }
  return path.join(rootCache, "medicine_requests_store.json");
}

function saveMedicineRequestsToDisk(data: MedicineRequestRecord[]): void {
  const file = getMedicineRequestsCachePath();
  safeAtomicWrite(file, data);
}

function getMedicineRequestsStore(): MedicineRequestRecord[] {
  if (global.__sphMedicineRequestsStore && global.__sphMedicineRequestsStore.length > 0) {
    return global.__sphMedicineRequestsStore;
  }
  const file = getMedicineRequestsCachePath();
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        global.__sphMedicineRequestsStore = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to load medicine requests from disk:", e);
    }
  }
  global.__sphMedicineRequestsStore = [];
  return [];
}

export const medicineRequestService = {
  async getAllRequests(branch?: string, status?: string): Promise<MedicineRequestRecord[]> {
    let store = getMedicineRequestsStore();
    if (branch && branch !== "ALL") {
      const cleanBranch = branch.toLowerCase().replace(/branch/gi, "").trim();
      store = store.filter((item) => {
        const itemBranch = item.branchName.toLowerCase().replace(/branch/gi, "").trim();
        return itemBranch === cleanBranch || cleanBranch.includes(itemBranch) || itemBranch.includes(cleanBranch);
      });
    }
    if (status && status !== "ALL") {
      const s = status.toLowerCase();
      store = store.filter((item) => item.status.toLowerCase() === s);
    }
    return store;
  },

  async createRequest(
    data: Omit<MedicineRequestRecord, "id" | "requestId" | "createdAt" | "status"> & {
      id?: string;
      requestId?: string;
      status?: "pending" | "completed" | "dispatched";
      createdAt?: string;
    }
  ): Promise<MedicineRequestRecord> {
    const store = getMedicineRequestsStore();
    const generatedId = `med_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord: MedicineRequestRecord = {
      ...data,
      id: data.id || generatedId,
      requestId: data.requestId || `MED-${Date.now().toString().slice(-6)}`,
      status: data.status || "pending",
      createdAt: data.createdAt || new Date().toISOString(),
    };
    store.unshift(newRecord);
    global.__sphMedicineRequestsStore = store;
    saveMedicineRequestsToDisk(store);
    return newRecord;
  },

  async updateRequestStatus(
    id: string,
    status: "pending" | "completed" | "dispatched"
  ): Promise<MedicineRequestRecord | null> {
    const store = getMedicineRequestsStore();
    const item = store.find((r) => r.id === id || r.requestId === id);
    if (!item) return null;
    item.status = status;
    item.updatedAt = new Date().toISOString();
    global.__sphMedicineRequestsStore = store;
    saveMedicineRequestsToDisk(store);
    return item;
  },

  async deleteRequest(id: string): Promise<boolean> {
    const store = getMedicineRequestsStore();
    const filtered = store.filter((r) => r.id !== id && r.requestId !== id);
    if (filtered.length === store.length) return false;
    global.__sphMedicineRequestsStore = filtered;
    saveMedicineRequestsToDisk(filtered);
    return true;
  },
};

// ============================================================================
// 1. STAFF ATTENDANCE SERVICE (Punch In/Out, Selfie, GPS, Late Tracking)
// ============================================================================

export interface StaffAttendanceRecord {
  id?: string;
  staffId: string;
  staffName: string;
  branch: string;
  date: string; // YYYY-MM-DD
  punchInTime?: string;
  punchInLocation?: string;
  punchInPhoto?: string;
  punchInCoords?: { lat: number; lng: number };
  punchOutTime?: string;
  punchOutLocation?: string;
  punchOutPhoto?: string;
  punchOutCoords?: { lat: number; lng: number };
  workingHours?: string;
  status: "Present" | "Late" | "Half Day" | "Absent";
  lateMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}

declare global {
  var __sphStaffAttendanceStore: StaffAttendanceRecord[] | undefined;
  var __sphStaffLeavesStore: StaffLeaveRecord[] | undefined;
  var __sphStaffDailyWorksStore: StaffDailyWorkRecord[] | undefined;
  var __sphPayCutsStore: MiscellaneousPayCutRecord[] | undefined;
  var __sphLatePenaltyConfig: LatePenaltyRuleConfig | undefined;
}

function getStaffAttendanceCachePath(): string {
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  return path.join(rootCache, "staff_attendance_store.json");
}

function loadStaffAttendanceFromDisk(): StaffAttendanceRecord[] {
  try {
    const file = getStaffAttendanceCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Failed reading staff attendance cache:", e);
  }
  return [];
}

function saveStaffAttendanceToDisk(data: StaffAttendanceRecord[]): void {
  try {
    const file = getStaffAttendanceCachePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed writing staff attendance cache:", e);
  }
}

function getStaffAttendanceStore(): StaffAttendanceRecord[] {
  if (!global.__sphStaffAttendanceStore) {
    global.__sphStaffAttendanceStore = loadStaffAttendanceFromDisk();
  }
  return global.__sphStaffAttendanceStore;
}

export const staffAttendanceService = {
  async getAllRecords(branch?: string, date?: string): Promise<StaffAttendanceRecord[]> {
    const store = getStaffAttendanceStore();
    return store.filter((r) => {
      const matchBranch = !branch || branch === "All Branches" || r.branch.toLowerCase().includes(branch.toLowerCase());
      const matchDate = !date || r.date === date;
      return matchBranch && matchDate;
    });
  },

  async getTodayRecord(staffId: string, dateStr?: string): Promise<StaffAttendanceRecord | null> {
    const today = dateStr || new Date().toISOString().split("T")[0];
    const store = getStaffAttendanceStore();
    return store.find((r) => r.staffId === staffId && r.date === today) || null;
  },

  async recordPunch(payload: {
    staffId: string;
    staffName: string;
    branch: string;
    type: "in" | "out";
    photo: string;
    location: string;
    coords?: { lat: number; lng: number } | null;
    timestamp?: string;
  }): Promise<StaffAttendanceRecord> {
    const store = getStaffAttendanceStore();
    const today = new Date().toISOString().split("T")[0];
    const nowTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    let existing = store.find((r) => r.staffId === payload.staffId && r.date === today);

    // Calculate late status on Punch In (Default shift 09:00 AM, 15m grace)
    if (payload.type === "in") {
      const now = new Date();
      const shiftStart = new Date();
      shiftStart.setHours(9, 0, 0, 0); // 09:00 AM
      const diffMinutes = Math.max(0, Math.floor((now.getTime() - shiftStart.getTime()) / (1000 * 60)));
      const isLate = diffMinutes > 15;

      if (!existing) {
        existing = {
          id: `ATT-${Date.now()}`,
          staffId: payload.staffId,
          staffName: payload.staffName,
          branch: payload.branch,
          date: today,
          punchInTime: nowTime,
          punchInLocation: payload.location,
          punchInPhoto: payload.photo,
          punchInCoords: payload.coords || undefined,
          status: isLate ? "Late" : "Present",
          lateMinutes: diffMinutes,
          createdAt: new Date().toISOString(),
        };
        store.unshift(existing);
      } else {
        existing.punchInTime = nowTime;
        existing.punchInLocation = payload.location;
        existing.punchInPhoto = payload.photo;
        existing.punchInCoords = payload.coords || undefined;
        existing.status = isLate ? "Late" : "Present";
        existing.lateMinutes = diffMinutes;
        existing.updatedAt = new Date().toISOString();
      }
    } else {
      // Punch Out
      if (!existing) {
        existing = {
          id: `ATT-${Date.now()}`,
          staffId: payload.staffId,
          staffName: payload.staffName,
          branch: payload.branch,
          date: today,
          punchOutTime: nowTime,
          punchOutLocation: payload.location,
          punchOutPhoto: payload.photo,
          punchOutCoords: payload.coords || undefined,
          status: "Present",
          createdAt: new Date().toISOString(),
        };
        store.unshift(existing);
      } else {
        existing.punchOutTime = nowTime;
        existing.punchOutLocation = payload.location;
        existing.punchOutPhoto = payload.photo;
        existing.punchOutCoords = payload.coords || undefined;
        existing.updatedAt = new Date().toISOString();

        // Calculate working hours if punch-in exists
        if (existing.punchInTime) {
          try {
            const inDate = new Date(`${today} ${existing.punchInTime}`);
            const outDate = new Date(`${today} ${nowTime}`);
            const diffMs = Math.max(0, outDate.getTime() - inDate.getTime());
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            existing.workingHours = `${hours} hrs ${mins} mins`;
          } catch {
            existing.workingHours = "8 hrs";
          }
        }
      }
    }

    global.__sphStaffAttendanceStore = store;
    saveStaffAttendanceToDisk(store);
    return existing;
  },
};

// ============================================================================
// 2. STAFF LEAVE SERVICE
// ============================================================================

export interface StaffLeaveRecord {
  id?: string;
  staffId: string;
  staffName: string;
  branch: string;
  leaveType: "Casual" | "Sick" | "Privilege" | "Emergency" | "Half Day";
  fromDate: string;
  toDate: string;
  joiningDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

function getStaffLeavesCachePath(): string {
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  return path.join(rootCache, "staff_leaves_store.json");
}

function loadStaffLeavesFromDisk(): StaffLeaveRecord[] {
  try {
    const file = getStaffLeavesCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Failed reading staff leaves cache:", e);
  }
  return [];
}

function saveStaffLeavesToDisk(data: StaffLeaveRecord[]): void {
  try {
    const file = getStaffLeavesCachePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed writing staff leaves cache:", e);
  }
}

function getStaffLeavesStore(): StaffLeaveRecord[] {
  if (!global.__sphStaffLeavesStore) {
    global.__sphStaffLeavesStore = loadStaffLeavesFromDisk();
  }
  return global.__sphStaffLeavesStore;
}

export const staffLeaveService = {
  async getAllLeaves(staffId?: string): Promise<StaffLeaveRecord[]> {
    const store = getStaffLeavesStore();
    if (staffId) {
      return store.filter((l) => l.staffId === staffId);
    }
    return store;
  },

  async applyLeave(payload: Omit<StaffLeaveRecord, "id">): Promise<StaffLeaveRecord> {
    const store = getStaffLeavesStore();
    const newRecord: StaffLeaveRecord = {
      ...payload,
      id: `LV-${Date.now()}`,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    store.unshift(newRecord);
    global.__sphStaffLeavesStore = store;
    saveStaffLeavesToDisk(store);
    return newRecord;
  },

  async approveLeave(id: string, reviewedBy: string = "Admin"): Promise<StaffLeaveRecord | null> {
    const store = getStaffLeavesStore();
    const item = store.find((l) => l.id === id);
    if (!item) return null;
    item.status = "Approved";
    item.reviewedBy = reviewedBy;
    item.updatedAt = new Date().toISOString();
    global.__sphStaffLeavesStore = store;
    saveStaffLeavesToDisk(store);
    return item;
  },

  async rejectLeave(id: string, rejectionReason: string, reviewedBy: string = "Admin"): Promise<StaffLeaveRecord | null> {
    const store = getStaffLeavesStore();
    const item = store.find((l) => l.id === id);
    if (!item) return null;
    item.status = "Rejected";
    item.rejectionReason = rejectionReason;
    item.reviewedBy = reviewedBy;
    item.updatedAt = new Date().toISOString();
    global.__sphStaffLeavesStore = store;
    saveStaffLeavesToDisk(store);
    return item;
  },
};

// ============================================================================
// 3. STAFF DAILY WORK SERVICE
// ============================================================================

export interface StaffDailyWorkRecord {
  id?: string;
  staffId: string;
  staffName: string;
  branch: string;
  date: string;
  totalCalls: number;
  followUps: number;
  contacts: number;
  gReviews: number;
  videoReviews: number;
  workNotes: string;
  submittedAt: string;
}

function getStaffDailyWorksCachePath(): string {
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  return path.join(rootCache, "staff_daily_works_store.json");
}

function loadStaffDailyWorksFromDisk(): StaffDailyWorkRecord[] {
  try {
    const file = getStaffDailyWorksCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Failed reading staff daily works cache:", e);
  }
  return [];
}

function saveStaffDailyWorksToDisk(data: StaffDailyWorkRecord[]): void {
  try {
    const file = getStaffDailyWorksCachePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed writing staff daily works cache:", e);
  }
}

function getStaffDailyWorksStore(): StaffDailyWorkRecord[] {
  if (!global.__sphStaffDailyWorksStore) {
    global.__sphStaffDailyWorksStore = loadStaffDailyWorksFromDisk();
  }
  return global.__sphStaffDailyWorksStore;
}

export const staffDailyWorkService = {
  async getAllReports(staffId?: string, date?: string): Promise<StaffDailyWorkRecord[]> {
    const store = getStaffDailyWorksStore();
    return store.filter((r) => {
      const matchStaff = !staffId || r.staffId === staffId;
      const matchDate = !date || r.date === date;
      return matchStaff && matchDate;
    });
  },

  async getTodayReport(staffId: string, dateStr?: string): Promise<StaffDailyWorkRecord | null> {
    const today = dateStr || new Date().toISOString().split("T")[0];
    const store = getStaffDailyWorksStore();
    return store.find((r) => r.staffId === staffId && r.date === today) || null;
  },

  async submitReport(payload: Omit<StaffDailyWorkRecord, "id">): Promise<StaffDailyWorkRecord> {
    const store = getStaffDailyWorksStore();
    const existing = store.find((r) => r.staffId === payload.staffId && r.date === payload.date);
    if (existing) {
      Object.assign(existing, payload);
      saveStaffDailyWorksToDisk(store);
      return existing;
    }
    const newRecord: StaffDailyWorkRecord = {
      ...payload,
      id: `DW-${Date.now()}`,
    };
    store.unshift(newRecord);
    global.__sphStaffDailyWorksStore = store;
    saveStaffDailyWorksToDisk(store);
    return newRecord;
  },
};

// ============================================================================
// 4. MISCELLANEOUS PAY CUTS & DISCIPLINARY DEDUCTIONS SERVICE
// ============================================================================

export interface MiscellaneousPayCutRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  amount: number;
  reason: string;
  month: string; // e.g. "Nov 2026"
  date: string;
  image?: string;
  issuedBy: string; // "HR" or "Admin"
  createdAt: string;
}

function getPayCutsCachePath(): string {
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  return path.join(rootCache, "staff_pay_cuts_store.json");
}

function loadPayCutsFromDisk(): MiscellaneousPayCutRecord[] {
  try {
    const file = getPayCutsCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Failed reading pay cuts cache:", e);
  }
  return [];
}

function savePayCutsToDisk(data: MiscellaneousPayCutRecord[]): void {
  try {
    const file = getPayCutsCachePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed writing pay cuts cache:", e);
  }
}

function getPayCutsStore(): MiscellaneousPayCutRecord[] {
  if (!global.__sphPayCutsStore) {
    global.__sphPayCutsStore = loadPayCutsFromDisk();
  }
  return global.__sphPayCutsStore;
}

export const payCutService = {
  async getAllPayCuts(employeeId?: string, month?: string): Promise<MiscellaneousPayCutRecord[]> {
    const store = getPayCutsStore();
    return store.filter((p) => {
      const matchEmp = !employeeId || p.employeeId === employeeId;
      const matchMonth = !month || p.month === month;
      return matchEmp && matchMonth;
    });
  },

  async createPayCut(payload: Omit<MiscellaneousPayCutRecord, "id" | "createdAt">): Promise<MiscellaneousPayCutRecord> {
    const store = getPayCutsStore();
    const newCut: MiscellaneousPayCutRecord = {
      ...payload,
      id: `PC-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    store.unshift(newCut);
    global.__sphPayCutsStore = store;
    savePayCutsToDisk(store);
    return newCut;
  },

  async deletePayCut(id: string): Promise<boolean> {
    const store = getPayCutsStore();
    const filtered = store.filter((p) => p.id !== id);
    if (filtered.length === store.length) return false;
    global.__sphPayCutsStore = filtered;
    savePayCutsToDisk(filtered);
    return true;
  },
};

// ============================================================================
// 5. LATE PENALTY & PAYROLL CONFIGURATION SERVICE
// ============================================================================

export interface LatePenaltyRuleConfig {
  shiftStartTime: string; // e.g. "09:00 AM"
  graceMinutes: number; // e.g. 15
  lateThresholdDays: number; // default: 3 days late
  lateThresholdMinutes: number; // default: 15 minutes total
  penaltyAmount: number; // default: 500
}

const DEFAULT_LATE_CONFIG: LatePenaltyRuleConfig = {
  shiftStartTime: "09:00 AM",
  graceMinutes: 15,
  lateThresholdDays: 3,
  lateThresholdMinutes: 15,
  penaltyAmount: 500,
};

function getLateConfigCachePath(): string {
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  return path.join(rootCache, "late_penalty_config.json");
}

function loadLateConfigFromDisk(): LatePenaltyRuleConfig {
  try {
    const file = getLateConfigCachePath();
    if (fs.existsSync(file)) {
      return { ...DEFAULT_LATE_CONFIG, ...JSON.parse(fs.readFileSync(file, "utf-8")) };
    }
  } catch (e) {
    console.warn("Failed reading late penalty config:", e);
  }
  return { ...DEFAULT_LATE_CONFIG };
}

function saveLateConfigToDisk(cfg: LatePenaltyRuleConfig): void {
  try {
    const file = getLateConfigCachePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed writing late penalty config:", e);
  }
}

export const payrollSettingsService = {
  async getLatePenaltyConfig(): Promise<LatePenaltyRuleConfig> {
    if (!global.__sphLatePenaltyConfig) {
      global.__sphLatePenaltyConfig = loadLateConfigFromDisk();
    }
    return global.__sphLatePenaltyConfig;
  },

  async updateLatePenaltyConfig(updates: Partial<LatePenaltyRuleConfig>): Promise<LatePenaltyRuleConfig> {
    const current = await payrollSettingsService.getLatePenaltyConfig();
    const updated = { ...current, ...updates };
    global.__sphLatePenaltyConfig = updated;
    saveLateConfigToDisk(updated);
    return updated;
  },
};









