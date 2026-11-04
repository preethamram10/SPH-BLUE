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

// Shared In-Memory & Cache Store
function getMemoryStore(): BranchRecord[] {
  if (!global.__sphBranchesStore) {
    global.__sphBranchesStore = loadBranchesFromDisk();
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

    return getMemoryStore();
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
  const cacheDir = path.resolve(process.cwd(), "node_modules/.cache");
  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".employees_store.json");
    }
  }
  return path.join(cacheDir, "employees_store.json");
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
      branchName: input.branchName?.trim() || "KPHB",
      branchId: input.branchId,
      salary: Number(input.salary) || 20000,
      shiftType: input.shiftType || "SINGLE_STRICT",
      shiftHours: input.shiftHours || "09:00 AM - 06:00 PM",
      dailyHours: input.dailyHours || "9 hrs/day",
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
  const cacheDir = path.resolve(process.cwd(), "node_modules/.cache");
  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".doctor_schedules_store.json");
    }
  }
  return path.join(cacheDir, "doctor_schedules_store.json");
}

function loadSchedulesFromDisk(): DoctorScheduleRecord[] {
  try {
    const file = getSchedulesCachePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to read doctor schedules cache:", err);
  }
  return [];
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
    const cleanBranch = branchName.toLowerCase().replace(/branch/gi, "").trim();
    const result: { doctorId: string; doctorName: string; phone: string; slots: TimeSlotRange[] }[] = [];

    for (const doc of store) {
      for (const bs of doc.branchSchedules) {
        const docBranch = bs.branchName.toLowerCase().replace(/branch/gi, "").trim();
        if (docBranch === cleanBranch || cleanBranch.includes(docBranch) || docBranch.includes(cleanBranch)) {
          const daySched = bs.days[dayAbbr];
          if (daySched && daySched.isAvailable && daySched.slots && daySched.slots.length > 0) {
            result.push({
              doctorId: doc.doctorId,
              doctorName: doc.doctorName,
              phone: doc.phone,
              slots: daySched.slots,
            });
            break;
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
  const cacheDir = path.resolve(process.cwd(), "node_modules/.cache");
  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".doctor_noshows_store.json");
    }
  }
  return path.join(cacheDir, "doctor_noshows_store.json");
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
    const cleanBranch = branchName.toLowerCase().replace(/branch/gi, "").trim();
    const matchedDoctors: { doctorId: string; doctorName: string; phone: string }[] = [];

    for (const doc of schedules) {
      const worksInBranch = doc.branchSchedules.some((bs) => {
        const b = bs.branchName.toLowerCase().replace(/branch/gi, "").trim();
        return b === cleanBranch || cleanBranch.includes(b) || b.includes(cleanBranch);
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



