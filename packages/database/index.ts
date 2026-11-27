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
  var __sphPatientsPhoneIndex: Map<string, any[]> | undefined;
  // eslint-disable-next-line no-var
  var __sphPatientsRegIdIndex: Map<string, any> | undefined;
  // eslint-disable-next-line no-var
  var __sphAppointmentsStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphApptsPhoneIndex: Map<string, any[]> | undefined;
  // eslint-disable-next-line no-var
  var __sphApptsRegIdIndex: Map<string, any[]> | undefined;
  // eslint-disable-next-line no-var
  var __sphRegistrationSequencesStore: Record<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __sphBranchTargetsStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphCleaningTasksStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphPackageMembersStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphBranchMonthTotalsStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphBranchMonthTotalsLastMtime: number | undefined;
  // eslint-disable-next-line no-var
  var __sphBranchMonthPatientsStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphBranchMonthPatientsLastMtime: number | undefined;
  // eslint-disable-next-line no-var
  var __sphPlanSchedulesStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphPlanSchedulesLastMtime: number | undefined;
  // eslint-disable-next-line no-var
  var __sphBranchPlanMonthsStore: any[] | undefined;
  // eslint-disable-next-line no-var
  var __sphBranchPlanMonthsLastMtime: number | undefined;
  // eslint-disable-next-line no-var
  var __sphApptsLastMtime: number | undefined;
  // eslint-disable-next-line no-var
  var __sphPatientsLastMtime: number | undefined;
  // eslint-disable-next-line no-var
  var __sphPackageMembersLastMtime: number | undefined;
  // eslint-disable-next-line no-var
  var __sphLoginActivityStore: any[] | undefined;
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
    phone: "+91 90301 76176",
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
    phone: "+91 95531 76176",
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
    phone: "+91 98041 76176",
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
    phone: "+91 91321 76176",
    address: "HUDA Layout, Nallagandla",
    city: "Hyderabad",
    timings: "9:00 AM - 8:30 PM",
    photoUrl: "",
    doctorsCount: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

async function cascadeBranchRename(oldName: string, newName: string): Promise<void> {
  if (!oldName || !newName) return;
  const cleanOld = normalizeBranchName(oldName);
  const cleanNew = normalizeBranchName(newName);
  const isChandanagar = cleanOld.includes("chanda") || cleanNew.includes("chanda") || oldName.toLowerCase().includes("chanda");
  const targetNewName = isChandanagar ? "Chandanagar Branch" : newName;

  // 1. Update Branch table via prisma
  try {
    await prisma.branch.updateMany({
      where: {
        OR: [
          { name: oldName },
          { name: { contains: "Chandanagar Nagar", mode: "insensitive" } },
        ],
      },
      data: { name: targetNewName },
    });
  } catch (err) {}

  // 2. Direct database updates via raw SQL for any database tables
  try {
    const rawQueries = [
      `UPDATE "Appointment" SET "branch" = '${targetNewName}' WHERE "branch" ILIKE '%${oldName}%' OR "branch" ILIKE '%Chandanagar Nagar%'`,
      `UPDATE "Employee" SET "branchName" = '${targetNewName}' WHERE "branchName" ILIKE '%${oldName}%' OR "branchName" ILIKE '%Chandanagar Nagar%'`,
      `UPDATE "Patient" SET "branch" = '${targetNewName}' WHERE "branch" ILIKE '%${oldName}%' OR "branch" ILIKE '%Chandanagar Nagar%'`,
      `UPDATE "CleaningTask" SET "branchName" = '${targetNewName}' WHERE "branchName" ILIKE '%${oldName}%' OR "branchName" ILIKE '%Chandanagar Nagar%'`,
      `UPDATE "BranchTarget" SET "branch" = '${targetNewName}' WHERE "branch" ILIKE '%${oldName}%' OR "branch" ILIKE '%Chandanagar Nagar%'`,
      `UPDATE "PackageMember" SET "branch" = '${targetNewName}' WHERE "branch" ILIKE '%${oldName}%' OR "branch" ILIKE '%Chandanagar Nagar%'`,
    ];
    for (const q of rawQueries) {
      await prisma.$executeRawUnsafe(q).catch(() => {});
    }
  } catch (err) {}

  // 1. Appointments Store (in-memory / cache)
  try {
    const appts = getAppointmentsStore();
    let changed = false;
    appts.forEach((a) => {
      const matchOld = a.branch === oldName || (cleanOld && normalizeBranchName(a.branch) === cleanOld);
      const matchNew = cleanNew && normalizeBranchName(a.branch) === cleanNew;
      const matchChandaNagar = isChandanagar && (a.branch || "").toLowerCase().includes("chandanagar nagar");
      if (matchOld || matchNew || matchChandaNagar) {
        if (a.branch !== targetNewName) {
          a.branch = targetNewName;
          changed = true;
        }
      }
    });
    if (changed) {
      global.__sphAppointmentsStore = appts;
      saveAppointmentsToDisk(appts);
    }
  } catch (err) {
    console.warn("Failed cascading branch rename to appointments:", err);
  }

  // 2. Branch Targets Store
  try {
    const targets = getBranchTargetsStore();
    let changed = false;
    targets.forEach((t) => {
      const matchOld = t.branch === oldName || (cleanOld && normalizeBranchName(t.branch) === cleanOld);
      const matchNew = cleanNew && normalizeBranchName(t.branch) === cleanNew;
      const matchChandaNagar = isChandanagar && (t.branch || "").toLowerCase().includes("chandanagar nagar");
      if (matchOld || matchNew || matchChandaNagar) {
        if (t.branch !== targetNewName) {
          t.branch = targetNewName;
          changed = true;
        }
      }
    });
    // Consolidate targets so there are no duplicate (branch + monthYear)
    const targetMap = new Map<string, BranchTargetRecord>();
    targets.forEach((t) => {
      const key = `${normalizeBranchName(t.branch)}_${t.monthYear}`;
      if (!targetMap.has(key)) {
        targetMap.set(key, t);
      } else {
        const prev = targetMap.get(key)!;
        if (t.targetAmount > prev.targetAmount || t.updatedAt > prev.updatedAt) {
          targetMap.set(key, t);
        }
        changed = true;
      }
    });
    const uniqueTargets = Array.from(targetMap.values());
    if (changed || uniqueTargets.length !== targets.length) {
      global.__sphBranchTargetsStore = uniqueTargets;
      saveBranchTargetsToDisk(uniqueTargets);
    }
  } catch (err) {
    console.warn("Failed cascading branch rename to targets:", err);
  }

  // 3. Cleaning Tasks Store
  try {
    const tasks = getCleaningTasksStore();
    let changed = false;
    tasks.forEach((t) => {
      const matchOld = t.branchName === oldName || (cleanOld && normalizeBranchName(t.branchName) === cleanOld);
      const matchNew = cleanNew && normalizeBranchName(t.branchName) === cleanNew;
      const matchChandaNagar = isChandanagar && (t.branchName || "").toLowerCase().includes("chandanagar nagar");
      if (matchOld || matchNew || matchChandaNagar) {
        if (t.branchName !== targetNewName) {
          t.branchName = targetNewName;
          changed = true;
        }
      }
    });
    if (changed) {
      global.__sphCleaningTasksStore = tasks;
      saveCleaningTasksToDisk(tasks);
    }
  } catch (err) {
    console.warn("Failed cascading branch rename to cleaning tasks:", err);
  }

  // 4. Doctor Schedules Store
  try {
    const schedules = getDoctorSchedulesStore();
    let changed = false;
    schedules.forEach((doc) => {
      if (doc.branchSchedules && Array.isArray(doc.branchSchedules)) {
        doc.branchSchedules.forEach((bs) => {
          const matchOld = bs.branchName === oldName || (cleanOld && normalizeBranchName(bs.branchName) === cleanOld);
          const matchNew = cleanNew && normalizeBranchName(bs.branchName) === cleanNew;
          const matchChandaNagar = isChandanagar && (bs.branchName || "").toLowerCase().includes("chandanagar nagar");
          if (matchOld || matchNew || matchChandaNagar) {
            if (bs.branchName !== targetNewName) {
              bs.branchName = targetNewName;
              changed = true;
            }
          }
          const tOld = (bs as any).targetBranch === oldName || (cleanOld && normalizeBranchName((bs as any).targetBranch) === cleanOld);
          const tNew = cleanNew && normalizeBranchName((bs as any).targetBranch) === cleanNew;
          const tChanda = isChandanagar && ((bs as any).targetBranch || "").toLowerCase().includes("chandanagar nagar");
          if (tOld || tNew || tChanda) {
            if ((bs as any).targetBranch !== targetNewName) {
              (bs as any).targetBranch = targetNewName;
              changed = true;
            }
          }
        });
      }
    });
    if (changed) {
      global.__sphDoctorSchedulesStore = schedules;
      saveSchedulesToDisk(schedules);
    }
  } catch (err) {
    console.warn("Failed cascading branch rename to doctor schedules:", err);
  }

  // 5. Employees Store
  try {
    const emps = getEmployeesStore();
    let changed = false;
    emps.forEach((e) => {
      const matchOld = e.branchName === oldName || (cleanOld && normalizeBranchName(e.branchName) === cleanOld);
      const matchNew = cleanNew && normalizeBranchName(e.branchName) === cleanNew;
      const matchChandaNagar = isChandanagar && (e.branchName || "").toLowerCase().includes("chandanagar nagar");
      if (matchOld || matchNew || matchChandaNagar) {
        if (e.branchName !== targetNewName) {
          e.branchName = targetNewName;
          changed = true;
        }
      }
    });
    if (changed) {
      global.__sphEmployeesStore = emps;
      saveEmployeesToDisk(emps);
    }
  } catch (err) {
    console.warn("Failed cascading branch rename to employees:", err);
  }

  // 6. Patients Store
  try {
    const pats = getPatientsStore();
    let changed = false;
    pats.forEach((p) => {
      const matchOld = p.branch === oldName || (cleanOld && normalizeBranchName(p.branch) === cleanOld);
      const matchNew = cleanNew && normalizeBranchName(p.branch) === cleanNew;
      const matchChandaNagar = isChandanagar && (p.branch || "").toLowerCase().includes("chandanagar nagar");
      if (matchOld || matchNew || matchChandaNagar) {
        if (p.branch !== targetNewName) {
          p.branch = targetNewName;
          changed = true;
        }
      }
    });
    if (changed) {
      global.__sphPatientsStore = pats;
      savePatientsToDisk(pats);
    }
  } catch (err) {
    console.warn("Failed cascading branch rename to patients:", err);
  }

  // 7. Package Members Store
  try {
    const pkgMembers = getPackageMembersStore();
    let changed = false;
    pkgMembers.forEach((p) => {
      const matchOld = p.branch === oldName || (cleanOld && normalizeBranchName(p.branch) === cleanOld);
      const matchNew = cleanNew && normalizeBranchName(p.branch) === cleanNew;
      const matchChandaNagar = isChandanagar && (p.branch || "").toLowerCase().includes("chandanagar nagar");
      if (matchOld || matchNew || matchChandaNagar) {
        if (p.branch !== targetNewName) {
          p.branch = targetNewName;
          changed = true;
        }
      }
    });
    if (changed) {
      global.__sphPackageMembersStore = pkgMembers;
      savePackageMembersToDisk(pkgMembers);
    }
  } catch (err) {
    console.warn("Failed cascading branch rename to package members:", err);
  }
}

export function getBranchReceptionPhone(branchName: string = ""): string {
  const lower = (branchName || "").toLowerCase().replace(/branch/gi, "").trim();
  if (lower.includes("nalla") || lower.includes("nlg")) return "+91 91321 76176";
  if (lower.includes("dilshuk") || lower.includes("dilsukh") || lower.includes("dsnr") || lower.includes("dil")) return "+91 98041 76176";
  if (lower.includes("chanda") || lower.includes("cngr") || lower.includes("chn")) return "+91 95531 76176";
  if (lower.includes("kphb") || lower.includes("kpb") || lower.includes("kukatpally")) return "+91 90301 76176";
  return "+91 90301 76176";
}

// Shared In-Memory & Cache Store
function getMemoryStore(): BranchRecord[] {
  if (!global.__sphBranchesStore) {
    const fromDisk = loadBranchesFromDisk();
    const raw = fromDisk.length > 0 ? fromDisk : DEFAULT_BRANCHES_STORE;

    // Deduplicate in-memory store by normalized branch name to prevent duplicate branches
    const dedupedMap = new Map<string, BranchRecord>();
    raw.forEach((b) => {
      const key = normalizeBranchName(b.name);
      const canonicalPhone = getBranchReceptionPhone(b.name);
      const updatedBranch = { ...b, phone: canonicalPhone || b.phone };
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, updatedBranch);
      } else {
        const prev = dedupedMap.get(key)!;
        dedupedMap.set(key, { ...prev, ...updatedBranch, phone: canonicalPhone || updatedBranch.phone });
      }
    });
    global.__sphBranchesStore = Array.from(dedupedMap.values());
  }
  return global.__sphBranchesStore;
}

export const branchService = {
  // Get all active branches (checks Prisma first, falls back to store)
  async getAllBranches(): Promise<BranchRecord[]> {
    let branches: BranchRecord[] = [];
    try {
      const dbBranches = await prisma.branch.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (dbBranches && dbBranches.length > 0) {
        branches = dbBranches.map((b: any) => ({
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

    if (branches.length === 0) {
      branches = getMemoryStore();
      if (branches.length === 0) branches = DEFAULT_BRANCHES_STORE;
    }

    // Deduplicate branches by normalized name (keeps the latest canonical one)
    const seen = new Map<string, BranchRecord>();
    branches.forEach((b) => {
      if (b.name && b.name.toLowerCase().includes("chandanagar nagar")) {
        b.name = "Chandanagar Branch";
      }
      const key = normalizeBranchName(b.name);
      if (!seen.has(key)) {
        seen.set(key, b);
      } else {
        const prev = seen.get(key)!;
        seen.set(key, { ...prev, ...b });
      }
    });

    return Array.from(seen.values());
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
    const store = getMemoryStore();
    const cleanInputName = normalizeBranchName(input.name);

    // If a branch with the same normalized name already exists, update it instead of creating a duplicate!
    const existingIdx = store.findIndex((b) => normalizeBranchName(b.name) === cleanInputName);
    if (existingIdx !== -1) {
      const updated = await this.updateBranch(store[existingIdx].id, input);
      if (updated) return updated;
    }

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

    // Add to top of list
    store.unshift(newRecord);

    // Filter duplicates by normalized name
    const seen = new Map<string, BranchRecord>();
    store.forEach((b) => {
      const key = normalizeBranchName(b.name);
      if (!seen.has(key)) seen.set(key, b);
    });
    const deduped = Array.from(seen.values());

    global.__sphBranchesStore = deduped;
    saveBranchesToDisk(deduped);

    return newRecord;
  },

  // Update an existing branch (saves to Prisma + local store)
  async updateBranch(
    id: string,
    input: Partial<{
      name: string;
      phone: string;
      address: string;
      city?: string;
      timings?: string;
      photoUrl?: string;
      photoName?: string;
      doctorsCount?: number;
      isActive?: boolean;
    }>
  ): Promise<BranchRecord | null> {
    try {
      await prisma.branch.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.phone !== undefined && { phone: input.phone.trim() }),
          ...(input.address !== undefined && { address: input.address.trim() }),
          ...(input.city !== undefined && { city: input.city.trim() }),
          ...(input.timings !== undefined && { timings: input.timings.trim() }),
          ...(input.photoUrl !== undefined && { photoUrl: input.photoUrl }),
          ...(input.photoName !== undefined && { photoName: input.photoName }),
          ...(input.doctorsCount !== undefined && { doctorsCount: input.doctorsCount }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });
    } catch {
      // Prisma offline or not found
    }

    const store = getMemoryStore();
    let idx = store.findIndex((b) => String(b.id) === String(id));
    if (idx === -1 && input.name) {
      idx = store.findIndex((b) => normalizeBranchName(b.name) === normalizeBranchName(input.name || ""));
    }

    if (idx !== -1) {
      const oldBranchName = store[idx].name;
      const newBranchName = input.name !== undefined ? input.name.trim() : oldBranchName;

      store[idx] = {
        ...store[idx],
        ...(input.name !== undefined && { name: newBranchName }),
        ...(input.phone !== undefined && { phone: input.phone.trim() }),
        ...(input.address !== undefined && { address: input.address.trim() }),
        ...(input.city !== undefined && { city: input.city.trim() }),
        ...(input.timings !== undefined && { timings: input.timings.trim() }),
        ...(input.photoUrl !== undefined && { photoUrl: input.photoUrl }),
        ...(input.photoName !== undefined && { photoName: input.photoName }),
        ...(input.doctorsCount !== undefined && { doctorsCount: input.doctorsCount }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        updatedAt: new Date().toISOString(),
      };

      // Deduplicate store: remove any other entries that match this normalized name
      const targetNorm = normalizeBranchName(newBranchName);
      const cleanedStore: BranchRecord[] = [];
      const seenKeys = new Set<string>();

      store.forEach((b, i) => {
        const key = normalizeBranchName(b.name);
        if (i === idx) {
          cleanedStore.push(b);
          seenKeys.add(key);
        } else if (!seenKeys.has(key)) {
          cleanedStore.push(b);
          seenKeys.add(key);
        }
      });

      global.__sphBranchesStore = cleanedStore;
      saveBranchesToDisk(cleanedStore);

      if (oldBranchName && newBranchName) {
        await cascadeBranchRename(oldBranchName, newBranchName);
      }

      return store[idx];
    }
    return null;
  },

  // Cascade rename to all relational stores
  async cascadeBranchRename(oldName: string, newName: string): Promise<void> {
    await cascadeBranchRename(oldName, newName);
  },

  // Synchronize and clean all branches across all cache stores
  async syncAllStoresToCanonicalBranches(): Promise<void> {
    try {
      await cascadeBranchRename("Chandanagar Nagar", "Chandanagar Branch");
      await cascadeBranchRename("Chandanagar Nagar Branch", "Chandanagar Branch");
      const branches = getMemoryStore();
      for (const b of branches) {
        if (b.name && b.name.toLowerCase().includes("chandanagar nagar")) {
          b.name = "Chandanagar Branch";
        }
        await cascadeBranchRename(b.name, b.name);
      }
    } catch (e) {
      console.warn("Failed syncAllStoresToCanonicalBranches:", e);
    }
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
      const found = branches.find((b: any) => normalizePhone(b.phone) === cleanSearch);
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
  branch?: string;
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
  telecallerId?: string;
  targetQuota?: string;
  status?: string;
  campaign?: string;
  qualification?: string;
  specialty?: string;
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
      telecallerId: input.telecallerId?.trim(),
      targetQuota: input.targetQuota || "60 calls/day",
      status: input.status || "Active",
      campaign: input.campaign || "General Patient Follow-Up",
      qualification: input.qualification?.trim(),
      specialty: input.specialty?.trim(),
    };
    store.unshift(newRecord);
    global.__sphEmployeesStore = store;
    saveEmployeesToDisk(store);
    return newRecord;
  },

  async updateEmployee(id: string, updates: Partial<EmployeeRecord>): Promise<EmployeeRecord | null> {
    const store = getEmployeesStore();
    const idx = store.findIndex((e) => String(e.id) === String(id));
    if (idx === -1) return null;

    const oldName = store[idx].name;
    const oldPhone = store[idx].phone;

    const newPhone = updates.phone
      ? updates.phone.trim().startsWith("+91")
        ? updates.phone.trim()
        : `+91 ${updates.phone.trim()}`
      : store[idx].phone;

    const newName = updates.name ? updates.name.trim() : store[idx].name;

    const updated: EmployeeRecord = {
      ...store[idx],
      ...updates,
      name: newName,
      phone: newPhone,
      updatedAt: new Date().toISOString(),
    };

    store[idx] = updated;
    global.__sphEmployeesStore = store;
    saveEmployeesToDisk(store);

    // Synchronize to doctor_schedules_store if this is a DOCTOR
    if (store[idx].category === "DOCTOR" || updates.category === "DOCTOR") {
      try {
        const scheduleStore = getDoctorSchedulesStore();
        const sched = scheduleStore.find(
          (s) => String(s.doctorId) === String(id) || String(s.id) === String(id) || s.doctorName.toLowerCase().trim() === oldName.toLowerCase().trim()
        );
        if (sched) {
          sched.doctorId = String(id);
          sched.doctorName = newName;
          sched.phone = newPhone;
          if (updates.specialty) sched.specialty = updates.specialty;
          sched.updatedAt = new Date().toISOString();
          global.__sphDoctorSchedulesStore = scheduleStore;
          saveSchedulesToDisk(scheduleStore);
        }
      } catch (err) {
        console.warn("Failed to sync doctor schedule on employee update:", err);
      }
    }

    // Synchronize doctor name across active appointments
    if (oldName && newName && oldName !== newName) {
      try {
        const apptStore = getAppointmentsStore();
        let changed = false;
        apptStore.forEach((a) => {
          if (String(a.doctorId) === String(id) || (a.doctorName && a.doctorName.toLowerCase().trim() === oldName.toLowerCase().trim())) {
            a.doctorName = newName;
            a.doctorId = String(id);
            changed = true;
          }
        });
        if (changed) {
          global.__sphAppointmentsStore = apptStore;
          saveAppointmentsToDisk(apptStore);
        }
      } catch (err) {
        console.warn("Failed to sync appointment doctor names on employee update:", err);
      }
    }

    return updated;
  },

  async deleteEmployee(id: string): Promise<boolean> {
    const store = getEmployeesStore();
    const filtered = store.filter((e) => String(e.id) !== String(id));
    global.__sphEmployeesStore = filtered;
    saveEmployeesToDisk(filtered);

    // Also remove from doctor schedules if exists
    try {
      const scheduleStore = getDoctorSchedulesStore();
      const schedFiltered = scheduleStore.filter((s) => String(s.doctorId) !== String(id) && String(s.id) !== String(id));
      if (schedFiltered.length !== scheduleStore.length) {
        global.__sphDoctorSchedulesStore = schedFiltered;
        saveSchedulesToDisk(schedFiltered);
      }
    } catch {}

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
  let clean = (name || "")
    .toLowerCase()
    .replace(/spiritual\s*homeopathy/gi, "")
    .replace(/\bbranch\b/gi, "")
    .replace(/chandanagar\s*nagar/gi, "chandanagar")
    .replace(/chandanagarnagar/gi, "chandanagar")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  if (clean.includes("chanda")) clean = "chandanagar";
  if (clean.includes("nalla") || clean.includes("nlg")) clean = "nallagandla";
  if (clean.includes("dilshuk") || clean.includes("dilsukh") || clean.includes("dsnr")) clean = "dilshuknagar";
  if (clean.includes("kphb") || clean.includes("kpb") || clean.includes("kukatpally")) clean = "kphb";
  return clean;
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
      doctorName: "Dr. Prashant K Vaidya",
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
    const jsonStr =
      Array.isArray(data) && data.length > 500
        ? JSON.stringify(data)
        : JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, jsonStr, "utf-8");
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    try {
      const jsonStr =
        Array.isArray(data) && data.length > 500
          ? JSON.stringify(data)
          : JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, jsonStr, "utf-8");
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

export interface BranchDoctorWithSchedule {
  doctorId: string;
  doctorName: string;
  phone: string;
  scheduledDays: string[];
  scheduleSummary: string;
  days: Record<string, { isAvailable: boolean; slots: string[] }>;
}

export function normalizeDateStr(dt?: string | null): string {
  if (!dt) return "";
  const cleaned = dt.trim().split("T")[0].replace(/\//g, "-");
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    // If corrupted format like 2012-11-2026 (both parts[0] and parts[2] are 4 digits)
    if (parts[0].length === 4 && parts[2].length === 4) {
      const y = parts[2];
      const m = parts[1].padStart(2, "0");
      const d = parts[0].slice(2).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    // If already YYYY-MM-DD (4-digit first part, e.g. 2026-11-12 or 0018-05-21)
    if (parts[0].length === 4) {
      let yr = parseInt(parts[0], 10);
      if (yr < 100) yr = 2000 + yr;
      const m = parts[1].padStart(2, "0");
      const d = parts[2].padStart(2, "0");
      return `${yr}-${m}-${d}`;
    }
    // If DD-MM-YYYY (4-digit last part, e.g. 12-11-2026)
    if (parts[2].length === 4) {
      let yr = parseInt(parts[2], 10);
      if (yr < 100) yr = 2000 + yr;
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      return `${yr}-${m}-${d}`;
    }
    // If 2-digit year at end: DD-MM-YY (e.g. 21-05-18)
    if (parts[0].length <= 2 && parts[2].length <= 2) {
      let yr = 2000 + parseInt(parts[2], 10);
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      return `${yr}-${m}-${d}`;
    }
  }
  return cleaned;
}

export function normalizePatientName(raw?: string | null): string {
  if (!raw) return "";
  let s = String(raw).toLowerCase().trim();
  // Strip salutations and relational prefixes
  s = s.replace(/^(mr|mrs|ms|miss|dr|smt|sri|mast|master)\.?\s+/gi, "");
  s = s.replace(/^(baby\s+of|b\/o|s\/o|d\/o|w\/o|c\/o)\.?\s+/gi, "");
  // Replace symbols/punctuation with spaces and collapse spaces
  s = s.replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

export function isExplicitRegId(reg?: string | null): boolean {
  if (!reg) return false;
  const clean = String(reg).trim().toUpperCase();
  if (clean.length < 3) return false;
  if (["NEW", "N/A", "NA", "PENDING", "NONE", "NULL", "UNDEFINED"].includes(clean)) return false;
  // A 10-digit phone number is not a registration ID
  if (/^\d{10}$/.test(clean)) return false;
  return true;
}

export function matchPatientProfile(
  appt: { registrationId?: string; regId?: string; patientId?: string; phone?: string; phoneNumber?: string; patientName?: string; name?: string },
  patient: { regId?: string; registrationId?: string; patientId?: string; phone?: string; phoneNumber?: string; name?: string; patientName?: string }
): boolean {
  if (!appt || !patient) return false;

  const apptReg = ((appt.registrationId || (appt as any).regId || (appt as any).patientId || "") + "").trim().toUpperCase();
  const patReg = ((patient.regId || patient.registrationId || (patient as any).patientId || "") + "").trim().toUpperCase();

  const hasApptReg = isExplicitRegId(apptReg);
  const hasPatReg = isExplicitRegId(patReg);

  // 1. If BOTH records have valid registration IDs, they MUST match identically:
  if (hasApptReg && hasPatReg) {
    return apptReg === patReg;
  }

  // 2. Otherwise match strictly by 10-digit phone AND exact normalized patient name:
  const apptPhone = normalizePhone(appt.phone || (appt as any).phoneNumber || "");
  const patPhone = normalizePhone(patient.phone || (patient as any).phoneNumber || "");
  if (!apptPhone || !patPhone || apptPhone.length < 10 || patPhone.length < 10) return false;
  if (apptPhone.slice(-10) !== patPhone.slice(-10)) return false;

  const apptName = normalizePatientName(appt.patientName || (appt as any).name || "");
  const patName = normalizePatientName(patient.name || patient.patientName || "");
  if (!apptName || !patName || apptName.length < 2 || patName.length < 2) return false;

  // Exact normalized equality:
  if (apptName === patName) return true;

  // Exact word-token permutation (e.g. "Kumar Rajesh" vs "Rajesh Kumar")
  const apptWords = apptName.split(" ").filter(Boolean);
  const patWords = patName.split(" ").filter(Boolean);
  if (apptWords.length === patWords.length && apptWords.length > 1) {
    const sortedA = [...apptWords].sort().join(" ");
    const sortedB = [...patWords].sort().join(" ");
    if (sortedA === sortedB) return true;
  }

  // Do NOT match partial substrings / .includes(), to prevent family members
  // sharing a surname/phone from colliding into the same package.
  return false;
}

export function matchBranch(targetBranch?: string | null, branchFilter?: string | null): boolean {
  if (!branchFilter || branchFilter === "All Branches" || branchFilter.toLowerCase() === "all") return true;
  const cleanFilter = branchFilter.toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/branch/gi, "").trim();
  const cleanTarget = (targetBranch || "").toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/branch/gi, "").trim();
  if (!cleanFilter || !cleanTarget) return true;
  if (cleanTarget === "all" || cleanFilter === "all") return true;
  const isKpbMatch = (cleanFilter === "kpb" || cleanFilter === "kphb") && (cleanTarget === "kpb" || cleanTarget === "kphb");
  return cleanTarget === cleanFilter || cleanTarget.includes(cleanFilter) || cleanFilter.includes(cleanTarget) || isKpbMatch;
}

export const doctorNoShowService = {
  async getAllNoShows(branch?: string, date?: string): Promise<DoctorNoShowRecord[]> {
    let store = getDoctorNoShowsStore();
    if (branch && branch.toUpperCase() !== "ALL" && branch.toLowerCase() !== "all branches") {
      const cleanBranch = branch.toLowerCase().replace(/branch/gi, "").trim();
      store = store.filter((item) => {
        const itemBranch = item.branch.toLowerCase().replace(/branch/gi, "").trim();
        // If marked for ALL branches, it applies everywhere
        if (itemBranch === "all" || item.branch === "ALL") return true;
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

  async getDoctorsAvailableForBranch(branchName: string): Promise<BranchDoctorWithSchedule[]> {
    const schedules = getDoctorSchedulesStore();
    const cleanTarget = normalizeBranchName(branchName);
    if (!cleanTarget) return [];
    const matchedDoctors: BranchDoctorWithSchedule[] = [];

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (const doc of schedules) {
      const branchSchedule = (doc.branchSchedules || []).find((bs) => {
        const cleanBs = normalizeBranchName(bs.branchName || (bs as any).targetBranch || "");
        if (!cleanBs) return false;
        return (
          cleanBs === cleanTarget ||
          (cleanBs.length >= 4 && cleanTarget.length >= 4 && (cleanBs.startsWith(cleanTarget) || cleanTarget.startsWith(cleanBs)))
        );
      });

      if (branchSchedule) {
        const scheduledDays: string[] = [];
        const daysMap: Record<string, { isAvailable: boolean; slots: string[] }> = {};

        weekDays.forEach((dayAbbr) => {
          const daySched = branchSchedule.days?.[dayAbbr];
          const daySchedAlt = (branchSchedule as any).daySchedules?.[dayAbbr];

          let isAvail = false;
          let slotsDesc: string[] = [];

          if (daySched && daySched.isAvailable === true) {
            isAvail = true;
            if (Array.isArray(daySched.slots) && daySched.slots.length > 0) {
              slotsDesc = daySched.slots.map((s: any) => s.displayText || `${s.startHour || "10"}:${s.startMin || "00"} ${s.startAmPm || "AM"} - ${s.endHour || "01"}:${s.endMin || "00"} ${s.endAmPm || "PM"}`);
            }
          } else if (daySchedAlt && daySchedAlt.status === "Available") {
            isAvail = true;
            if (Array.isArray(daySchedAlt.slots) && daySchedAlt.slots.length > 0) {
              slotsDesc = daySchedAlt.slots.map((s: any) => s.displayText || `${s.startHour || "10"}:${s.startMin || "00"} ${s.startAmPm || "AM"} - ${s.endHour || "01"}:${s.endMin || "00"} ${s.endAmPm || "PM"}`);
            }
          }

          if (isAvail) {
            scheduledDays.push(dayAbbr);
            if (slotsDesc.length === 0) {
              slotsDesc = ["10:00 AM - 01:00 PM", "05:00 PM - 09:00 PM"];
            }
            daysMap[dayAbbr] = { isAvailable: true, slots: slotsDesc };
          }
        });

        // Summary of timings
        const firstActiveDay = scheduledDays[0];
        const sampleSlots = firstActiveDay && daysMap[firstActiveDay]?.slots.length > 0
          ? daysMap[firstActiveDay].slots.join(", ")
          : "10:00 AM - 01:00 PM, 05:00 PM - 09:00 PM";
        const summary = scheduledDays.length > 0
          ? `${scheduledDays.join(", ")} (${sampleSlots})`
          : "Configured for branch";

        matchedDoctors.push({
          doctorId: doc.doctorId,
          doctorName: doc.doctorName,
          phone: doc.phone,
          scheduledDays,
          scheduleSummary: summary,
          days: daysMap,
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
  subject?: string;
  source?: string;
  marketingSource?: string;
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
  activeFollowUpDate?: string;
  activeFollowUpStartDate?: string;
  followUpStartDate?: string;
  completedVisitsCount?: number;
  pendingBalance?: number;
  hasPackage?: boolean;
  activePackageId?: string;
  activePackageName?: string;
}

export interface PackagePaymentRecord {
  id: string;
  amount: number;
  paidAt: string;
  paymentMethod: string;
  invoiceId?: string;
  appointmentId?: string;
  notes?: string;
}

export interface PackageMemberRecord {
  id: string;
  registrationId: string;
  patientName: string;
  phone: string;
  branch: string;
  packageName: string;
  durationMonths: number;
  startDate: string;
  endDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: "ACTIVE" | "COMPLETED" | "EXPIRED";
  payments: PackagePaymentRecord[];
  createdAt: string;
  updatedAt?: string;
}

export type PatientVisitBadge = "New" | "In-Dur" | "Revisit" | "Pkg" | "App";

export interface VisitBadgeInfo {
  badge: PatientVisitBadge;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  allowZeroFee: boolean;
}

/**
 * Resolves follow-up intervals or custom date strings into normalized YYYY-MM-DD.
 * Handles "1 Month", "2 Months", "15 Days", "DD-MM-YYYY", "YYYY-MM-DD", etc.
 */
export function resolveFollowUpToDate(
  followUpStr?: string | null,
  baseDate?: string | null
): string {
  if (!followUpStr || typeof followUpStr !== "string") return "";
  const trimmed = followUpStr.trim();
  if (
    trimmed.length === 0 ||
    trimmed.toLowerCase() === "no follow-up" ||
    trimmed.toLowerCase() === "custom date"
  ) {
    return "";
  }

  // If already a calendar date, normalize it
  const norm = normalizeDateStr(trimmed);
  if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
    return norm;
  }

  // Parse relative interval strings e.g. "1 Month", "2 Months", "15 Days"
  let daysToAdd = 0;
  const lower = trimmed.toLowerCase();
  const numMatch = lower.match(/\d+/);
  const count = numMatch ? parseInt(numMatch[0], 10) : 1;

  if (lower.includes("month")) {
    daysToAdd = count * 30;
  } else if (lower.includes("day")) {
    daysToAdd = count;
  } else if (lower.includes("week")) {
    daysToAdd = count * 7;
  } else if (lower.includes("year")) {
    daysToAdd = count * 365;
  }

  if (daysToAdd > 0) {
    const base = baseDate && normalizeDateStr(baseDate) ? new Date(normalizeDateStr(baseDate)) : new Date();
    const target = new Date(base.getTime() + daysToAdd * 86400000);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, "0");
    const d = String(target.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return norm;
}

export function computePatientVisitBadge(
  completedVisitsCount: number,
  activeFollowUpDate?: string | null,
  options?: {
    hasActivePackage?: boolean;
    packageEndDate?: string | null;
    packageStartDate?: string | null;
    followUpStartDate?: string | null;
    referenceDate?: string | null;
    isReback?: boolean;
    hasPriorVisits?: boolean;
  }
): VisitBadgeInfo {
  const hasPrior =
    (typeof completedVisitsCount === "number" && completedVisitsCount > 0) ||
    options?.hasPriorVisits === true ||
    options?.isReback === true;

  const now = new Date();
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const refDate = options?.referenceDate ? normalizeDateStr(options.referenceDate) : todayYmd;
  const targetDate = refDate || todayYmd;

  // 1. Check if Patient is in Duration (IN-DUR)
  // RULE: Duration begins strictly from the NEXT DAY after prescription/package start date!
  // On the prescription/consultation day itself, the appointment retains "New" or "Revisit".

  // A. Active Package Duration
  if (options?.hasActivePackage) {
    const pkgStart = options.packageStartDate ? normalizeDateStr(options.packageStartDate) : "";
    // STRICT NEXT-DAY RULE: Only in-duration if targetDate is strictly greater than package start date
    // If targetDate <= pkgStart (i.e. Package added today), duration has NOT started yet!
    const isAfterPkgStart = pkgStart ? targetDate > pkgStart : false;

    if (isAfterPkgStart) {
      if (options.packageEndDate) {
        const normPkgEnd = resolveFollowUpToDate(options.packageEndDate, options?.referenceDate);
        if (!normPkgEnd || targetDate <= normPkgEnd) {
          return {
            badge: "In-Dur",
            label: "In-Dur",
            color: "#0284c7",
            bgColor: "#e0f2fe",
            borderColor: "#7dd3fc",
            allowZeroFee: true,
          };
        }
      } else {
        return {
          badge: "In-Dur",
          label: "In-Dur",
          color: "#0284c7",
          bgColor: "#e0f2fe",
          borderColor: "#7dd3fc",
          allowZeroFee: true,
        };
      }
    }
  }

  // B. Follow-up Duration window (e.g. within 1 month, 2 weeks, or specific follow-up date)
  if (activeFollowUpDate && typeof activeFollowUpDate === "string" && activeFollowUpDate.trim().length > 0) {
    const fUpStart = options?.followUpStartDate ? normalizeDateStr(options.followUpStartDate) : "";
    // STRICT NEXT-DAY RULE: Duration begins strictly from tomorrow!
    // If targetDate <= fUpStart (consultation day), today remains "New" or "Revisit".
    const isAfterFUpStart = fUpStart ? targetDate > fUpStart : false;

    if (isAfterFUpStart) {
      const normFollowUp = resolveFollowUpToDate(activeFollowUpDate, options?.referenceDate);
      if (normFollowUp && /^\d{4}-\d{2}-\d{2}$/.test(normFollowUp)) {
        if (targetDate <= normFollowUp) {
          return {
            badge: "In-Dur",
            label: "In-Dur",
            color: "#0284c7",
            bgColor: "#e0f2fe",
            borderColor: "#7dd3fc",
            allowZeroFee: true, // ₹0 consultation fee permitted
          };
        }
      }
    }
  }

  // 2. If patient has prior visits, old records, or flagged as revisit -> REVISIT
  if (hasPrior) {
    return {
      badge: "Revisit",
      label: "Revisit",
      color: "#d97706",
      bgColor: "#fef3c7",
      borderColor: "#fde68a",
      allowZeroFee: false,
    };
  }

  // 3. Otherwise: Brand New patient
  return {
    badge: "New",
    label: "New",
    color: "#16a34a",
    bgColor: "#dcfce7",
    borderColor: "#86efac",
    allowZeroFee: false,
  };
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
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedRole?: "RECEPTION" | "ADMIN";
  deletedReason?: string;
  // Patient File & Clinical Consultation fields
  diagnosisNotes?: string;
  prescriptionText?: string;
  prescriptionImages?: string[];
  sharedMediaLinks?: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  followUpInterval?: string;
  followUpDate?: string;
  isFollowUpBooked?: boolean;
  followUpBookedAppointmentId?: string;
  followUpBookedAt?: string;
  consultationFee?: number;
  dietPlan?: string;
  isSentToReception?: boolean;
  isFeeCollected?: boolean;
  medicineFee?: number;
  dietPlanFee?: number;
  totalAmountDue?: number;
  paymentMethod?: "CASH" | "COUNTER_UPI" | "ONLINE_UPI" | "CARD" | "SPLIT" | "SEND_TO_APP" | string;
  splitDetails?: {
    cash?: number;
    upi?: number;
    card?: number;
    counterUpi?: number;
  };
  medicinesList?: Array<{
    name: string;
    type: string;
    timing: string;
    amount: number;
  }>;
  medicines?: Array<{
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
  discountRespondedAt?: string;
  paidAt?: string;
  otherCharges?: number;
  discount?: number;
  discountReason?: string;
  totalPaid?: number;
  payLaterAmount?: number;
  pendingBalance?: number;
  previousDuePaid?: number;
  invoiceId?: string;
  visitBadge?: PatientVisitBadge;
  visitType?: "NEW" | "REVISIT" | "IN_DURATION";
  isDuration?: boolean;
  isNewPatient?: boolean;
  activeFollowUpDate?: string;
  activeFollowUpStartDate?: string;
  followUpStartDate?: string;
  hasPackage?: boolean;
  packageId?: string;
  packageName?: string;
  packageTotalAmount?: number;
  packagePaidAmount?: number;
  packagePendingAmount?: number;
  packageDurationMonths?: number;
  packageEndDate?: string;
  bookedByTelecallerId?: string;
  bookedByTelecallerName?: string;
  isHistorical?: boolean;
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
      if (Array.isArray(parsed)) {
        let modified = false;
        parsed.forEach((p: any) => {
          if (p.createdAt && typeof p.createdAt === "string" && p.createdAt.startsWith("00")) {
            p.createdAt = p.createdAt.replace(/^00(\d\d)/, "20$1");
            modified = true;
          }
        });
        if (modified) {
          safeAtomicWrite(file, parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load patients from cache:", err);
  }
  return [];
}

function rebuildPatientIndices(store?: PatientRecord[]): void {
  const data = store || (global.__sphPatientsStore ? global.__sphPatientsStore : loadPatientsFromDisk());
  const phoneMap = new Map<string, PatientRecord[]>();
  const regIdMap = new Map<string, PatientRecord>();

  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    if (p.isDeleted) continue;

    const cleanReg = (p.regId || "").trim().toUpperCase();
    if (cleanReg) {
      regIdMap.set(cleanReg, p);
    }

    const digits = normalizePhone(p.phone || "");
    if (digits && digits.length >= 10) {
      const last10 = digits.slice(-10);
      let list = phoneMap.get(last10);
      if (!list) {
        list = [];
        phoneMap.set(last10, list);
      }
      list.push(p);
    }
  }

  global.__sphPatientsPhoneIndex = phoneMap;
  global.__sphPatientsRegIdIndex = regIdMap;
}

function getPatientsPhoneIndex(): Map<string, PatientRecord[]> {
  if (!global.__sphPatientsPhoneIndex) {
    rebuildPatientIndices();
  }
  return global.__sphPatientsPhoneIndex!;
}

function getPatientsRegIdIndex(): Map<string, PatientRecord> {
  if (!global.__sphPatientsRegIdIndex) {
    rebuildPatientIndices();
  }
  return global.__sphPatientsRegIdIndex!;
}

function savePatientsToDisk(data: PatientRecord[]): void {
  const file = getPatientsCachePath();
  safeAtomicWrite(file, data);
  try {
    if (fs.existsSync(file)) {
      global.__sphPatientsLastMtime = fs.statSync(file).mtimeMs;
    }
  } catch {}
  rebuildPatientIndices(data);
}

function getPatientsStore(): PatientRecord[] {
  const file = getPatientsCachePath();
  let mtime = 0;
  try {
    if (fs.existsSync(file)) {
      mtime = fs.statSync(file).mtimeMs;
    }
  } catch {}

  if (
    !global.__sphPatientsStore ||
    !global.__sphPatientsLastMtime ||
    (mtime > 0 && mtime > global.__sphPatientsLastMtime)
  ) {
    global.__sphPatientsStore = loadPatientsFromDisk();
    global.__sphPatientsLastMtime = mtime;
    rebuildPatientIndices(global.__sphPatientsStore);
  } else if (!global.__sphPatientsPhoneIndex || !global.__sphPatientsRegIdIndex) {
    rebuildPatientIndices(global.__sphPatientsStore);
  }
  return global.__sphPatientsStore;
}

export const patientService = {
  async getAllPatients(branch?: string): Promise<PatientRecord[]> {
    const store = getPatientsStore();
    const active = store.filter((p) => !p.isDeleted);
    if (!branch || branch === "All Branches" || branch.toLowerCase() === "all") return active;
    return active.filter((p) => matchBranch(p.branch, branch));
  },

  async getByRegId(regId: string): Promise<PatientRecord | null> {
    const clean = regId.trim().toUpperCase();
    if (!clean) return null;
    const regIndex = getPatientsRegIdIndex();
    const found = regIndex.get(clean);
    if (found && !found.isDeleted) return found;
    const store = getPatientsStore();
    return store.find((p) => p.regId.trim().toUpperCase() === clean && !p.isDeleted) || null;
  },

  async searchPatients(query: string, branch?: string, limit = 50): Promise<PatientRecord[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const cleanDigits = q.replace(/\D/g, "");
    const cleanReg = q.toUpperCase();

    // 1. Exact or 10-digit phone lookup -> instant O(1) hash map hit
    if (cleanDigits.length >= 10) {
      const phoneIndex = getPatientsPhoneIndex();
      const exactMatches = phoneIndex.get(cleanDigits.slice(-10));
      if (exactMatches && exactMatches.length > 0) {
        const activeMatches = exactMatches.filter((p) => !p.isDeleted);
        if (!branch || branch === "All Branches" || branch.toLowerCase() === "all") return activeMatches;
        return activeMatches.filter((p) => matchBranch(p.branch, branch));
      }
    }

    // 2. Exact RegId lookup -> instant O(1) hit
    const regIndex = getPatientsRegIdIndex();
    const exactReg = regIndex.get(cleanReg);
    if (exactReg && !exactReg.isDeleted) {
      return [exactReg];
    }

    // 3. Fast search across active patients (capped by limit to prevent huge payloads)
    let list = await this.getAllPatients(branch);
    const results: PatientRecord[] = [];
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (
        p.phone.includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.regId.toLowerCase().includes(q)
      ) {
        results.push(p);
        if (limit > 0 && results.length >= limit) break;
      }
    }
    return results;
  },

  /**
   * Returns ALL profiles (active + soft-deleted) sharing this mobile number
   */
  async getAllProfilesByPhone(phone: string): Promise<Array<PatientRecord & { appointmentCount: number; lastVisit?: string }>> {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) return [];
    const last10 = cleanPhone.slice(-10);

    const store = getPatientsStore();
    const appts = getAppointmentsStore();
    const matchedPatients = store.filter((p) => normalizePhone(p.phone || "").slice(-10) === last10);

    const resultsMap = new Map<string, PatientRecord & { appointmentCount: number; lastVisit?: string }>();

    for (const patient of matchedPatients) {
      const reg = (patient.regId || "").trim().toUpperCase();
      const pAppointments = appts.filter(
        (a) =>
          (a.registrationId || "").trim().toUpperCase() === reg ||
          (normalizePhone(a.phone || "").slice(-10) === last10 &&
            normalizePatientName(a.patientName || "") === normalizePatientName(patient.name || ""))
      );
      const lastAppt = pAppointments[0];
      resultsMap.set(reg || patient.id, {
        ...patient,
        appointmentCount: pAppointments.length,
        lastVisit: lastAppt ? `${lastAppt.appointmentDate} (${lastAppt.doctorName})` : undefined,
      });
    }

    // Also include any distinct registrationIds found in appointments for this phone that may not be in patients_store
    for (const a of appts) {
      if (normalizePhone(a.phone || "").slice(-10) !== last10) continue;
      const reg = (a.registrationId || "").trim().toUpperCase();
      if (!reg || resultsMap.has(reg)) continue;
      const pAppointments = appts.filter((x) => (x.registrationId || "").trim().toUpperCase() === reg);
      resultsMap.set(reg, {
        id: a.id,
        regId: reg,
        name: a.patientName || "Patient",
        phone: a.phone || last10,
        branch: a.branch || "Kphb Branch",
        diseases: a.diseases || "",
        isDeleted: !!a.isDeleted,
        deletedAt: a.deletedAt,
        createdAt: a.createdAt || new Date().toISOString(),
        appointmentCount: pAppointments.length,
        lastVisit: `${a.appointmentDate} (${a.doctorName})`,
      });
    }

    return Array.from(resultsMap.values());
  },

  /**
   * Returns all active profiles sharing this mobile number
   */
  async getProfilesByPhone(phone: string): Promise<Array<PatientRecord & { appointmentCount: number; lastVisit?: string }>> {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) return [];
    const last10 = cleanPhone.slice(-10);
    const phoneIndex = getPatientsPhoneIndex();
    const active = (phoneIndex.get(last10) || []).filter((p) => !p.isDeleted);
    const apptRegIndex = getAppointmentsRegIdIndex();

    return active.map((patient) => {
      const pAppointments = (apptRegIndex.get(patient.regId.toUpperCase()) || []).filter((a) => !a.isDeleted);
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
    const cleanReg = data.regId ? data.regId.trim().toUpperCase() : "";
    const cleanPhone = normalizePhone(data.phone);
    const hasExplicitReg = isExplicitRegId(cleanReg);
    const normName = normalizePatientName(data.name);

    const existingIdx = store.findIndex((p) => {
      if (hasExplicitReg && isExplicitRegId(p.regId)) {
        return p.regId.trim().toUpperCase() === cleanReg;
      }
      if (cleanPhone && cleanPhone.length >= 10 && normName) {
        return normalizePhone(p.phone).slice(-10) === cleanPhone.slice(-10) && normalizePatientName(p.name) === normName;
      }
      return false;
    });

    if (existingIdx >= 0) {
      const updated: PatientRecord = {
        ...store[existingIdx],
        ...data,
        source: data.source || data.marketingSource || store[existingIdx].source || store[existingIdx].marketingSource || "Walk-in",
        marketingSource: data.marketingSource || data.source || store[existingIdx].marketingSource || store[existingIdx].source || "Walk-in",
        subject: data.subject || data.diseases || store[existingIdx].subject || store[existingIdx].diseases || "",
        activeFollowUpDate: data.activeFollowUpDate !== undefined ? data.activeFollowUpDate : store[existingIdx].activeFollowUpDate,
        completedVisitsCount: data.completedVisitsCount !== undefined ? data.completedVisitsCount : store[existingIdx].completedVisitsCount,
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
      diseases: data.diseases || data.subject || "",
      subject: data.subject || data.diseases || "",
      source: data.source || data.marketingSource || "Walk-in",
      marketingSource: data.marketingSource || data.source || "Walk-in",
      branch: data.branch,
      isDeleted: false,
      createdAt: data.createdAt || new Date().toISOString(),
      activeFollowUpDate: data.activeFollowUpDate || undefined,
      completedVisitsCount: data.completedVisitsCount !== undefined ? data.completedVisitsCount : 0,
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

    const oldName = store[idx].name;
    const patientPhone = store[idx].phone;

    store[idx].name = trimmedName;
    store[idx].updatedAt = new Date().toISOString();
    global.__sphPatientsStore = store;
    savePatientsToDisk(store);

    // 1. Update in appointments store across all appointments
    try {
      const appts = getAppointmentsStore();
      let apptUpdated = false;
      appts.forEach((a) => {
        const matchReg = (a.registrationId || "").trim().toUpperCase() === cleanReg;
        const matchPhone = patientPhone && a.phone === patientPhone && a.patientName === oldName;
        if (matchReg || matchPhone) {
          a.patientName = trimmedName;
          apptUpdated = true;
        }
      });
      if (apptUpdated) {
        global.__sphAppointmentsStore = appts;
        saveAppointmentsToDisk(appts);
      }
    } catch (_) {}

    // 2. Update in pay later store
    try {
      const payLaterList = getPayLaterStore();
      let plUpdated = false;
      payLaterList.forEach((pl) => {
        const matchReg = (pl.registrationId || pl.patientId || "").trim().toUpperCase() === cleanReg;
        const matchPhone = patientPhone && pl.phone === patientPhone && pl.patientName === oldName;
        if (matchReg || matchPhone) {
          pl.patientName = trimmedName;
          plUpdated = true;
        }
      });
      if (plUpdated) {
        global.__sphPayLaterStore = payLaterList;
        savePayLaterToDisk(payLaterList);
      }
    } catch (_) {}

    // 3. Update in medicine requests store
    try {
      const medReqs = getMedicineRequestsStore();
      let medUpdated = false;
      medReqs.forEach((mr) => {
        const matchPhone = patientPhone && mr.phone === patientPhone && mr.patientName === oldName;
        if (matchPhone) {
          mr.patientName = trimmedName;
          medUpdated = true;
        }
      });
      if (medUpdated) {
        global.__sphMedicineRequestsStore = medReqs;
        saveMedicineRequestsToDisk(medReqs);
      }
    } catch (_) {}

    // 4. Update in package members store
    try {
      const pkgList = getPackageMembersStore();
      let pkgUpdated = false;
      pkgList.forEach((pm) => {
        const matchReg = (pm.registrationId || "").trim().toUpperCase() === cleanReg;
        const matchPhone = patientPhone && pm.phone === patientPhone && pm.patientName === oldName;
        if (matchReg || matchPhone) {
          pm.patientName = trimmedName;
          pkgUpdated = true;
        }
      });
      if (pkgUpdated) {
        global.__sphPackageMembersStore = pkgList;
        savePackageMembersToDisk(pkgList);
      }
    } catch (_) {}

    // 5. Update PostgreSQL relational tables (Prisma & raw SQL)
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Appointment" SET "patientName" = '${trimmedName}' WHERE "registrationId" = '${cleanReg}' OR "patientName" = '${oldName}';`
      ).catch(() => {});
      await prisma.$executeRawUnsafe(
        `UPDATE "PatientProfile" SET "name" = '${trimmedName}' WHERE "mrn" = '${cleanReg}' OR "name" = '${oldName}';`
      ).catch(() => {});
      await prisma.$executeRawUnsafe(
        `UPDATE "Patient" SET "name" = '${trimmedName}' WHERE "registrationId" = '${cleanReg}' OR "name" = '${oldName}';`
      ).catch(() => {});
      await prisma.$executeRawUnsafe(
        `UPDATE "Invoice" SET "patientName" = '${trimmedName}' WHERE "patientName" = '${oldName}';`
      ).catch(() => {});
    } catch (_) {}

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
   * Permanently purges a complete patient profile from all stores and PostgreSQL DB
   */
  async permanentlyDeletePatientProfile(regId: string): Promise<boolean> {
    const cleanReg = regId.trim().toUpperCase();
    if (!cleanReg) return false;
    let deletedAny = false;

    // 1. Remove from patients_store
    let store = getPatientsStore();
    const initialLen = store.length;
    store = store.filter((p) => (p.regId || "").trim().toUpperCase() !== cleanReg);
    if (store.length !== initialLen) {
      global.__sphPatientsStore = store;
      savePatientsToDisk(store);
      deletedAny = true;
    }

    // 2. Remove associated appointments
    try {
      let appts = getAppointmentsStore();
      const initialApptLen = appts.length;
      appts = appts.filter((a) => (a.registrationId || "").trim().toUpperCase() !== cleanReg);
      if (appts.length !== initialApptLen) {
        global.__sphAppointmentsStore = appts;
        saveAppointmentsToDisk(appts);
        deletedAny = true;
      }
    } catch (_) {}

    // 3. Remove associated package members
    try {
      let pkgs = getPackageMembersStore();
      const initialPkgLen = pkgs.length;
      pkgs = pkgs.filter((pm) => (pm.registrationId || "").trim().toUpperCase() !== cleanReg);
      if (pkgs.length !== initialPkgLen) {
        global.__sphPackageMembersStore = pkgs;
        savePackageMembersToDisk(pkgs);
        deletedAny = true;
      }
    } catch (_) {}

    // 4. Remove associated pay later records
    try {
      let payLater = getPayLaterStore();
      const initialPlLen = payLater.length;
      payLater = payLater.filter(
        (pl) => (pl.registrationId || pl.patientId || "").trim().toUpperCase() !== cleanReg
      );
      if (payLater.length !== initialPlLen) {
        global.__sphPayLaterStore = payLater;
        savePayLaterToDisk(payLater);
        deletedAny = true;
      }
    } catch (_) {}

    // 5. Remove from PostgreSQL via Prisma
    try {
      const dbProfiles = await prisma.patientProfile.findMany({
        where: { mrn: { equals: cleanReg, mode: "insensitive" } },
        select: { id: true },
      });
      if (dbProfiles.length > 0) {
        const ids = dbProfiles.map((p) => p.id);
        await prisma.consultation.deleteMany({ where: { patientId: { in: ids } } }).catch(() => {});
        await prisma.invoice.deleteMany({ where: { patientId: { in: ids } } }).catch(() => {});
        await prisma.appointment.deleteMany({ where: { patientId: { in: ids } } }).catch(() => {});
        await prisma.patientProfile.deleteMany({ where: { id: { in: ids } } });
        deletedAny = true;
      }
    } catch (_) {}

    return deletedAny;
  },

  /**
   * Permanently deletes ALL profiles created on a mobile number from all stores and DB
   */
  async permanentlyDeleteProfilesByPhone(phone: string): Promise<{ deletedCount: number; deletedRegIds: string[] }> {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return { deletedCount: 0, deletedRegIds: [] };
    }
    const last10 = cleanPhone.slice(-10);

    const profiles = await this.getAllProfilesByPhone(last10);
    const regIds = Array.from(
      new Set(profiles.map((p) => (p.regId || "").trim().toUpperCase()).filter(Boolean))
    );

    let deletedCount = 0;
    for (const regId of regIds) {
      const ok = await this.permanentlyDeletePatientProfile(regId);
      if (ok) deletedCount++;
    }

    // Also remove any remaining phone-matched patients without regId in patients_store
    let store = getPatientsStore();
    const beforeStoreLen = store.length;
    store = store.filter((p) => normalizePhone(p.phone || "").slice(-10) !== last10);
    if (store.length !== beforeStoreLen) {
      global.__sphPatientsStore = store;
      savePatientsToDisk(store);
      deletedCount += beforeStoreLen - store.length;
    }

    // Also clean up any PostgreSQL PatientProfile matching phone
    try {
      const dbProfiles = await prisma.patientProfile.findMany({
        where: { phone: { endsWith: last10 } },
        select: { id: true },
      });
      if (dbProfiles.length > 0) {
        const ids = dbProfiles.map((p) => p.id);
        await prisma.consultation.deleteMany({ where: { patientId: { in: ids } } }).catch(() => {});
        await prisma.invoice.deleteMany({ where: { patientId: { in: ids } } }).catch(() => {});
        await prisma.appointment.deleteMany({ where: { patientId: { in: ids } } }).catch(() => {});
        await prisma.patientProfile.deleteMany({ where: { id: { in: ids } } });
      }
    } catch (_) {}

    return { deletedCount: Math.max(deletedCount, regIds.length), deletedRegIds: regIds };
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
        const pb = (p.branch || "").toLowerCase().replace(/branch/gi, "").trim();
        return pb === cleanB || (pb.length > 0 && (cleanB.includes(pb) || pb.includes(cleanB)));
      });
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      deleted = deleted.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.phone || "").includes(q) ||
          (p.regId || "").toLowerCase().includes(q)
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
      if (Array.isArray(parsed)) {
        let modified = false;
        parsed.forEach((a: any) => {
          if (a.branch === "Kphb" || a.branch === "KPHB") {
            a.branch = "Kphb Branch";
            modified = true;
          }
          if (a.appointmentDate) {
            const fixedDate = normalizeDateStr(a.appointmentDate);
            if (fixedDate && fixedDate !== a.appointmentDate) {
              a.appointmentDate = fixedDate;
              modified = true;
            }
          }
          if (a.paidAt && typeof a.paidAt === "string" && a.paidAt.startsWith("00")) {
            a.paidAt = a.paidAt.replace(/^00(\d\d)/, "20$1");
            modified = true;
          }
          if (!a.updatedAt) {
            a.updatedAt = a.createdAt || new Date().toISOString();
            modified = true;
          }
          if (a.doctorName) {
            const docLower = String(a.doctorName).toLowerCase();
            if (docLower.includes("vaidya") || docLower.includes("prasanth") || docLower.includes("prashant")) {
              if (a.doctorName !== "Dr. Prashant K Vaidya") {
                a.doctorName = "Dr. Prashant K Vaidya";
                modified = true;
              }
            } else if (docLower.includes("ramakrishna") || docLower.includes("chanduri")) {
              if (a.doctorName !== "Dr. Ramakrishna Chanduri") {
                a.doctorName = "Dr. Ramakrishna Chanduri";
                modified = true;
              }
            }
          }
        });
        if (modified) {
          safeAtomicWrite(file, parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load appointments from cache:", err);
  }
  return [];
}

function rebuildAppointmentIndices(): void {
  const store = global.__sphAppointmentsStore || [];
  const phoneMap = new Map<string, AppointmentRecord[]>();
  const regIdMap = new Map<string, AppointmentRecord[]>();

  for (const a of store) {
    if (a.isDeleted) continue;

    const reg = (a.registrationId || (a as any).regId || (a as any).patientId || "").trim().toUpperCase();
    if (reg) {
      let list = regIdMap.get(reg);
      if (!list) {
        list = [];
        regIdMap.set(reg, list);
      }
      list.push(a);
    }

    const digits = normalizePhone(a.phone || (a as any).phoneNumber || "");
    if (digits && digits.length >= 10) {
      const last10 = digits.slice(-10);
      let list = phoneMap.get(last10);
      if (!list) {
        list = [];
        phoneMap.set(last10, list);
      }
      list.push(a);
    }
  }

  global.__sphApptsPhoneIndex = phoneMap;
  global.__sphApptsRegIdIndex = regIdMap;
}

function getAppointmentsPhoneIndex(): Map<string, AppointmentRecord[]> {
  if (!global.__sphApptsPhoneIndex) {
    rebuildAppointmentIndices();
  }
  return global.__sphApptsPhoneIndex!;
}

function getAppointmentsRegIdIndex(): Map<string, AppointmentRecord[]> {
  if (!global.__sphApptsRegIdIndex) {
    rebuildAppointmentIndices();
  }
  return global.__sphApptsRegIdIndex!;
}

function saveAppointmentsToDisk(data: AppointmentRecord[]): void {
  const file = getAppointmentsCachePath();
  safeAtomicWrite(file, data);
  try {
    if (fs.existsSync(file)) {
      global.__sphApptsLastMtime = fs.statSync(file).mtimeMs;
    }
  } catch {}
  rebuildAppointmentIndices();
}

function getAppointmentsStore(): AppointmentRecord[] {
  const file = getAppointmentsCachePath();
  let mtime = 0;
  try {
    if (fs.existsSync(file)) {
      mtime = fs.statSync(file).mtimeMs;
    }
  } catch {}

  if (
    !global.__sphAppointmentsStore ||
    !global.__sphApptsLastMtime ||
    (mtime > 0 && mtime > global.__sphApptsLastMtime)
  ) {
    global.__sphAppointmentsStore = loadAppointmentsFromDisk();
    global.__sphApptsLastMtime = mtime;
    rebuildAppointmentIndices();
  }
  return global.__sphAppointmentsStore;
}

/**
 * Decorates an appointment with accurate visit badge ("New" | "In-Dur" | "Revisit"),
 * follow-up continuity date, and package metadata across all lifecycle stages.
 */
export function decorateAppointmentWithVisitInfo(
  a: AppointmentRecord,
  allStore?: AppointmentRecord[],
  patientsStore?: PatientRecord[],
  pkgStore?: PackageMemberRecord[]
): AppointmentRecord {
  const store = allStore || getAppointmentsStore();
  const patients = patientsStore || getPatientsStore();
  const packages = pkgStore || getPackageMembersStore();

  const regIndex = getPatientsRegIdIndex();
  const phoneIndex = getPatientsPhoneIndex();
  const aReg = (a.registrationId || "").trim().toUpperCase();
  const aDigits = normalizePhone(a.phone || "");
  const aPhone = aDigits.length >= 10 ? aDigits.slice(-10) : "";

  const pat =
    (aReg && regIndex.get(aReg)) ||
    patients.find((p) => matchPatientProfile(a, p));

  // HIGH-PERFORMANCE CANDIDATE LOOKUP:
  // Instead of scanning all 20,000 appointments twice (O(N)), look up sibling appointments in O(1)
  const apptPhoneIdx = getAppointmentsPhoneIndex();
  const apptRegIdx = getAppointmentsRegIdIndex();
  const candidatePool: AppointmentRecord[] = [];
  const seenIds = new Set<string>();

  if (aReg) {
    const list = apptRegIdx.get(aReg);
    if (list) {
      for (const item of list) {
        if (item.id !== a.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          candidatePool.push(item);
        }
      }
    }
  }
  if (aPhone) {
    const list = apptPhoneIdx.get(aPhone);
    if (list) {
      for (const item of list) {
        if (item.id !== a.id && !seenIds.has(item.id)) {
          // STRICT PROFILE MATCH: Candidate must belong to THIS patient profile!
          // (matching registration ID or matching name on the same phone number)
          if (matchPatientProfile(a, item)) {
            seenIds.add(item.id);
            candidatePool.push(item);
          }
        }
      }
    }
  }

  // Prior completed visits (or visits where fee was collected or marked completed)
  const priorCompleted = candidatePool.filter(
    (past) => {
      if (past.isDeleted) return false;
      const isCompleted =
        past.status === "COMPLETED" ||
        past.isFeeCollected ||
        (typeof past.totalPaid === "number" && past.totalPaid > 0);
      return isCompleted;
    }
  );

  let completedCount = priorCompleted.length;
  if (completedCount === 0 && pat?.completedVisitsCount !== undefined) {
    completedCount = pat.completedVisitsCount;
  }

  // Check any prior appointments (even if not yet marked completed, e.g. historical records)
  const anyPrior = candidatePool.filter((past) => !past.isDeleted);

  const aDate = normalizeDateStr(a.appointmentDate || a.createdAt?.slice(0, 10)) || undefined;

  // Active follow-up date and start date resolution:
  let activeFollowUp = a.followUpDate;
  let followUpStartDate = a.followUpStartDate;

  const pastWithFollowUp = [...priorCompleted]
    .filter((p) => p.followUpDate && p.followUpDate.trim().length > 0)
    .sort((x, y) => (y.createdAt || y.appointmentDate || "").localeCompare(x.createdAt || x.appointmentDate || ""));

  if (!activeFollowUp || activeFollowUp.trim().length === 0) {
    if (pat?.activeFollowUpDate && pat.activeFollowUpDate.trim().length > 0) {
      activeFollowUp = pat.activeFollowUpDate;
      followUpStartDate = pat.activeFollowUpStartDate;
    } else if (pastWithFollowUp.length > 0) {
      activeFollowUp = pastWithFollowUp[0].followUpDate;
      followUpStartDate = pastWithFollowUp[0].followUpStartDate || normalizeDateStr(pastWithFollowUp[0].appointmentDate || pastWithFollowUp[0].createdAt?.slice(0, 10)) || undefined;
    }
  } else {
    // If appointment itself has followUpDate (e.g. prescribed in this consultation),
    // its start date is this appointment's date (so today is consultation day, duration starts tomorrow)
    if (!followUpStartDate) {
      followUpStartDate = aDate;
    }
  }

  const activePkg = packages.find((p) => p.status === "ACTIVE" && matchPatientProfile(a, p));
  const packageStartDate = activePkg?.startDate
    ? normalizeDateStr(activePkg.startDate)
    : activePkg?.createdAt
    ? normalizeDateStr(activePkg.createdAt.slice(0, 10))
    : undefined;

  const hasHistory = completedCount > 0 || anyPrior.length > 0 || ((pat?.completedVisitsCount || 0) > 0);
  const isActualReback = Boolean(a.isReback && hasHistory);

  const badgeInfo = computePatientVisitBadge(completedCount, activeFollowUp, {
    hasActivePackage: !!activePkg,
    packageEndDate: activePkg?.endDate,
    packageStartDate,
    followUpStartDate,
    referenceDate: a.appointmentDate || a.createdAt,
    isReback: isActualReback,
    hasPriorVisits: hasHistory,
  });

  const isDur = badgeInfo.badge === "In-Dur";
  const isNew = badgeInfo.badge === "New";
  const isRev = badgeInfo.badge === "Revisit";

  return {
    ...a,
    visitBadge: badgeInfo.badge,
    visitType: isDur ? "IN_DURATION" : isRev ? "REVISIT" : "NEW",
    isDuration: isDur,
    isNewPatient: isNew,
    isReback: isRev,
    activeFollowUpDate: activeFollowUp,
    followUpStartDate: followUpStartDate || a.followUpStartDate,
    hasPackage: !!activePkg,
    packageId: activePkg ? activePkg.id : undefined,
    packageName: activePkg ? activePkg.packageName : undefined,
    packageTotalAmount: activePkg ? activePkg.totalAmount : undefined,
    packagePaidAmount: activePkg ? activePkg.paidAmount : undefined,
    packagePendingAmount: activePkg ? activePkg.pendingAmount : undefined,
    packageDurationMonths: activePkg ? activePkg.durationMonths : undefined,
    packageEndDate: activePkg ? activePkg.endDate : undefined,
  };
}

export const appointmentService = {
  async getAppointments(branch?: string, date?: string, doctorId?: string, includeDeleted = false, decorate = true): Promise<AppointmentRecord[]> {
    let list = getAppointmentsStore();
    if (!includeDeleted) {
      list = list.filter((a) => !a.isDeleted);
    }
    if (branch && branch !== "All Branches" && branch.toLowerCase() !== "all") {
      list = list.filter((a) => matchBranch(a.branch, branch));
    }
    if (date) {
      const normQuery = normalizeDateStr(date);
      list = list.filter((a) => normalizeDateStr(a.appointmentDate) === normQuery);
    }
    if (doctorId && doctorId !== "All Doctors" && doctorId.toLowerCase() !== "all") {
      const cleanDoc = doctorId.toLowerCase().trim();
      const normDocName = cleanDoc.replace(/^dr\.?\s*/i, "").trim();
      const schedules = getDoctorSchedulesStore();
      const matchedSchedule = schedules.find(
        (s) =>
          (s.doctorId && s.doctorId.toLowerCase() === cleanDoc) ||
          (s.doctorName && s.doctorName.toLowerCase().replace(/^dr\.?\s*/i, "").trim() === normDocName)
      );
      const targetId = matchedSchedule?.doctorId?.toLowerCase() || cleanDoc;
      const targetName = matchedSchedule?.doctorName?.toLowerCase().replace(/^dr\.?\s*/i, "").trim() || normDocName;

      list = list.filter((a) => {
        const dId = (a.doctorId || "").toLowerCase().trim();
        const dName = (a.doctorName || "").toLowerCase().replace(/^dr\.?\s*/i, "").trim();
        return (
          dId === cleanDoc ||
          dId === targetId ||
          dName === targetName ||
          dName.includes(targetName) ||
          targetName.includes(dName)
        );
      });
    }

    if (!decorate) {
      return list;
    }

    const allStore = getAppointmentsStore();
    const patients = getPatientsStore();
    const pkgStore = getPackageMembersStore();

    return list.map((a) => decorateAppointmentWithVisitInfo(a, allStore, patients, pkgStore));
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

    const isOnline = data.consultationMode?.trim().toLowerCase() === "online";
    const isHistorical =
      data.status === "COMPLETED" ||
      (typeof data.marketingSource === "string" &&
        (data.marketingSource.includes("Historical") || data.marketingSource.includes("Old Record")));

    // Anti-overbooking guardrail: Check capacity before creating prospective in-clinic appointment
    if (!isOnline && !isHistorical) {
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
    }

    const store = getAppointmentsStore();
    const tokenNum = Math.floor(10 + Math.random() * 90);
    const newRecord: AppointmentRecord = {
      ...data,
      id: data.id || `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      token: data.token || `SPH-${tokenNum}`,
      status: data.status || "WAITING",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

    // When an appointment is booked, mark any prior follow-up for this patient as booked/shifted
    const sourceFollowUpId = (data as any).followUpAppointmentId || (data as any).sourceFollowUpId;
    await this.markFollowUpAsBooked(sourceFollowUpId, newRecord.id, {
      phone: newRecord.phone,
      regId: newRecord.registrationId,
      name: newRecord.patientName,
    });

    return decorateAppointmentWithVisitInfo(newRecord, store);
  },

  /**
   * Marks a follow-up consultation as booked into a confirmed appointment,
   * shifting it out of the active follow-up queue.
   */
  async markFollowUpAsBooked(
    sourceId?: string,
    bookedAppointmentId?: string,
    patientIdentifier?: { phone?: string; regId?: string; name?: string }
  ): Promise<boolean> {
    const store = getAppointmentsStore();
    let modified = false;

    if (sourceId) {
      const idx = store.findIndex((a) => a.id === sourceId || a.token === sourceId);
      if (idx !== -1) {
        store[idx].isFollowUpBooked = true;
        store[idx].followUpBookedAppointmentId = bookedAppointmentId;
        store[idx].followUpBookedAt = new Date().toISOString();
        modified = true;
      }
    }

    if (patientIdentifier) {
      for (const a of store) {
        if (
          a.id !== bookedAppointmentId &&
          !a.isFollowUpBooked &&
          (a.followUpDate || a.followUpInterval) &&
          matchPatientProfile(a, patientIdentifier)
        ) {
          a.isFollowUpBooked = true;
          a.followUpBookedAppointmentId = bookedAppointmentId;
          a.followUpBookedAt = new Date().toISOString();
          modified = true;
        }
      }

      // Also clear patient activeFollowUpDate so patient profile reflects the booking
      const patients = getPatientsStore();
      const pIdx = patients.findIndex((p) => matchPatientProfile(p, patientIdentifier));
      if (pIdx !== -1) {
        patients[pIdx].activeFollowUpDate = undefined;
        global.__sphPatientsStore = patients;
        savePatientsToDisk(patients);
      }
    }

    if (modified) {
      global.__sphAppointmentsStore = store;
      saveAppointmentsToDisk(store);
    }
    return modified;
  },

  async getSlotBookedCount(branch: string, date: string, doctorId: string, timeSlot: string): Promise<number> {
    const appointments = await this.getAppointments(branch, date, doctorId);
    const cleanSlot = timeSlot.trim().toUpperCase();
    return appointments.filter(
      (a) => a.timeSlot.trim().toUpperCase() === cleanSlot &&
             a.status !== "CANCELLED" &&
             !a.isDeleted &&
             a.consultationMode?.trim().toLowerCase() !== "online"
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

    const target = store[idx];
    if (role === "RECEPTION" && (target.status === "COMPLETED" || !!target.isFeeCollected)) {
      throw new Error("Completed appointments cannot be deleted by Reception.");
    }

    store[idx].isDeleted = true;
    store[idx].deletedAt = new Date().toISOString();
    store[idx].updatedAt = new Date().toISOString();
    store[idx].deletedBy = deletedBy;
    store[idx].deletedRole = role;
    store[idx].deletedReason = reason;
    store[idx].status = "CANCELLED";

    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);

    try {
      await planSpreadService.refundPlan(store[idx].id);
    } catch {}

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
    store[idx].updatedAt = new Date().toISOString();
    store[idx].deletedBy = undefined;
    store[idx].deletedRole = undefined;
    store[idx].deletedReason = undefined;
    store[idx].status = "SCHEDULED";

    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);

    try {
      const restored = await planSpreadService.restorePlan(store[idx].id);
      if (!restored && (Number(store[idx].totalPaid) > 0 || store[idx].isFeeCollected)) {
        const durMonths = parseCourseDurationMonths(store[idx].medicineDuration || store[idx].packageDurationMonths);
        const planDur = durMonths >= 1 ? Math.round(durMonths) : 1;
        await planSpreadService.recordPlanPayment({
          planId: store[idx].id,
          branch: (store[idx] as any).branchName || store[idx].branch || "KPHB Branch",
          patientId: store[idx].registrationId || store[idx].phone,
          amount: Number(store[idx].totalPaid) || 0,
          durationMonths: planDur,
          paidAt: store[idx].paidAt || store[idx].appointmentDate || new Date().toISOString(),
          isInstallment: false,
        });
      }
    } catch {}

    return store[idx];
  },

  /**
   * Retrieves a single appointment by id or token.
   */
  async getAppointmentById(id: string): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const appt = store.find((a) => a.id === id || a.token === id);
    if (!appt) return null;
    return decorateAppointmentWithVisitInfo(appt, store);
  },

  /**
   * Updates an appointment's status (e.g. IN_CONSULTATION, COMPLETED).
   */
  async updateAppointmentStatus(id: string, status: AppointmentRecord["status"]): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const appt = store.find((a) => a.id === id || a.token === id);
    if (!appt) return null;
    appt.status = status;
    appt.updatedAt = new Date().toISOString();
    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);

    if (status === "COMPLETED") {
      const patients = getPatientsStore();
      const patIdx = patients.findIndex((p) => matchPatientProfile(appt, p));
      if (patIdx !== -1) {
        const completedCount = store.filter(
          (a) => !a.isDeleted && a.status === "COMPLETED" && matchPatientProfile(a, patients[patIdx])
        ).length;
        patients[patIdx].completedVisitsCount = completedCount;
        if (appt.followUpDate && appt.followUpDate.trim().length > 0) {
          patients[patIdx].activeFollowUpDate = appt.followUpDate.trim();
        }
        global.__sphPatientsStore = patients;
        savePatientsToDisk(patients);
      }
    }

    return decorateAppointmentWithVisitInfo(appt, store);
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
      paymentMethod?: "CASH" | "COUNTER_UPI" | "ONLINE_UPI" | "CARD" | "SPLIT" | "SEND_TO_APP" | string;
  splitDetails?: {
    cash?: number;
    upi?: number;
    card?: number;
    counterUpi?: number;
  };
      medicinesList?: Array<{
        name: string;
        type: string;
        timing: string;
        amount: number;
      }>;
      medicines?: Array<{
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
  discountRespondedAt?: string;
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
    if (data.dietPlanFee !== undefined) {
      appt.dietPlanFee = data.dietPlanFee;
      (appt as any).dietFee = data.dietPlanFee;
    } else if ((data as any).dietFee !== undefined) {
      appt.dietPlanFee = (data as any).dietFee;
      (appt as any).dietFee = (data as any).dietFee;
    }
    if ((data as any).hasPackage !== undefined) (appt as any).hasPackage = (data as any).hasPackage;
    if ((data as any).packageInstallmentPaid !== undefined) (appt as any).packageInstallmentPaid = (data as any).packageInstallmentPaid;
    if ((data as any).isRegularBilling !== undefined) (appt as any).isRegularBilling = (data as any).isRegularBilling;
    if ((data as any).billingMode !== undefined) (appt as any).billingMode = (data as any).billingMode;
    if ((data as any).paymentType !== undefined) (appt as any).paymentType = (data as any).paymentType;
    if ((data as any).paymentMode !== undefined) (appt as any).paymentMode = (data as any).paymentMode;
    if (data.totalAmountDue !== undefined) appt.totalAmountDue = data.totalAmountDue;
    if (data.paymentMethod !== undefined) appt.paymentMethod = data.paymentMethod;
    if ((data as any).splitDetails !== undefined) appt.splitDetails = (data as any).splitDetails;
    const medItems = data.medicinesList !== undefined ? data.medicinesList : (data as any).medicines;
    if (medItems !== undefined) {
      appt.medicinesList = medItems;
      appt.medicines = medItems;
    }
    if (data.medicineDuration !== undefined) appt.medicineDuration = data.medicineDuration;
    if (data.discountRequested !== undefined) appt.discountRequested = data.discountRequested;
    if (data.discountApproved !== undefined) appt.discountApproved = data.discountApproved;
    if (data.discountNotes !== undefined) appt.discountNotes = data.discountNotes;
    if (data.discountStatus !== undefined) appt.discountStatus = data.discountStatus;
    if (data.otherCharges !== undefined) appt.otherCharges = data.otherCharges;
    if (data.discount !== undefined) appt.discount = data.discount;
    if (data.discountReason !== undefined) appt.discountReason = data.discountReason;
    if (data.totalPaid !== undefined) appt.totalPaid = data.totalPaid;
    const payLaterAmt = Number((data as any).payLaterAmount) || 0;
    const prevDuePaid = Number((data as any).previousDuePaid) || 0;
    if (payLaterAmt > 0) {
      appt.payLaterAmount = payLaterAmt;
      appt.pendingBalance = payLaterAmt;
    }
    if (prevDuePaid > 0) {
      appt.previousDuePaid = prevDuePaid;
    }
    if (data.invoiceId) {
      appt.invoiceId = data.invoiceId;
    } else if (!appt.invoiceId) {
      appt.invoiceId = `INV-${Date.now().toString().slice(-6)}`;
    }

    appt.status = "COMPLETED";
    appt.isFeeCollected = true;
    appt.isSentToReception = false;
    appt.paidAt = new Date().toISOString();
    appt.updatedAt = new Date().toISOString();

    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);

    // Update patient profile completed visits, active follow-up, and pending balance
    const patients = getPatientsStore();
    const patIdx = patients.findIndex((p) => matchPatientProfile(appt, p));
    if (patIdx !== -1) {
      const completedCount = store.filter(
        (a) => !a.isDeleted && (a.status === "COMPLETED" || a.id === appt.id) && matchPatientProfile(a, patients[patIdx])
      ).length;
      patients[patIdx].completedVisitsCount = completedCount;
      if (appt.followUpDate && appt.followUpDate.trim().length > 0) {
        patients[patIdx].activeFollowUpDate = appt.followUpDate.trim();
      }
      const curBal = Number(patients[patIdx].pendingBalance) || 0;
      patients[patIdx].pendingBalance = Math.max(0, curBal - prevDuePaid + payLaterAmt);
      global.__sphPatientsStore = patients;
      savePatientsToDisk(patients);
    }

    if (payLaterAmt > 0) {
      await payLaterService.createPayLater({
        patientId: appt.registrationId || appt.phone,
        registrationId: appt.registrationId,
        patientName: appt.patientName,
        phone: appt.phone,
        branch: (appt as any).branchName || appt.branch || "KPHB Branch",
        appointmentId: appt.id,
        invoiceId: appt.invoiceId,
        originalBillAmount: data.totalAmountDue || 0,
        amountPaid: data.totalPaid || 0,
        pendingAmount: payLaterAmt,
        visitDate: appt.appointmentDate || new Date().toISOString(),
        dueDate: (data as any).dueDate || undefined,
        notes: (data as any).payLaterNotes || undefined,
      });
    }

    if (prevDuePaid > 0) {
      await payLaterService.settleBalance(
        appt.registrationId || appt.phone,
        prevDuePaid,
        appt.invoiceId,
        appt.id
      );
    }

    // Auto-update package installment if patient has active package and this visit is explicitly marked for package installment
    const shouldRecordPackagePayment =
      (Boolean((data as any).hasPackage) || (data as any).paymentType === "package" || (data as any).packageInstallmentPaid !== undefined) &&
      !(data as any).skipPackagePayment &&
      !(data as any).isRegularBilling;

    if (shouldRecordPackagePayment) {
      const activePkg = await packageService.getPackageByProfile(appt.registrationId || appt.phone, appt.patientName);
      if (activePkg && activePkg.status === "ACTIVE" && (data.totalPaid || 0) > 0) {
        await packageService.recordPackagePayment(activePkg.id, {
          amount: (data as any).packageInstallmentPaid !== undefined ? (data as any).packageInstallmentPaid : (data.totalPaid || 0),
          paymentMethod: data.paymentMethod || "CASH",
          appointmentId: appt.id,
          invoiceId: appt.invoiceId,
          notes: `Visit payment on ${appt.appointmentDate}`,
        });
      }
    }

    // Record revenue quality metrics atomically
    try {
      const activePkg = shouldRecordPackagePayment
        ? await packageService.getPackageByProfile(appt.registrationId || appt.phone, appt.patientName)
        : null;
      const isPkgActive = activePkg && activePkg.status === "ACTIVE";

      if (!isPkgActive) {
        const paidAmt = Number(data.totalPaid !== undefined ? data.totalPaid : appt.totalPaid) || 0;
        const durMonths = parseCourseDurationMonths(
          data.medicineDuration || appt.medicineDuration || appt.packageDurationMonths
        );
        if (paidAmt > 0 || durMonths > 0 || appt.status === "COMPLETED") {
          await revenueQualityService.recordPayment({
            branch: (appt as any).branchName || appt.branch || "KPHB Branch",
            patientId: appt.registrationId || appt.phone,
            amount: paidAmt,
            durationMonths: durMonths,
            paidAt: appt.paidAt || new Date().toISOString(),
            planId: appt.id,
            isInitialPlan: true,
          });

          const planDur = durMonths >= 1 ? Math.round(durMonths) : 1;
          await planSpreadService.recordPlanPayment({
            planId: appt.id,
            branch: (appt as any).branchName || appt.branch || "KPHB Branch",
            patientId: appt.registrationId || appt.phone,
            amount: paidAmt,
            durationMonths: planDur,
            paidAt: appt.paidAt || new Date().toISOString(),
            isInstallment: false,
          });
        }
      }
    } catch (err) {
      console.warn("Failed recording revenue metrics for appointment:", err);
    }

    return decorateAppointmentWithVisitInfo(appt, store);
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
    return decorateAppointmentWithVisitInfo(appt, store);
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
    appt.discountRespondedAt = new Date().toISOString();
    if (data.notes) {
      appt.discountNotes = `${appt.discountNotes || ""} | HR/Admin Note: ${data.notes}`.trim();
    }

    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return decorateAppointmentWithVisitInfo(appt, store);
  },

  /**
   * Returns all pending discount requests for HR / Admin.
   */
  async getPendingDiscounts(): Promise<AppointmentRecord[]> {
    const res = await this.getDiscounts({ status: "PENDING" });
    return res.discounts;
  },

  /**
   * Returns discount requests (pending, approved, rejected) within the last N months (default 2 months).
   */
  async getDiscounts(options?: { months?: number; status?: string; branch?: string }): Promise<{
    discounts: AppointmentRecord[];
    stats: { total: number; pending: number; approved: number; rejected: number };
  }> {
    const store = getAppointmentsStore();
    const months = options?.months || 2;
    const cutoffTime = Date.now() - months * 30 * 24 * 60 * 60 * 1000;

    // Filter appointments that have a discount request
    const discountAppts = store.filter((a) => {
      if (a.isDeleted) return false;
      const status = a.discountStatus;
      const hasDiscount =
        (typeof a.discountRequested === "number" && a.discountRequested > 0) ||
        (typeof a.discountApproved === "number" && a.discountApproved > 0) ||
        (status && status !== "NONE");
      if (!hasDiscount) return false;

      // Pending are always shown regardless of date!
      if (status === "PENDING") return true;

      // Approved / Rejected: check within last N months (by discountRespondedAt, createdAt, or appointmentDate)
      let recordTime = 0;
      if (a.discountRespondedAt) {
        recordTime = new Date(a.discountRespondedAt).getTime();
      } else if (a.createdAt) {
        recordTime = new Date(a.createdAt).getTime();
      } else if (a.appointmentDate) {
        const parts = a.appointmentDate.split("-");
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            recordTime = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
          } else {
            recordTime = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
          }
        }
      }

      if (recordTime && recordTime < cutoffTime) {
        return false;
      }
      return true;
    });

    const stats = {
      total: discountAppts.length,
      pending: discountAppts.filter((a) => (a.discountStatus || "PENDING") === "PENDING").length,
      approved: discountAppts.filter((a) => a.discountStatus === "APPROVED").length,
      rejected: discountAppts.filter((a) => a.discountStatus === "REJECTED").length,
    };

    let filtered = discountAppts;

    // Filter by branch if specified
    if (options?.branch && options.branch !== "All Branches" && options.branch !== "ALL") {
      const bClean = options.branch.toLowerCase().replace(/branch/gi, "").trim();
      filtered = filtered.filter((a) => {
        const aBranch = (a.branch || "").toLowerCase().replace(/branch/gi, "").trim();
        return aBranch === bClean || aBranch.includes(bClean) || bClean.includes(aBranch);
      });
    }

    // Filter by status if specified
    if (options?.status && options.status !== "ALL" && options.status !== "All") {
      const s = options.status.toUpperCase();
      filtered = filtered.filter((a) => (a.discountStatus || "PENDING").toUpperCase() === s);
    }

    // Sort: PENDING first, then newest to oldest
    filtered.sort((a, b) => {
      const isAPending = (a.discountStatus || "PENDING") === "PENDING";
      const isBPending = (b.discountStatus || "PENDING") === "PENDING";
      if (isAPending && !isBPending) return -1;
      if (!isAPending && isBPending) return 1;

      const tA = new Date(a.discountRespondedAt || a.createdAt || 0).getTime();
      const tB = new Date(b.discountRespondedAt || b.createdAt || 0).getTime();
      return tB - tA;
    });

    return {
      discounts: filtered.map((a) => decorateAppointmentWithVisitInfo(a, store)),
      stats,
    };
  },

  /**
   * Updates clinical patient file details and hands off to reception.
   */
  async updatePatientFile(
    id: string,
    data: {
      diagnosisNotes?: string;
      prescriptionText?: string;
      prescriptionImages?: string[];
      sharedMediaLinks?: Array<{ id: string; name: string; url: string }>;
      followUpInterval?: string;
      followUpDate?: string;
      consultationFee?: number;
      dietPlan?: string;
      dietPlanFee?: number;
      isSentToReception?: boolean;
      status?: AppointmentRecord["status"];
    }
  ): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const appt = store.find((a) => a.id === id || a.token === id);
    if (!appt) return null;

    if (data.diagnosisNotes !== undefined) appt.diagnosisNotes = data.diagnosisNotes;
    if (data.prescriptionText !== undefined) appt.prescriptionText = data.prescriptionText;
    if (data.prescriptionImages !== undefined) appt.prescriptionImages = data.prescriptionImages;
    if (data.sharedMediaLinks !== undefined) appt.sharedMediaLinks = data.sharedMediaLinks;
    if (data.followUpInterval !== undefined) appt.followUpInterval = data.followUpInterval;
    if (data.consultationFee !== undefined) appt.consultationFee = data.consultationFee;
    if (data.dietPlan !== undefined) appt.dietPlan = data.dietPlan;
    if (data.dietPlanFee !== undefined) {
      appt.dietPlanFee = data.dietPlanFee;
      (appt as any).dietFee = data.dietPlanFee;
    }
    if (data.isSentToReception !== undefined) appt.isSentToReception = data.isSentToReception;
    if (data.status !== undefined) appt.status = data.status;

    // Follow-up Date continuity:
    // If doctor/reception sets a new follow-up date, it updates both the appointment and activeFollowUpDate on patient profile.
    // If not set, existing activeFollowUpDate continues!
    const patients = getPatientsStore();
    const patIdx = patients.findIndex((p) => matchPatientProfile(appt, p));

    if (data.followUpDate !== undefined && data.followUpDate.trim().length > 0) {
      appt.followUpDate = data.followUpDate.trim();
      const consultDate = normalizeDateStr(appt.appointmentDate || appt.createdAt?.slice(0, 10)) || new Date().toISOString().slice(0, 10);
      appt.followUpStartDate = consultDate;
      if (patIdx !== -1) {
        patients[patIdx].activeFollowUpDate = data.followUpDate.trim();
        patients[patIdx].activeFollowUpStartDate = consultDate;
        global.__sphPatientsStore = patients;
        savePatientsToDisk(patients);
      }
    } else if (!appt.followUpDate && patIdx !== -1 && patients[patIdx].activeFollowUpDate) {
      // Retain existing active follow-up date
      appt.followUpDate = patients[patIdx].activeFollowUpDate;
      if (patients[patIdx].activeFollowUpStartDate) {
        appt.followUpStartDate = patients[patIdx].activeFollowUpStartDate;
      }
    }

    // Ensure followUpInterval is never left as "Custom Date" or "No Follow-up" if followUpDate exists
    if (appt.followUpDate) {
      if (!appt.followUpInterval || appt.followUpInterval === "Custom Date" || appt.followUpInterval === "No Follow-up") {
        appt.followUpInterval = appt.followUpDate;
      }
    }

    // When a consultation or follow-up date is saved, mark any older appointments of this patient as fulfilled/booked
    for (const older of store) {
      if (older.id !== appt.id && !older.isFollowUpBooked && matchPatientProfile(appt, older)) {
        older.isFollowUpBooked = true;
        older.followUpBookedAppointmentId = appt.id;
        older.followUpBookedAt = new Date().toISOString();
      }
    }

    // Attach active package to appointment if patient is a package member
    const pkgStore = getPackageMembersStore();
    const activePkg = pkgStore.find((p) => p.status === "ACTIVE" && matchPatientProfile(appt, p));
    if (activePkg) {
      appt.hasPackage = true;
      appt.packageId = activePkg.id;
      appt.packageName = activePkg.packageName;
      appt.packageTotalAmount = activePkg.totalAmount;
      appt.packagePaidAmount = activePkg.paidAmount;
      appt.packagePendingAmount = activePkg.pendingAmount;
      appt.packageDurationMonths = activePkg.durationMonths;
      appt.packageEndDate = activePkg.endDate;
    } else {
      appt.hasPackage = false;
      delete appt.packageId;
      delete appt.packageName;
      delete appt.packageTotalAmount;
      delete appt.packagePaidAmount;
      delete appt.packagePendingAmount;
      delete appt.packageDurationMonths;
      delete appt.packageEndDate;
    }

    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return decorateAppointmentWithVisitInfo(appt, store);
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
    const nowIso = new Date().toISOString();
    orderedIds.forEach((id) => {
      const a = store.find((item) => item.id === id);
      if (a) a.updatedAt = nowIso;
    });
    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return true;
  },

  /**
   * Reschedules an appointment to a new date and time slot.
   */
  async rescheduleAppointment(
    id: string,
    newDate: string,
    newTimeSlot: string,
    doctorId?: string,
    doctorName?: string
  ): Promise<AppointmentRecord | null> {
    const store = getAppointmentsStore();
    const appt = store.find((a) => a.id === id || a.token === id);
    if (!appt) return null;
    appt.appointmentDate = newDate;
    appt.timeSlot = newTimeSlot;
    appt.updatedAt = new Date().toISOString();
    if (doctorId) appt.doctorId = doctorId;
    if (doctorName) appt.doctorName = doctorName;
    global.__sphAppointmentsStore = store;
    saveAppointmentsToDisk(store);
    return decorateAppointmentWithVisitInfo(appt, store);
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

  /**
   * Fast change-check for a given branch and date (< 2ms)
   * Returns latest updatedAt timestamp, row count, and a combined version checksum.
   */
  async getChanges(branch?: string, date?: string): Promise<{ maxUpdatedAt: string; count: number; version: string }> {
    const list = await this.getAppointments(branch, date, undefined, false, false);
    let maxUpdated = "";
    for (let i = 0; i < list.length; i++) {
      const up = list[i].updatedAt || list[i].createdAt || "";
      if (up > maxUpdated) maxUpdated = up;
    }
    const count = list.length;
    const version = `${maxUpdated}:${count}`;
    return { maxUpdatedAt: maxUpdated, count, version };
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

function computeNextRegistrationNumber(code: BranchCode, store: Record<string, number>): number {
  const patients = getPatientsStore();
  const appointments = getAppointmentsStore();

  const usedNumbers = new Set<number>();
  const regex = new RegExp(`^SPH-${code}-(\\d+)`, "i");

  patients.forEach((p) => {
    const match = (p.regId || "").match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) {
        usedNumbers.add(num);
      }
    }
  });

  appointments.forEach((a) => {
    const match = (a.registrationId || "").match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) {
        usedNumbers.add(num);
      }
    }
  });

  const sorted = Array.from(usedNumbers).sort((a, b) => a - b);

  // Identify the continuous sequence maximum by detecting rogue outlier gaps (> 100).
  // Example: [1, 2, ..., 1813, 17814, 17815, 17816, 17817, 17818]
  // 17814 - 1813 = 16001 > 100, which is an outlier rogue leap.
  // The true continuous sequence cluster ends at 1813.
  let continuousMax = 0;
  for (let i = 0; i < sorted.length; i++) {
    const num = sorted[i];
    if (i === 0) {
      continuousMax = num;
    } else {
      const prev = sorted[i - 1];
      // If there is an anomalous jump greater than 100, do not let continuousMax jump to the outlier!
      if (num - prev > 100) {
        break;
      }
      continuousMax = num;
    }
  }

  // Check store sequence: if an explicit manual reset exists, respect it.
  // Otherwise, only accept store[code] if it is consistent with the continuous cluster (not an outlier jump).
  const isExplicit = Boolean((store as any)[`${code}_manual`]);
  const storeVal = store[code] || 0;
  let baseNum = continuousMax;

  if (isExplicit && storeVal > 0) {
    baseNum = Math.max(baseNum, storeVal);
  } else if (storeVal > 0 && storeVal <= continuousMax + 100) {
    baseNum = Math.max(baseNum, storeVal);
  }

  // Find next available unused sequential ID
  let candidate = Math.max(1, baseNum + 1);
  while (usedNumbers.has(candidate)) {
    candidate++;
  }

  return candidate;
}

export const registrationSequenceService = {
  getBranchCode(branchNameOrId?: string): BranchCode {
    return getBranchShortcut(branchNameOrId);
  },

  async getNextRegistrationId(branchNameOrId?: string): Promise<string> {
    const code = getBranchShortcut(branchNameOrId);
    const store = getRegistrationSequencesStore();

    const nextNum = computeNextRegistrationNumber(code, store);
    store[code] = nextNum;
    delete (store as any)[`${code}_manual`];
    global.__sphRegistrationSequencesStore = store;
    saveRegistrationSequencesToDisk(store);

    const formattedNum = String(nextNum).padStart(4, "0");
    return `SPH-${code}-${formattedNum}`;
  },

  async peekNextRegistrationId(branchNameOrId?: string): Promise<string> {
    const code = getBranchShortcut(branchNameOrId);
    const store = getRegistrationSequencesStore();
    const nextNum = computeNextRegistrationNumber(code, store);
    const formattedNum = String(nextNum).padStart(4, "0");
    return `SPH-${code}-${formattedNum}`;
  },

  async resetSequence(branchCode: BranchCode, startValue = 0): Promise<void> {
    const store = getRegistrationSequencesStore();
    store[branchCode] = startValue;
    (store as any)[`${branchCode}_manual`] = true;
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
      if (Array.isArray(parsed)) {
        let modified = false;
        parsed.forEach((t: any) => {
          if (t.branch === "Kphb" || t.branch === "KPHB") {
            t.branch = "Kphb Branch";
            modified = true;
          }
        });
        if (modified) {
          safeAtomicWrite(file, parsed);
        }
        return parsed;
      }
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
        if (a.isHistorical) return false;
        const src = (a.marketingSource || "").toLowerCase();
        const notes = ((a.diagnosisNotes || "") + " " + (a.notes || "")).toLowerCase();
        if (
          src.includes("historical") ||
          src.includes("old record") ||
          src.includes("old entry") ||
          src.includes("uploaded") ||
          notes.includes("historical prescription") ||
          notes.includes("historical entry")
        ) {
          return false;
        }

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
          typeof a.totalPaid === "number" && a.totalPaid > 0
            ? a.totalPaid
            : typeof a.totalAmountDue === "number" && a.totalAmountDue > 0
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
  receptionPhone?: string;
  duration: string;
  totalAmount: number;
  medicines: MedicineRequestItem[];
  deliveryAddress?: string;
  notes?: string;
  status: "pending" | "completed" | "dispatched" | "rejected";
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
    return store.map((item) => ({
      ...item,
      receptionPhone: item.receptionPhone || getBranchReceptionPhone(item.branchName),
    }));
  },

  async createRequest(
    data: Omit<MedicineRequestRecord, "id" | "requestId" | "createdAt" | "status"> & {
      id?: string;
      requestId?: string;
      status?: "pending" | "completed" | "dispatched" | "rejected";
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
      receptionPhone: data.receptionPhone || getBranchReceptionPhone(data.branchName),
      createdAt: data.createdAt || new Date().toISOString(),
    };
    store.unshift(newRecord);
    global.__sphMedicineRequestsStore = store;
    saveMedicineRequestsToDisk(store);
    return newRecord;
  },

  async updateRequestStatus(
    id: string,
    status: "pending" | "completed" | "dispatched" | "rejected"
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

export interface StaffPunchItem {
  id?: string;
  type: "in" | "out";
  time: string; // IST 12-hour format
  location?: string;
  photo?: string;
  coords?: { lat: number; lng: number };
  shift?: "shift1" | "shift2" | "general" | string;
}

export interface StaffAttendanceRecord {
  id?: string;
  staffId: string;
  staffName: string;
  branch: string;
  date: string; // YYYY-MM-DD
  reportTime?: string; // Scheduled IST 12-hour report time, e.g. "09:00 AM"
  shiftStartTime?: string; // Alias for reportTime
  shiftType?: "SINGLE_STRICT" | "MULTI_STRICT" | string;
  shiftHours?: string;
  dailyHours?: string;

  // Shift 1 Details
  shift1Start?: string;
  shift1End?: string;
  shift1PunchInTime?: string;
  shift1PunchInLocation?: string;
  shift1PunchInPhoto?: string;
  shift1PunchInCoords?: { lat: number; lng: number };
  shift1PunchOutTime?: string;
  shift1PunchOutLocation?: string;
  shift1PunchOutPhoto?: string;
  shift1PunchOutCoords?: { lat: number; lng: number };

  // Shift 2 Details (Multi-shift / Split Shift)
  shift2Start?: string;
  shift2End?: string;
  shift2PunchInTime?: string;
  shift2PunchInLocation?: string;
  shift2PunchInPhoto?: string;
  shift2PunchInCoords?: { lat: number; lng: number };
  shift2PunchOutTime?: string;
  shift2PunchOutLocation?: string;
  shift2PunchOutPhoto?: string;
  shift2PunchOutCoords?: { lat: number; lng: number };

  // Primary Punches (Consolidated)
  punchInTime?: string; // IST 12-hour format
  punchInLocation?: string;
  punchInPhoto?: string;
  punchInCoords?: { lat: number; lng: number };
  punchOutTime?: string; // IST 12-hour format
  punchOutLocation?: string;
  punchOutPhoto?: string;
  punchOutCoords?: { lat: number; lng: number };

  punches?: StaffPunchItem[];

  workingHours?: string;
  status: "Present" | "Late" | "Half Day" | "Absent" | "On Leave" | "In Clinic";
  lateMinutes?: number;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffFullAttendanceDay {
  date: string; // YYYY-MM-DD
  dayNum: string; // 01..31
  dayName: string; // Mon..Sun
  monthShort: string; // Nov
  isSunday: boolean;
  isToday: boolean;
  isFuture: boolean;

  shiftType: "SINGLE_STRICT" | "MULTI_STRICT";
  shiftHours?: string;
  dailyHours?: string;

  // Shift 1
  shift1Start: string;
  shift1End?: string;
  shift1PunchInTime?: string;
  shift1PunchInLocation?: string;
  shift1PunchInPhoto?: string;
  shift1PunchOutTime?: string;
  shift1PunchOutLocation?: string;
  shift1PunchOutPhoto?: string;

  // Shift 2
  shift2Start?: string;
  shift2End?: string;
  shift2PunchInTime?: string;
  shift2PunchInLocation?: string;
  shift2PunchInPhoto?: string;
  shift2PunchOutTime?: string;
  shift2PunchOutLocation?: string;
  shift2PunchOutPhoto?: string;

  // Primary Punches
  punchInTime?: string;
  punchInLocation?: string;
  punchInPhoto?: string;
  punchOutTime?: string;
  punchOutLocation?: string;
  punchOutPhoto?: string;

  punches: StaffPunchItem[];

  workingHours: string;
  status: "Present" | "Late" | "Half Day" | "Absent" | "On Leave" | "Weekly Off" | "Pending" | "Scheduled";
  lateMinutes?: number;
  leaveType?: string;
  leaveReason?: string;
}

export interface StaffFullAttendanceResponse {
  employee: {
    id: string;
    name: string;
    category: string;
    role: string;
    branch: string;
    phone?: string;
    shiftType: "SINGLE_STRICT" | "MULTI_STRICT";
    shiftHours?: string;
    dailyHours?: string;
    shift1Start?: string;
    shift1End?: string;
    shift2Start?: string;
    shift2End?: string;
    graceMinutes?: number;
  };
  summary: {
    totalDays: number;
    presentDays: number;
    lateDays: number;
    halfDays: number;
    leaveDays: number;
    absentDays: number;
    weeklyOffs: number;
    totalWorkingHours: string;
  };
  logs: StaffFullAttendanceDay[];
}

declare global {
  var __sphStaffAttendanceStore: StaffAttendanceRecord[] | undefined;
  var __sphStaffAttendanceLastMtime: number | undefined;
  var __sphStaffLeavesStore: StaffLeaveRecord[] | undefined;
  var __sphStaffDailyWorksStore: StaffDailyWorkRecord[] | undefined;
  var __sphPayCutsStore: MiscellaneousPayCutRecord[] | undefined;
  var __sphLatePenaltyConfig: LatePenaltyRuleConfig | undefined;
}

/**
 * Robust formatter to ensure any time string, Date object, or ISO timestamp
 * is displayed in Indian Standard Time (IST) 12-hour format (e.g. "09:00 AM", "01:45 PM").
 */
export function formatToIST12Hour(input?: string | Date | null): string {
  if (!input) return "";
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return "";
    return input.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }
  const trimmed = String(input).trim();
  if (!trimmed || trimmed === "-" || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") {
    return "";
  }

  // 12-hour format like '09:30 AM' or '1:45:12 PM'
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    const h = parseInt(match12[1], 10);
    const m = match12[2];
    const s = match12[3];
    const ampm = match12[4].toUpperCase();
    const hStr = String(h).padStart(2, "0");
    return s ? `${hStr}:${m}:${s} ${ampm}` : `${hStr}:${m} ${ampm}`;
  }

  // 24-hour format like '14:30' or '09:15:20'
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    const m = match24[2];
    const s = match24[3];
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const hStr = String(h).padStart(2, "0");
    return s ? `${hStr}:${m}:${s} ${ampm}` : `${hStr}:${m} ${ampm}`;
  }

  // ISO string or parseable date string (convert UTC to IST)
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  return trimmed;
}

function getStaffAttendanceCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "staff_attendance_store.json"))) {
    return path.join(webCache, "staff_attendance_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "staff_attendance_store.json"))) {
    return path.join(rootCache, "staff_attendance_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "staff_attendance_store.json");
  }
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
    safeAtomicWrite(file, data);
    if (fs.existsSync(file)) {
      global.__sphStaffAttendanceLastMtime = fs.statSync(file).mtimeMs;
    }
  } catch (e) {
    console.warn("Failed writing staff attendance cache:", e);
  }
}

function getStaffAttendanceStore(): StaffAttendanceRecord[] {
  const file = getStaffAttendanceCachePath();
  let mtime = 0;
  try {
    if (fs.existsSync(file)) {
      mtime = fs.statSync(file).mtimeMs;
    }
  } catch {}

  if (
    !global.__sphStaffAttendanceStore ||
    !global.__sphStaffAttendanceLastMtime ||
    (mtime > 0 && mtime > global.__sphStaffAttendanceLastMtime)
  ) {
    global.__sphStaffAttendanceStore = loadStaffAttendanceFromDisk();
    global.__sphStaffAttendanceLastMtime = mtime;
  }
  return global.__sphStaffAttendanceStore;
}

export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const ampm = match12[4].toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const istTimeStr = d.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
    const parts = istTimeStr.split(":");
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }
  return null;
}

export function calculateMinutesDiff(inTime?: string, outTime?: string): number {
  const inM = parseTimeToMinutes(inTime);
  const outM = parseTimeToMinutes(outTime);
  if (inM === null || outM === null) return 0;
  let diff = outM - inM;
  if (diff < 0) diff += 1440;
  return diff;
}

export function formatMinutesToHours(minutes: number): string {
  if (minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} hrs ${m} mins`;
  if (h > 0) return `${h} hrs`;
  return `${m} mins`;
}

export const staffAttendanceService = {
  async getAllRecords(branch?: string, date?: string): Promise<StaffAttendanceRecord[]> {
    const store = getStaffAttendanceStore();
    const employees = await employeeService.getAllEmployees();
    const cleanBranch =
      branch && branch !== "All Branches" && branch.toLowerCase() !== "all"
        ? branch.toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/\s*branch$/i, "").trim()
        : "";

    // Map employees to reporting times & details
    const empMap = new Map<string, any>();
    employees.forEach((e) => {
      const info = {
        shiftStartTime: formatToIST12Hour(e.shiftStartTime || "09:00 AM"),
        branch: e.branchName || (e as any).branch || "KPHB Branch",
        role: e.category === "DOCTOR" ? "Doctor" : e.category === "HR" ? "HR Staff" : e.category || "Staff Member",
        name: e.name,
        shiftType: e.shiftType || "SINGLE_STRICT",
        shiftHours: e.shiftHours || "09:00 AM - 06:00 PM",
        dailyHours: e.dailyHours || "9 hrs/day",
        shift1Start: e.shift1Start ? formatToIST12Hour(e.shift1Start) : "09:00 AM",
        shift1End: e.shift1End ? formatToIST12Hour(e.shift1End) : undefined,
        shift2Start: e.shift2Start ? formatToIST12Hour(e.shift2Start) : undefined,
        shift2End: e.shift2End ? formatToIST12Hour(e.shift2End) : undefined,
      };
      empMap.set(e.id, info);
      if (e.name) empMap.set(e.name.toLowerCase().trim(), info);
    });

    const filtered = store.filter((r) => {
      const rBranch = (r.branch || "").toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/\s*branch$/i, "").trim();
      const matchBranch = !cleanBranch || rBranch === cleanBranch || rBranch.includes(cleanBranch) || cleanBranch.includes(rBranch);
      const matchDate = !date || r.date === date;
      return matchBranch && matchDate;
    });

    return filtered.map((r) => {
      const empInfo = empMap.get(r.staffId) || empMap.get((r.staffName || "").toLowerCase().trim());
      const repTime = formatToIST12Hour(r.reportTime || r.shiftStartTime || empInfo?.shiftStartTime || "09:00 AM");
      // Resolve true Indian Standard Time from ISO timestamps if available, avoiding UTC server drift
      const resolvedPunchIn = (r.punchInTime && r.createdAt && !isNaN(new Date(r.createdAt).getTime()))
        ? formatToIST12Hour(new Date(r.createdAt))
        : (r.punchInTime ? formatToIST12Hour(r.punchInTime) : undefined);

      const resolvedPunchOut = (r.punchOutTime && r.updatedAt && !isNaN(new Date(r.updatedAt).getTime()))
        ? formatToIST12Hour(new Date(r.updatedAt))
        : (r.punchOutTime ? formatToIST12Hour(r.punchOutTime) : undefined);

      return {
        ...r,
        reportTime: repTime,
        shiftStartTime: repTime,
        shiftType: r.shiftType || empInfo?.shiftType || "SINGLE_STRICT",
        shiftHours: r.shiftHours || empInfo?.shiftHours,
        dailyHours: r.dailyHours || empInfo?.dailyHours,
        shift1Start: r.shift1Start || empInfo?.shift1Start,
        shift1End: r.shift1End || empInfo?.shift1End,
        shift1PunchInTime: r.shift1PunchInTime ? formatToIST12Hour(r.shift1PunchInTime) : resolvedPunchIn,
        shift1PunchOutTime: r.shift1PunchOutTime ? formatToIST12Hour(r.shift1PunchOutTime) : (r.shiftType === "MULTI_STRICT" ? undefined : resolvedPunchOut),
        shift1PunchInPhoto: r.shift1PunchInPhoto || (r.punches?.find((p) => p.shift === "shift1" && p.type === "in")?.photo) || r.punchInPhoto,
        shift1PunchInLocation: r.shift1PunchInLocation || (r.punches?.find((p) => p.shift === "shift1" && p.type === "in")?.location) || r.punchInLocation,
        shift1PunchOutPhoto: r.shift1PunchOutPhoto || (r.punches?.find((p) => p.shift === "shift1" && p.type === "out")?.photo),
        shift1PunchOutLocation: r.shift1PunchOutLocation || (r.punches?.find((p) => p.shift === "shift1" && p.type === "out")?.location),
        shift2Start: r.shift2Start || empInfo?.shift2Start,
        shift2End: r.shift2End || empInfo?.shift2End,
        shift2PunchInTime: r.shift2PunchInTime ? formatToIST12Hour(r.shift2PunchInTime) : undefined,
        shift2PunchOutTime: r.shift2PunchOutTime ? formatToIST12Hour(r.shift2PunchOutTime) : undefined,
        shift2PunchInPhoto: r.shift2PunchInPhoto || (r.punches?.find((p) => p.shift === "shift2" && p.type === "in")?.photo),
        shift2PunchInLocation: r.shift2PunchInLocation || (r.punches?.find((p) => p.shift === "shift2" && p.type === "in")?.location),
        shift2PunchOutPhoto: r.shift2PunchOutPhoto || (r.punches?.find((p) => p.shift === "shift2" && p.type === "out")?.photo),
        shift2PunchOutLocation: r.shift2PunchOutLocation || (r.punches?.find((p) => p.shift === "shift2" && p.type === "out")?.location),
        punchInTime: resolvedPunchIn,
        punchOutTime: resolvedPunchOut,
        punches: r.punches || [],
        role: r.role || empInfo?.role || "Staff Member",
        branch: r.branch || empInfo?.branch || "KPHB Branch",
      };
    });
  },

  async getTodayRecord(staffId: string, dateStr?: string): Promise<StaffAttendanceRecord | null> {
    const today = dateStr || new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
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
    shift?: "shift1" | "shift2";
  }): Promise<StaffAttendanceRecord> {
    const store = getStaffAttendanceStore();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    // IST 12-hour punch time (e.g. "09:30:15 AM")
    const nowTime = new Date().toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    // Lookup staff scheduled report time & shift configuration
    const employees = await employeeService.getAllEmployees();
    const emp = employees.find(
      (e) => e.id === payload.staffId || e.name.toLowerCase().trim() === payload.staffName.toLowerCase().trim()
    );
    const reportTime = formatToIST12Hour(emp?.shiftStartTime || emp?.shift1Start || "09:00 AM");
    const isMultiShift = emp?.shiftType === "MULTI_STRICT";

    let existing = store.find((r) => r.staffId === payload.staffId && r.date === today);

    // Determine target shift (Shift 1 vs Shift 2)
    let targetShift: "shift1" | "shift2" = payload.shift || "shift1";
    if (isMultiShift && !payload.shift) {
      if (payload.type === "in") {
        if (existing?.shift1PunchInTime && existing?.shift1PunchOutTime) {
          targetShift = "shift2";
        } else {
          targetShift = "shift1";
        }
      } else {
        if (existing?.shift2PunchInTime && !existing?.shift2PunchOutTime) {
          targetShift = "shift2";
        } else {
          targetShift = "shift1";
        }
      }
    }

    if (!existing) {
      existing = {
        id: `ATT-${Date.now()}`,
        staffId: payload.staffId,
        staffName: payload.staffName,
        branch: payload.branch,
        date: today,
        reportTime,
        shiftStartTime: reportTime,
        shiftType: isMultiShift ? "MULTI_STRICT" : "SINGLE_STRICT",
        shiftHours: emp?.shiftHours,
        dailyHours: emp?.dailyHours,
        shift1Start: emp?.shift1Start ? formatToIST12Hour(emp.shift1Start) : reportTime,
        shift1End: emp?.shift1End ? formatToIST12Hour(emp.shift1End) : undefined,
        shift2Start: emp?.shift2Start ? formatToIST12Hour(emp.shift2Start) : undefined,
        shift2End: emp?.shift2End ? formatToIST12Hour(emp.shift2End) : undefined,
        punches: [],
        status: "Present",
        createdAt: new Date().toISOString(),
      };
      store.unshift(existing);
    }

    existing.reportTime = reportTime;
    existing.shiftStartTime = reportTime;
    existing.shiftType = isMultiShift ? "MULTI_STRICT" : "SINGLE_STRICT";
    existing.shiftHours = emp?.shiftHours || existing.shiftHours;
    existing.dailyHours = emp?.dailyHours || existing.dailyHours;
    if (emp?.shift1Start) existing.shift1Start = formatToIST12Hour(emp.shift1Start);
    if (emp?.shift1End) existing.shift1End = formatToIST12Hour(emp.shift1End);
    if (emp?.shift2Start) existing.shift2Start = formatToIST12Hour(emp.shift2Start);
    if (emp?.shift2End) existing.shift2End = formatToIST12Hour(emp.shift2End);
    existing.updatedAt = new Date().toISOString();

    if (payload.type === "in") {
      // Calculate late status
      const now = new Date();
      let shiftHour = 9;
      let shiftMin = 0;
      let grace = 15;
      try {
        const lateConfig = await payrollSettingsService.getLatePenaltyConfig();
        if (lateConfig) {
          grace = Number(lateConfig.graceMinutes) || 15;
          const shiftSource =
            targetShift === "shift2" && emp?.shift2Start
              ? emp.shift2Start
              : emp?.shiftStartTime || lateConfig.shiftStartTime;
          if (shiftSource) {
            const timeParts = shiftSource.trim().split(" ");
            const hm = timeParts[0].split(":");
            let h = parseInt(hm[0], 10) || 9;
            const m = parseInt(hm[1], 10) || 0;
            if (timeParts[1] && timeParts[1].toUpperCase() === "PM" && h < 12) h += 12;
            if (timeParts[1] && timeParts[1].toUpperCase() === "AM" && h === 12) h = 0;
            shiftHour = h;
            shiftMin = m;
          }
        }
      } catch {}

      const shiftStart = new Date();
      shiftStart.setHours(shiftHour, shiftMin, 0, 0);
      const diffMinutes = Math.max(0, Math.floor((now.getTime() - shiftStart.getTime()) / (1000 * 60)));
      const isLate = diffMinutes > grace;

      if (targetShift === "shift2") {
        existing.shift2PunchInTime = nowTime;
        existing.shift2PunchInLocation = payload.location;
        existing.shift2PunchInPhoto = payload.photo;
        existing.shift2PunchInCoords = payload.coords || undefined;
        // Shift 2 duty is actively on-duty, clear overall punchOutTime
        existing.punchOutTime = undefined;
      } else {
        existing.shift1PunchInTime = nowTime;
        existing.shift1PunchInLocation = payload.location;
        existing.shift1PunchInPhoto = payload.photo;
        existing.shift1PunchInCoords = payload.coords || undefined;
      }

      if (!existing.punchInTime) {
        existing.punchInTime = nowTime;
        existing.punchInLocation = payload.location;
        existing.punchInPhoto = payload.photo;
        existing.punchInCoords = payload.coords || undefined;
      }

      existing.status = isLate ? "Late" : "Present";
      existing.lateMinutes = diffMinutes;
    } else {
      // Punch Out
      if (targetShift === "shift2") {
        existing.shift2PunchOutTime = nowTime;
        existing.shift2PunchOutLocation = payload.location;
        existing.shift2PunchOutPhoto = payload.photo;
        existing.shift2PunchOutCoords = payload.coords || undefined;
        existing.punchOutTime = nowTime;
        existing.punchOutLocation = payload.location;
        existing.punchOutPhoto = payload.photo;
        existing.punchOutCoords = payload.coords || undefined;
      } else {
        existing.shift1PunchOutTime = nowTime;
        existing.shift1PunchOutLocation = payload.location;
        existing.shift1PunchOutPhoto = payload.photo;
        existing.shift1PunchOutCoords = payload.coords || undefined;
        existing.punchOutTime = nowTime;
        existing.punchOutLocation = payload.location;
        existing.punchOutPhoto = payload.photo;
        existing.punchOutCoords = payload.coords || undefined;
      }
    }

    // Append to punch log
    existing.punches = existing.punches || [];
    existing.punches.push({
      id: `PUNCH-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: payload.type,
      time: nowTime,
      location: payload.location,
      photo: payload.photo,
      coords: payload.coords || undefined,
      shift: targetShift,
    });

    // Compute working hours
    if (isMultiShift) {
      const s1M = calculateMinutesDiff(existing.shift1PunchInTime, existing.shift1PunchOutTime);
      const s2M = calculateMinutesDiff(existing.shift2PunchInTime, existing.shift2PunchOutTime);
      const totalM = s1M + s2M;
      if (existing.shift2PunchInTime && !existing.shift2PunchOutTime) {
        existing.workingHours = s1M > 0 ? `${formatMinutesToHours(s1M)} + Shift 2 Active` : "Shift 2 Active";
      } else {
        existing.workingHours = formatMinutesToHours(totalM);
      }
    } else {
      const diffM = calculateMinutesDiff(existing.punchInTime, existing.punchOutTime);
      existing.workingHours = formatMinutesToHours(diffM);
    }

    global.__sphStaffAttendanceStore = store;
    saveStaffAttendanceToDisk(store);
    return existing;
  },

  async getStaffFullAttendanceHistory(
    staffId: string,
    monthOrFromDate?: string,
    toDate?: string
  ): Promise<StaffFullAttendanceResponse> {
    const store = getStaffAttendanceStore();
    const employees = await employeeService.getAllEmployees();
    const allLeaves = await staffLeaveService.getAllLeaves();

    const emp = employees.find(
      (e) => e.id === staffId || (e.name && e.name.toLowerCase().trim() === staffId.toLowerCase().trim())
    );

    const empName = emp?.name || staffId;
    const branch = emp?.branchName || (emp as any)?.branch || "KPHB Branch";
    const role = emp?.category === "DOCTOR" ? "Doctor" : emp?.category === "HR" ? "HR Staff" : emp?.category || "Staff Member";
    const shiftType = (emp?.shiftType === "MULTI_STRICT" ? "MULTI_STRICT" : "SINGLE_STRICT") as "SINGLE_STRICT" | "MULTI_STRICT";
    const shift1Start = formatToIST12Hour(emp?.shift1Start || emp?.shiftStartTime || "09:00 AM");
    const shift1End = emp?.shift1End ? formatToIST12Hour(emp.shift1End) : (shiftType === "MULTI_STRICT" ? "01:00 PM" : "06:00 PM");
    const shift2Start = emp?.shift2Start ? formatToIST12Hour(emp.shift2Start) : "04:30 PM";
    const shift2End = emp?.shift2End ? formatToIST12Hour(emp.shift2End) : "08:30 PM";
    const shiftHours = emp?.shiftHours || (shiftType === "MULTI_STRICT" ? "09:00 AM - 01:00 PM & 04:30 PM - 08:30 PM" : "09:00 AM - 06:00 PM");
    const dailyHours = emp?.dailyHours || (shiftType === "MULTI_STRICT" ? "8 hrs/day" : "9 hrs/day");
    const graceMinutes = emp?.graceMinutes || 15;

    // Determine Date Range (Default to current IST month)
    const todayIso = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    let startIso: string;
    let endIso: string;

    if (monthOrFromDate && monthOrFromDate.length === 7 && monthOrFromDate.includes("-")) {
      const [yStr, mStr] = monthOrFromDate.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const daysInM = new Date(y, m, 0).getDate();
      startIso = `${monthOrFromDate}-01`;
      endIso = `${monthOrFromDate}-${String(daysInM).padStart(2, "0")}`;
    } else if (monthOrFromDate && toDate) {
      startIso = monthOrFromDate;
      endIso = toDate;
    } else {
      const curYearMonth = todayIso.slice(0, 7);
      const [yStr, mStr] = curYearMonth.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const daysInM = new Date(y, m, 0).getDate();
      startIso = `${curYearMonth}-01`;
      endIso = `${curYearMonth}-${String(daysInM).padStart(2, "0")}`;
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const startDate = new Date(`${startIso}T00:00:00`);
    const endDate = new Date(`${endIso}T00:00:00`);

    const dateList: string[] = [];
    const cur = new Date(endDate);
    while (cur >= startDate) {
      const iso = cur.toISOString().split("T")[0];
      dateList.push(iso);
      cur.setDate(cur.getDate() - 1);
    }

    // Match employee leaves
    const staffLeaves = allLeaves.filter(
      (l) => (l.staffId === staffId || (l.staffName && l.staffName.toLowerCase() === empName.toLowerCase())) && l.status !== "Rejected"
    );

    // Filter attendance records for this staff
    const staffAttendance = store.filter(
      (r) => r.staffId === staffId || (r.staffName && r.staffName.toLowerCase().trim() === empName.toLowerCase().trim())
    );

    const attMap = new Map<string, StaffAttendanceRecord>();
    staffAttendance.forEach((r) => {
      if (r.date) attMap.set(r.date, r);
    });

    let totalMinutesWorked = 0;
    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let leaveDays = 0;
    let absentDays = 0;
    let weeklyOffs = 0;

    const logs: StaffFullAttendanceDay[] = dateList.map((dateIso) => {
      const dObj = new Date(`${dateIso}T00:00:00`);
      const dayOfWeek = dObj.getDay();
      const isSunday = dayOfWeek === 0;
      const isToday = dateIso === todayIso;
      const isFuture = dateIso > todayIso;
      const dayNum = dateIso.split("-")[2];
      const monthShort = monthNames[parseInt(dateIso.split("-")[1], 10) - 1] || "Nov";
      const dayName = dayNames[dayOfWeek];

      const att = attMap.get(dateIso);
      const leave = staffLeaves.find((l) => l.fromDate <= dateIso && (!l.toDate || l.toDate >= dateIso));

      let status: StaffFullAttendanceDay["status"] = "Pending";
      let workingHoursStr = "-";
      let dayMinutes = 0;

      if (att) {
        if (att.status === "Late") {
          status = "Late";
          lateDays++;
          presentDays++;
        } else if (att.status === "Half Day") {
          status = "Half Day";
          halfDays++;
          presentDays++;
        } else {
          status = "Present";
          presentDays++;
        }

        if (shiftType === "MULTI_STRICT") {
          const s1M = calculateMinutesDiff(att.shift1PunchInTime || att.punchInTime, att.shift1PunchOutTime);
          const s2M = calculateMinutesDiff(att.shift2PunchInTime, att.shift2PunchOutTime || att.punchOutTime);
          dayMinutes = s1M + s2M;
          if (dayMinutes > 0) {
            workingHoursStr = formatMinutesToHours(dayMinutes);
          } else if (att.workingHours && att.workingHours !== "-") {
            workingHoursStr = att.workingHours;
          }
        } else {
          dayMinutes = calculateMinutesDiff(att.punchInTime, att.punchOutTime);
          if (dayMinutes > 0) {
            workingHoursStr = formatMinutesToHours(dayMinutes);
          } else if (att.workingHours && att.workingHours !== "-") {
            workingHoursStr = att.workingHours;
          }
        }
        totalMinutesWorked += dayMinutes;
      } else if (leave) {
        status = "On Leave";
        leaveDays++;
      } else if (isSunday) {
        status = "Weekly Off";
        weeklyOffs++;
      } else if (isFuture) {
        status = "Scheduled";
      } else if (isToday) {
        status = "Pending";
      } else {
        status = "Absent";
        absentDays++;
      }

      const resolvedPunchIn = (att?.punchInTime && att?.createdAt && !isNaN(new Date(att.createdAt).getTime()))
        ? formatToIST12Hour(new Date(att.createdAt))
        : (att?.punchInTime ? formatToIST12Hour(att.punchInTime) : undefined);

      const resolvedPunchOut = (att?.punchOutTime && att?.updatedAt && !isNaN(new Date(att.updatedAt).getTime()))
        ? formatToIST12Hour(new Date(att.updatedAt))
        : (att?.punchOutTime ? formatToIST12Hour(att.punchOutTime) : undefined);

      const s1In = att?.shift1PunchInTime ? formatToIST12Hour(att.shift1PunchInTime) : resolvedPunchIn;
      const s1Out = att?.shift1PunchOutTime ? formatToIST12Hour(att.shift1PunchOutTime) : (shiftType === "SINGLE_STRICT" ? resolvedPunchOut : undefined);
      const s2In = att?.shift2PunchInTime ? formatToIST12Hour(att.shift2PunchInTime) : undefined;
      const s2Out = att?.shift2PunchOutTime ? formatToIST12Hour(att.shift2PunchOutTime) : (shiftType === "MULTI_STRICT" && resolvedPunchOut !== s1Out ? resolvedPunchOut : undefined);

      return {
        date: dateIso,
        dayNum,
        dayName,
        monthShort,
        isSunday,
        isToday,
        isFuture,
        shiftType,
        shiftHours,
        dailyHours,
        shift1Start,
        shift1End,
        shift1PunchInTime: s1In,
        shift1PunchInLocation: att?.shift1PunchInLocation || (shiftType === "SINGLE_STRICT" ? att?.punchInLocation : undefined),
        shift1PunchInPhoto: att?.shift1PunchInPhoto || (shiftType === "SINGLE_STRICT" ? att?.punchInPhoto : undefined),
        shift1PunchOutTime: s1Out,
        shift1PunchOutLocation: att?.shift1PunchOutLocation || (shiftType === "SINGLE_STRICT" ? att?.punchOutLocation : undefined),
        shift1PunchOutPhoto: att?.shift1PunchOutPhoto || (shiftType === "SINGLE_STRICT" ? att?.punchOutPhoto : undefined),
        shift2Start: shiftType === "MULTI_STRICT" ? shift2Start : undefined,
        shift2End: shiftType === "MULTI_STRICT" ? shift2End : undefined,
        shift2PunchInTime: s2In,
        shift2PunchInLocation: att?.shift2PunchInLocation,
        shift2PunchInPhoto: att?.shift2PunchInPhoto,
        shift2PunchOutTime: s2Out,
        shift2PunchOutLocation: att?.shift2PunchOutLocation,
        shift2PunchOutPhoto: att?.shift2PunchOutPhoto,
        punchInTime: resolvedPunchIn,
        punchInLocation: att?.punchInLocation,
        punchInPhoto: att?.punchInPhoto,
        punchOutTime: resolvedPunchOut,
        punchOutLocation: att?.punchOutLocation,
        punchOutPhoto: att?.punchOutPhoto,
        punches: att?.punches || [],
        workingHours: workingHoursStr,
        status,
        lateMinutes: att?.lateMinutes,
        leaveType: leave?.leaveType,
        leaveReason: leave?.reason,
      };
    });

    const totalHoursStr = formatMinutesToHours(totalMinutesWorked);

    return {
      employee: {
        id: emp?.id || staffId,
        name: empName,
        category: emp?.category || "STAFF",
        role,
        branch,
        phone: emp?.phone,
        shiftType,
        shiftHours,
        dailyHours,
        shift1Start,
        shift1End,
        shift2Start,
        shift2End,
        graceMinutes,
      },
      summary: {
        totalDays: dateList.length,
        presentDays,
        lateDays,
        halfDays,
        leaveDays,
        absentDays,
        weeklyOffs,
        totalWorkingHours: totalHoursStr === "-" ? "0 hrs" : totalHoursStr,
      },
      logs,
    };
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

export const INITIAL_STAFF_LEAVES: StaffLeaveRecord[] = [
  {
    id: "LV-101",
    staffId: "STF-01",
    staffName: "Anil Kumar M",
    branch: "KPHB Branch",
    leaveType: "Sick",
    fromDate: "12-11-2026",
    toDate: "13-11-2026",
    joiningDate: "14-11-2026",
    reason: "Severe viral fever, doctor advised 2 days bed rest",
    status: "Pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: "LV-102",
    staffId: "DOC-02",
    staffName: "Dr. Padma Priya",
    branch: "KPHB Branch",
    leaveType: "Casual",
    fromDate: "15-11-2026",
    toDate: "16-11-2026",
    joiningDate: "17-11-2026",
    reason: "Family wedding event in native village",
    status: "Pending",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "LV-103",
    staffId: "STF-04",
    staffName: "P. Sunitha",
    branch: "Chandanagar Branch",
    leaveType: "Privilege",
    fromDate: "18-11-2026",
    toDate: "20-11-2026",
    joiningDate: "21-11-2026",
    reason: "Annual privilege leave for child examinations",
    status: "Approved",
    reviewedBy: "Admin",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

function loadStaffLeavesFromDisk(): StaffLeaveRecord[] {
  try {
    const file = getStaffLeavesCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Failed reading staff leaves cache:", e);
  }
  saveStaffLeavesToDisk(INITIAL_STAFF_LEAVES);
  return [...INITIAL_STAFF_LEAVES];
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

// ============================================================================
// PACKAGE MEMBERS SERVICE
// ============================================================================

function getPackageMembersCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "package_members_store.json"))) {
    return path.join(webCache, "package_members_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "package_members_store.json"))) {
    return path.join(rootCache, "package_members_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "package_members_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".package_members_store.json");
    }
  }
  return path.join(rootCache, "package_members_store.json");
}

function loadPackageMembersFromDisk(): PackageMemberRecord[] {
  try {
    const file = getPackageMembersCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to load package members from cache:", err);
  }
  return [];
}

function savePackageMembersToDisk(data: PackageMemberRecord[]): void {
  const file = getPackageMembersCachePath();
  safeAtomicWrite(file, data);
  try {
    if (fs.existsSync(file)) {
      global.__sphPackageMembersLastMtime = fs.statSync(file).mtimeMs;
    }
  } catch {}
}

function resolvePackageBranch(branch?: string, regId?: string, phone?: string): string {
  let b = (branch || "").trim();
  const isGeneric = !b || /^(clinic|clinic branch|spiritual|spiritual homeopathy|all|all branches)$/i.test(b);
  if (!isGeneric) {
    return b;
  }
  const cleanReg = (regId || "").toUpperCase();
  if (cleanReg.includes("KPB") || cleanReg.includes("KPHB")) return "Kphb Branch";
  if (cleanReg.includes("CHN") || cleanReg.includes("CHANDANAGAR")) return "Chandanagar Branch";
  if (cleanReg.includes("NLG") || cleanReg.includes("NALLAGANDLA")) return "Nallagandla Branch";
  if (cleanReg.includes("DNR") || cleanReg.includes("DSNR") || cleanReg.includes("DILSHUK")) return "Dilshuknagar Branch";

  try {
    const cleanPhone = normalizePhone(phone || "");
    if (cleanPhone.length >= 10) {
      const patients = getPatientsStore();
      const pat = patients.find(
        (p) =>
          normalizePhone(p.phone).slice(-10) === cleanPhone.slice(-10) &&
          p.branch &&
          !/^(clinic|spiritual|all)/i.test(p.branch)
      );
      if (pat && pat.branch) return pat.branch;
      const appts = getAppointmentsStore();
      const apt = appts.find(
        (a) =>
          normalizePhone(a.phone || "").slice(-10) === cleanPhone.slice(-10) &&
          a.branch &&
          !/^(clinic|spiritual|all)/i.test(a.branch)
      );
      if (apt && apt.branch) return apt.branch;
    }
  } catch {}

  return b || "Kphb Branch";
}

function syncPackagesFromAppointmentsAndPatients(store: PackageMemberRecord[]): boolean {
  let modified = false;
  try {
    const appts = getAppointmentsStore();
    for (const a of appts) {
      if (a.hasPackage || (a.packageTotalAmount && a.packageTotalAmount > 0) || a.packageName) {
        const cleanReg = (a.registrationId || "").trim().toUpperCase();
        const cleanPhone = normalizePhone(a.phone || "");
        const cleanName = (a.patientName || "").trim();
        const exists = store.some((p) => {
          if (cleanReg && isExplicitRegId(cleanReg) && isExplicitRegId(p.registrationId) && (p.registrationId || "").trim().toUpperCase() === cleanReg) return true;
          if (cleanPhone.length >= 10 && normalizePhone(p.phone).slice(-10) === cleanPhone.slice(-10) && matchPatientProfile(a, p)) return true;
          if (a.packageId && p.id === a.packageId) return true;
          return false;
        });

        if (!exists && cleanName && (cleanPhone.length >= 10 || cleanReg)) {
          const duration = Math.max(1, Math.min(7, a.packageDurationMonths || 3));
          const total = Math.max(0, a.packageTotalAmount || 0);
          const paid = Math.max(0, a.packagePaidAmount || 0);
          const pending = typeof a.packagePendingAmount === "number" ? a.packagePendingAmount : Math.max(0, total - paid);
          const branch = resolvePackageBranch(a.branch, cleanReg, cleanPhone);

          const now = new Date(a.createdAt || Date.now());
          const startYmd = a.appointmentDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          let endYmd = a.packageEndDate || "";
          if (!endYmd) {
            const endD = new Date(now.getFullYear(), now.getMonth() + duration, now.getDate());
            endYmd = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, "0")}-${String(endD.getDate()).padStart(2, "0")}`;
          }

          const newPkg: PackageMemberRecord = {
            id: a.packageId || `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            registrationId: cleanReg,
            patientName: cleanName,
            phone: cleanPhone,
            branch,
            packageName: a.packageName || `${duration} Month${duration > 1 ? "s" : ""} Treatment Package`,
            durationMonths: duration,
            startDate: startYmd,
            endDate: endYmd,
            totalAmount: total,
            paidAmount: paid,
            pendingAmount: pending,
            status: pending === 0 && total > 0 ? "COMPLETED" : "ACTIVE",
            payments: paid > 0 ? [{
              id: `pay_${Date.now()}_init`,
              amount: paid,
              paidAt: a.createdAt || new Date().toISOString(),
              paymentMethod: a.paymentMethod || "CASH",
              appointmentId: a.id,
              notes: "Initial Package Payment",
            }] : [],
            createdAt: a.createdAt || new Date().toISOString(),
          };

          store.unshift(newPkg);
          modified = true;
        }
      }
    }
  } catch (err) {
    console.warn("syncPackagesFromAppointmentsAndPatients error:", err);
  }
  return modified;
}

function getPackageMembersStore(): PackageMemberRecord[] {
  const file = getPackageMembersCachePath();
  let mtime = 0;
  try {
    if (fs.existsSync(file)) {
      mtime = fs.statSync(file).mtimeMs;
    }
  } catch {}

  if (
    !global.__sphPackageMembersStore ||
    !global.__sphPackageMembersLastMtime ||
    (mtime > 0 && mtime > global.__sphPackageMembersLastMtime)
  ) {
    global.__sphPackageMembersStore = loadPackageMembersFromDisk();
    global.__sphPackageMembersLastMtime = mtime;

    // Check if backfill is needed from appointments and patients
    if (syncPackagesFromAppointmentsAndPatients(global.__sphPackageMembersStore)) {
      savePackageMembersToDisk(global.__sphPackageMembersStore);
    }
  }
  return global.__sphPackageMembersStore;
}

export const packageService = {
  async getAllPackageMembers(branch?: string): Promise<PackageMemberRecord[]> {
    let list = getPackageMembersStore();
    let hasResolved = false;
    for (const p of list) {
      if (!p.branch || /^(clinic|clinic branch|spiritual|spiritual homeopathy|all|all branches)$/i.test((p.branch || "").trim())) {
        const resolved = resolvePackageBranch(p.branch, p.registrationId, p.phone);
        if (resolved && resolved !== p.branch) {
          p.branch = resolved;
          hasResolved = true;
        }
      }
    }
    if (hasResolved) {
      savePackageMembersToDisk(list);
    }

    if (branch) {
      const cleanTarget = normalizeBranchName(branch);
      if (cleanTarget && cleanTarget !== "all branches" && cleanTarget !== "all") {
        list = list.filter((p) => {
          const pb = normalizeBranchName(p.branch);
          if (pb === cleanTarget || pb.includes(cleanTarget) || cleanTarget.includes(pb)) return true;
          const regB = normalizeBranchName(p.registrationId || "");
          if (regB === cleanTarget) return true;
          return false;
        });
      }
    }
    return list;
  },

  async getPackageByProfile(regIdOrPhone: string, patientName?: string): Promise<PackageMemberRecord | null> {
    const store = getPackageMembersStore();
    const isPhone = /^\d{10}$/.test(normalizePhone(regIdOrPhone));
    const cleanReg = !isPhone && isExplicitRegId(regIdOrPhone) ? regIdOrPhone.trim().toUpperCase() : "";
    const cleanPhone = normalizePhone(regIdOrPhone);
    const normName = normalizePatientName(patientName || "");

    // 1. If valid explicit registration ID is provided, match by registration ID:
    if (cleanReg) {
      const found = store.find((p) => isExplicitRegId(p.registrationId) && (p.registrationId || "").trim().toUpperCase() === cleanReg);
      if (found) return found;
    }

    // 2. If phone is provided, we MUST match BOTH phone AND exact patient name!
    // A package must NEVER be returned for a phone number alone without matching the exact patient name!
    if (cleanPhone.length >= 10 && normName) {
      const found = store.find((p) => {
        const pPhone = normalizePhone(p.phone);
        if (pPhone.slice(-10) !== cleanPhone.slice(-10)) return false;
        return matchPatientProfile({ phone: cleanPhone, patientName }, p);
      });
      if (found) return found;
    }

    return null;
  },

  async registerPackage(data: {
    registrationId: string;
    patientName: string;
    phone: string;
    branch: string;
    durationMonths: number;
    totalAmount: number;
    initialPaidAmount?: number;
    paymentMethod?: string;
    appointmentId?: string;
    notes?: string;
  }): Promise<PackageMemberRecord> {
    const store = getPackageMembersStore();
    const cleanReg = (data.registrationId || "").trim().toUpperCase();
    const cleanPhone = normalizePhone(data.phone);
    const cleanName = data.patientName.trim();
    const cleanBranch = resolvePackageBranch(data.branch, cleanReg, cleanPhone);
    const duration = Math.max(1, Math.min(7, data.durationMonths || 1));
    const total = Math.max(0, data.totalAmount || 0);
    const initialPaid = Math.max(0, data.initialPaidAmount || 0);
    const pending = Math.max(0, total - initialPaid);

    const now = new Date();
    const startYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const endDateObj = new Date(now.getFullYear(), now.getMonth() + duration, now.getDate());
    const endYmd = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, "0")}-${String(endDateObj.getDate()).padStart(2, "0")}`;

    const payments: PackagePaymentRecord[] = [];
    if (initialPaid > 0) {
      payments.push({
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        amount: initialPaid,
        paidAt: new Date().toISOString(),
        paymentMethod: data.paymentMethod || "CASH",
        appointmentId: data.appointmentId,
        notes: data.notes || "Initial Package Down Payment",
      });
    }

    const packageName = `${duration} Month${duration > 1 ? "s" : ""} Treatment Package`;

    const existingIdx = store.findIndex((p) => matchPatientProfile(data, p));
    if (existingIdx !== -1) {
      const existing = store[existingIdx];
      const isStillActive = existing.status === "ACTIVE" && (!existing.endDate || existing.endDate >= startYmd);
      if (isStillActive) {
        throw new Error(
          `Patient ${data.patientName} already has an active package (${existing.packageName}) valid till ${existing.endDate}. Another package cannot be registered until the current package expires.`
        );
      }

      const updated: PackageMemberRecord = {
        ...store[existingIdx],
        packageName,
        durationMonths: duration,
        startDate: startYmd,
        endDate: endYmd,
        totalAmount: total,
        paidAmount: initialPaid,
        pendingAmount: pending,
        status: "ACTIVE",
        payments: payments.length > 0 ? payments : store[existingIdx].payments,
        updatedAt: new Date().toISOString(),
      };
      store[existingIdx] = updated;
      global.__sphPackageMembersStore = store;
      savePackageMembersToDisk(store);

      const patients = getPatientsStore();
      const pIdx = patients.findIndex((p) => matchPatientProfile(data, p));
      if (pIdx !== -1) {
        patients[pIdx].hasPackage = true;
        patients[pIdx].activePackageId = updated.id;
        patients[pIdx].activePackageName = updated.packageName;
        global.__sphPatientsStore = patients;
        savePatientsToDisk(patients);
      }

      // Sync active package to existing appointments for this patient
      const appts = getAppointmentsStore();
      let apptsModified = false;
      for (const a of appts) {
        if ((data.appointmentId && (a.id === data.appointmentId || a.token === data.appointmentId)) || matchPatientProfile(a, updated)) {
          a.hasPackage = true;
          a.packageId = updated.id;
          a.packageName = updated.packageName;
          a.packageTotalAmount = updated.totalAmount;
          a.packagePaidAmount = updated.paidAmount;
          a.packagePendingAmount = updated.pendingAmount;
          a.packageDurationMonths = updated.durationMonths;
          a.packageEndDate = updated.endDate;
          apptsModified = true;
        }
      }
      if (apptsModified) {
        global.__sphAppointmentsStore = appts;
        saveAppointmentsToDisk(appts);
      }

      try {
        if (initialPaid > 0 || duration > 0) {
          await revenueQualityService.recordPayment({
            branch: cleanBranch,
            patientId: cleanReg || cleanPhone,
            amount: initialPaid,
            durationMonths: duration,
            paidAt: new Date().toISOString(),
            planId: updated.id,
            isInitialPlan: true,
          });

          await planSpreadService.recordPlanPayment({
            planId: updated.id,
            branch: cleanBranch,
            patientId: cleanReg || cleanPhone,
            amount: initialPaid,
            durationMonths: duration,
            paidAt: new Date().toISOString(),
            isInstallment: false,
          });
        }
      } catch (err) {
        console.warn("Failed recording revenue metrics for registerPackage (renewal):", err);
      }

      return updated;
    }

    const newPkg: PackageMemberRecord = {
      id: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      registrationId: cleanReg,
      patientName: cleanName,
      phone: cleanPhone,
      branch: cleanBranch,
      packageName,
      durationMonths: duration,
      startDate: startYmd,
      endDate: endYmd,
      totalAmount: total,
      paidAmount: initialPaid,
      pendingAmount: pending,
      status: "ACTIVE",
      payments,
      createdAt: new Date().toISOString(),
    };

    store.unshift(newPkg);
    global.__sphPackageMembersStore = store;
    savePackageMembersToDisk(store);

    const patients = getPatientsStore();
    const pIdx = patients.findIndex((p) => matchPatientProfile(data, p));
    if (pIdx !== -1) {
      patients[pIdx].hasPackage = true;
      patients[pIdx].activePackageId = newPkg.id;
      patients[pIdx].activePackageName = newPkg.packageName;
      global.__sphPatientsStore = patients;
      savePatientsToDisk(patients);
    }

    // Sync active package to existing appointments for this patient
    const appts = getAppointmentsStore();
    let apptsModified = false;
    for (const a of appts) {
      if ((data.appointmentId && (a.id === data.appointmentId || a.token === data.appointmentId)) || matchPatientProfile(a, newPkg)) {
        a.hasPackage = true;
        a.packageId = newPkg.id;
        a.packageName = newPkg.packageName;
        a.packageTotalAmount = newPkg.totalAmount;
        a.packagePaidAmount = newPkg.paidAmount;
        a.packagePendingAmount = newPkg.pendingAmount;
        a.packageDurationMonths = newPkg.durationMonths;
        a.packageEndDate = newPkg.endDate;
        apptsModified = true;
      }
    }
    if (apptsModified) {
      global.__sphAppointmentsStore = appts;
      saveAppointmentsToDisk(appts);
    }

    try {
      if (initialPaid > 0 || duration > 0) {
        await revenueQualityService.recordPayment({
          branch: cleanBranch,
          patientId: cleanReg || cleanPhone,
          amount: initialPaid,
          durationMonths: duration,
          paidAt: newPkg.createdAt,
          planId: newPkg.id,
          isInitialPlan: true,
        });

        await planSpreadService.recordPlanPayment({
          planId: newPkg.id,
          branch: cleanBranch,
          patientId: cleanReg || cleanPhone,
          amount: initialPaid,
          durationMonths: duration,
          paidAt: newPkg.createdAt,
          isInstallment: false,
        });
      }
    } catch (err) {
      console.warn("Failed recording revenue metrics for registerPackage:", err);
    }

    return newPkg;
  },

  async recordPackagePayment(
    packageIdOrRegId: string,
    data: {
      amount: number;
      paymentMethod: string;
      appointmentId?: string;
      invoiceId?: string;
      notes?: string;
    }
  ): Promise<PackageMemberRecord | null> {
    const store = getPackageMembersStore();
    const cleanId = packageIdOrRegId.trim().toUpperCase();
    const idx = store.findIndex(
      (p) => p.id === packageIdOrRegId || (p.registrationId || "").trim().toUpperCase() === cleanId
    );
    if (idx === -1) return null;

    const pkg = store[idx];
    const newPayment: PackagePaymentRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amount: Math.max(0, data.amount),
      paidAt: new Date().toISOString(),
      paymentMethod: data.paymentMethod || "CASH",
      appointmentId: data.appointmentId,
      invoiceId: data.invoiceId,
      notes: data.notes,
    };

    const newPaid = pkg.paidAmount + newPayment.amount;
    const newPending = Math.max(0, pkg.totalAmount - newPaid);

    pkg.paidAmount = newPaid;
    pkg.pendingAmount = newPending;
    pkg.payments = [newPayment, ...(pkg.payments || [])];
    pkg.updatedAt = new Date().toISOString();
    if (newPending === 0) {
      pkg.status = "COMPLETED";
    }

    store[idx] = pkg;
    global.__sphPackageMembersStore = store;
    savePackageMembersToDisk(store);

    // Sync updated paid/pending amounts to appointments store
    const appts = getAppointmentsStore();
    let apptsModified = false;
    for (const a of appts) {
      if (matchPatientProfile(a, pkg)) {
        a.packagePaidAmount = pkg.paidAmount;
        a.packagePendingAmount = pkg.pendingAmount;
        apptsModified = true;
      }
    }
    if (apptsModified) {
      global.__sphAppointmentsStore = appts;
      saveAppointmentsToDisk(appts);
    }

    try {
      if (newPayment.amount > 0) {
        await revenueQualityService.recordPayment({
          branch: pkg.branch,
          patientId: pkg.registrationId || pkg.phone,
          amount: newPayment.amount,
          durationMonths: 0,
          paidAt: newPayment.paidAt,
          planId: pkg.id,
          isInitialPlan: false,
        });

        await planSpreadService.recordPlanPayment({
          planId: pkg.id,
          branch: pkg.branch,
          patientId: pkg.registrationId || pkg.phone,
          amount: newPayment.amount,
          durationMonths: pkg.durationMonths,
          paidAt: newPayment.paidAt,
          isInstallment: true,
        });
      }
    } catch (err) {
      console.warn("Failed recording revenue metrics for recordPackagePayment:", err);
    }

    return pkg;
  },
};

// ============================================================================
// PAY LATER SERVICE (Partial Payments, Pending Balances, Next Visit Settlement)
// ============================================================================

export interface PayLaterRecord {
  id: string;
  patientId?: string;
  registrationId?: string;
  patientName: string;
  phone: string;
  branch: string;
  appointmentId?: string;
  invoiceId?: string;
  originalBillAmount: number;
  amountPaid: number;
  pendingAmount: number;
  visitDate: string;
  dueDate?: string;
  notes?: string;
  status: "PENDING" | "PARTIALLY_PAID" | "CLEARED";
  clearedAt?: string;
  clearedInvoiceId?: string;
  clearedAppointmentId?: string;
  clearedAmount?: number;
  createdAt: string;
  updatedAt?: string;
}

declare global {
  var __sphPayLaterStore: PayLaterRecord[] | undefined;
}

function getPayLaterCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "pay_later_store.json"))) {
    return path.join(webCache, "pay_later_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "pay_later_store.json"))) {
    return path.join(rootCache, "pay_later_store.json");
  }
  return path.join(webCache, "pay_later_store.json");
}

function savePayLaterToDisk(store: PayLaterRecord[]): void {
  try {
    const filePath = getPayLaterCachePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.warn("Failed to persist pay later store to disk:", err);
  }
}

function getPayLaterStore(): PayLaterRecord[] {
  if (global.__sphPayLaterStore && Array.isArray(global.__sphPayLaterStore)) {
    return global.__sphPayLaterStore;
  }
  const filePath = getPayLaterCachePath();
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        global.__sphPayLaterStore = parsed;
        return parsed;
      }
    } catch {}
  }
  global.__sphPayLaterStore = [];
  return [];
}

export const payLaterService = {
  async getAll(branch?: string, status?: string): Promise<PayLaterRecord[]> {
    let store = getPayLaterStore();
    if (branch && branch !== "ALL") {
      const cleanBranch = branch.toLowerCase().replace(/branch/gi, "").trim();
      store = store.filter((item) => {
        const itemBranch = item.branch.toLowerCase().replace(/branch/gi, "").trim();
        return itemBranch === cleanBranch || cleanBranch.includes(itemBranch) || itemBranch.includes(cleanBranch);
      });
    }
    if (status && status !== "ALL") {
      const s = status.toUpperCase();
      store = store.filter((item) => item.status === s);
    }
    return store;
  },

  async getPendingByPatient(phoneOrRegId: string): Promise<PayLaterRecord[]> {
    const clean = phoneOrRegId.replace(/\D/g, "").slice(-10);
    const store = getPayLaterStore();
    return store.filter((r) => {
      if (r.status === "CLEARED") return false;
      const rPhone = (r.phone || "").replace(/\D/g, "").slice(-10);
      const rReg = (r.registrationId || "").trim().toLowerCase();
      const targetReg = phoneOrRegId.trim().toLowerCase();
      return (clean && rPhone === clean) || (rReg && rReg === targetReg);
    });
  },

  async createPayLater(
    data: Omit<PayLaterRecord, "id" | "createdAt" | "status"> & {
      id?: string;
      status?: "PENDING" | "PARTIALLY_PAID" | "CLEARED";
      createdAt?: string;
    }
  ): Promise<PayLaterRecord> {
    const store = getPayLaterStore();
    const id = data.id || `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord: PayLaterRecord = {
      ...data,
      id,
      status: data.status || "PENDING",
      createdAt: data.createdAt || new Date().toISOString(),
    };
    store.unshift(newRecord);
    global.__sphPayLaterStore = store;
    savePayLaterToDisk(store);
    return newRecord;
  },

  async settleBalance(
    phoneOrRegId: string,
    amountCleared: number,
    clearedInvoiceId?: string,
    clearedAppointmentId?: string
  ): Promise<PayLaterRecord[]> {
    const clean = phoneOrRegId.replace(/\D/g, "").slice(-10);
    const store = getPayLaterStore();
    let remainingToClear = amountCleared;
    const updatedRecords: PayLaterRecord[] = [];

    for (const r of store) {
      if (remainingToClear <= 0) break;
      if (r.status === "CLEARED") continue;

      const rPhone = (r.phone || "").replace(/\D/g, "").slice(-10);
      const rReg = (r.registrationId || "").trim().toLowerCase();
      const targetReg = phoneOrRegId.trim().toLowerCase();
      const matches = (clean && rPhone === clean) || (rReg && rReg === targetReg);

      if (matches) {
        if (remainingToClear >= r.pendingAmount) {
          remainingToClear -= r.pendingAmount;
          r.clearedAmount = (r.clearedAmount || 0) + r.pendingAmount;
          r.pendingAmount = 0;
          r.status = "CLEARED";
          r.clearedAt = new Date().toISOString();
          r.clearedInvoiceId = clearedInvoiceId;
          r.clearedAppointmentId = clearedAppointmentId;
        } else {
          r.pendingAmount -= remainingToClear;
          r.clearedAmount = (r.clearedAmount || 0) + remainingToClear;
          r.status = "PARTIALLY_PAID";
          r.updatedAt = new Date().toISOString();
          remainingToClear = 0;
        }
        updatedRecords.push(r);
      }
    }

    if (updatedRecords.length > 0) {
      global.__sphPayLaterStore = store;
      savePayLaterToDisk(store);
    }
    return updatedRecords;
  },

  async manualSettle(
    id: string,
    amount: number,
    clearedInvoiceId?: string,
    paymentMode?: string,
    notes?: string
  ): Promise<PayLaterRecord | null> {
    const store = getPayLaterStore();
    const item = store.find((r) => r.id === id);
    if (!item) return null;

    if (amount >= item.pendingAmount) {
      item.clearedAmount = (item.clearedAmount || 0) + item.pendingAmount;
      item.pendingAmount = 0;
      item.status = "CLEARED";
      item.clearedAt = new Date().toISOString();
      item.clearedInvoiceId = clearedInvoiceId || `REC-CLR-${Date.now().toString().slice(-6)}`;
    } else {
      item.pendingAmount -= amount;
      item.clearedAmount = (item.clearedAmount || 0) + amount;
      item.status = "PARTIALLY_PAID";
      item.updatedAt = new Date().toISOString();
    }
    if (paymentMode) {
      (item as any).paymentMode = paymentMode;
    }
    if (notes) {
      item.notes = notes;
    }

    global.__sphPayLaterStore = store;
    savePayLaterToDisk(store);

    // Sync to patient profile
    const patients = getPatientsStore();
    const patIdx = patients.findIndex((p) => {
      const pPhone = (p.phone || "").replace(/\D/g, "").slice(-10);
      const rPhone = (item.phone || "").replace(/\D/g, "").slice(-10);
      return pPhone === rPhone;
    });
    if (patIdx !== -1) {
      const currentBal = Number(patients[patIdx].pendingBalance) || 0;
      patients[patIdx].pendingBalance = Math.max(0, currentBal - amount);
      global.__sphPatientsStore = patients;
      savePatientsToDisk(patients);
    }

    try {
      if (amount > 0) {
        await revenueQualityService.recordPayment({
          branch: item.branch,
          patientId: item.registrationId || item.phone,
          amount: amount,
          durationMonths: 0,
          paidAt: new Date().toISOString(),
          planId: item.id,
          isInitialPlan: false,
        });

        await planSpreadService.recordPlanPayment({
          planId: item.id,
          branch: item.branch,
          patientId: item.registrationId || item.phone,
          amount: amount,
          durationMonths: 1,
          paidAt: new Date().toISOString(),
          isInstallment: true,
        });
      }
    } catch (err) {
      console.warn("Failed recording revenue metrics for manualSettle:", err);
    }

    return item;
  },

  async deletePayLater(id: string): Promise<boolean> {
    let store = getPayLaterStore();
    const idx = store.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    const item = store[idx];
    const remainingPending = item.status !== "CLEARED" ? Number(item.pendingAmount) || 0 : 0;

    store.splice(idx, 1);
    global.__sphPayLaterStore = store;
    savePayLaterToDisk(store);

    // Sync pendingBalance back on patient profile if there was an unsettled amount
    if (remainingPending > 0 && item.phone) {
      try {
        const patients = getPatientsStore();
        const rPhone = (item.phone || "").replace(/\D/g, "").slice(-10);
        const patIdx = patients.findIndex((p) => {
          const pPhone = (p.phone || "").replace(/\D/g, "").slice(-10);
          return rPhone && pPhone === rPhone;
        });
        if (patIdx !== -1) {
          const currentBal = Number(patients[patIdx].pendingBalance) || 0;
          patients[patIdx].pendingBalance = Math.max(0, currentBal - remainingPending);
          global.__sphPatientsStore = patients;
          savePatientsToDisk(patients);
        }
      } catch (_) {}
    }

    return true;
  },

  async getSummary(branch?: string) {
    const store = getPayLaterStore();
    const filtered = branch && branch !== "ALL"
      ? store.filter((r) => {
          const itemBranch = r.branch.toLowerCase().replace(/branch/gi, "").trim();
          const cleanBranch = branch.toLowerCase().replace(/branch/gi, "").trim();
          return itemBranch === cleanBranch || cleanBranch.includes(itemBranch);
        })
      : store;

    let totalPendingAmount = 0;
    let totalClearedAmount = 0;
    const uniquePatients = new Set<string>();

    const branchMap: Record<string, { pending: number; cleared: number; count: number }> = {
      "KPHB Branch": { pending: 0, cleared: 0, count: 0 },
      "Chandanagar Branch": { pending: 0, cleared: 0, count: 0 },
      "Dilshuknagar Branch": { pending: 0, cleared: 0, count: 0 },
      "Nallagandla Branch": { pending: 0, cleared: 0, count: 0 },
    };

    for (const r of filtered) {
      const bName = Object.keys(branchMap).find((k) =>
        k.toLowerCase().includes(r.branch.toLowerCase().replace(/branch/gi, "").trim())
      ) || "KPHB Branch";

      if (r.status !== "CLEARED") {
        totalPendingAmount += r.pendingAmount;
        uniquePatients.add(r.phone);
        branchMap[bName].pending += r.pendingAmount;
        branchMap[bName].count += 1;
      }
      totalClearedAmount += r.clearedAmount || 0;
      branchMap[bName].cleared += r.clearedAmount || 0;
    }

    return {
      totalPendingAmount,
      totalClearedAmount,
      totalPendingPatients: uniquePatients.size,
      branchBreakdown: branchMap,
    };
  },
};

// ---------------------------------------------------------------------------
// Telecaller Management & Call Log Service
// ---------------------------------------------------------------------------

export interface TelecallerCallLogRecord {
  id: string;
  telecallerId?: string;
  agentName: string;
  patientName: string;
  phone: string;
  branch: string;
  callOutcome: "Interested" | "Not Interested" | "Callback Requested" | "No Response" | string;
  notes: string;
  dateTime: string;
  duration?: string;
  createdAt: string;
}

export const INITIAL_CALL_LOGS: TelecallerCallLogRecord[] = [
  {
    id: "LOG-901",
    telecallerId: "TC01",
    agentName: "Srikanth Reddy",
    patientName: "K. Ramesh Kumar",
    phone: "9848012345",
    branch: "KPHB Branch",
    callOutcome: "Interested",
    notes: "Patient interested in chronic sinusitis consultation. Recommended Friday 5:00 PM slot.",
    dateTime: "11/11/2026 11:24 AM",
    duration: "3m 45s",
    createdAt: new Date().toISOString(),
  },
  {
    id: "LOG-902",
    telecallerId: "TC02",
    agentName: "Salman Khan",
    patientName: "G. Srilatha",
    phone: "9700112233",
    branch: "Chandanagar Branch",
    callOutcome: "Callback Requested",
    notes: "Currently out of station. Requested call back tomorrow after 3:00 PM.",
    dateTime: "11/11/2026 10:50 AM",
    duration: "2m 10s",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "LOG-903",
    telecallerId: "TC03",
    agentName: "K. Bhavani",
    patientName: "M. Vijay",
    phone: "9911882233",
    branch: "Nallagandla Branch",
    callOutcome: "Not Interested",
    notes: "Current homeopathic course ended, symptoms resolved for now.",
    dateTime: "11/11/2026 10:15 AM",
    duration: "45s",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "LOG-904",
    telecallerId: "TC01",
    agentName: "Srikanth Reddy",
    patientName: "P. Rajesh",
    phone: "9876543210",
    branch: "Dilshuknagar Branch",
    callOutcome: "Interested",
    notes: "Ready for 6-month skin allergy package renewal. Consultation booked.",
    dateTime: "11/11/2026 09:40 AM",
    duration: "4m 10s",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "LOG-905",
    telecallerId: "TC02",
    agentName: "Salman Khan",
    patientName: "T. Ananya",
    phone: "9440112244",
    branch: "KPHB Branch",
    callOutcome: "No Response",
    notes: "Called 2 times, phone ringing no answer. Will retry in evening.",
    dateTime: "11/11/2026 09:10 AM",
    duration: "30s",
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
];

declare global {
  var __sphCallLogsStore: TelecallerCallLogRecord[] | undefined;
}

function getCallLogsCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "telecaller_call_logs.json"))) {
    return path.join(webCache, "telecaller_call_logs.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "telecaller_call_logs.json"))) {
    return path.join(rootCache, "telecaller_call_logs.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "telecaller_call_logs.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".telecaller_call_logs.json");
    }
  }
  return path.join(rootCache, "telecaller_call_logs.json");
}

function loadCallLogsFromDisk(): TelecallerCallLogRecord[] {
  try {
    const file = getCallLogsCachePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Failed to read telecaller call logs cache:", err);
  }
  saveCallLogsToDisk(INITIAL_CALL_LOGS);
  return [...INITIAL_CALL_LOGS];
}

function saveCallLogsToDisk(data: TelecallerCallLogRecord[]): void {
  try {
    const file = getCallLogsCachePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write telecaller call logs cache:", err);
  }
}

function getCallLogsStore(): TelecallerCallLogRecord[] {
  if (!global.__sphCallLogsStore) {
    global.__sphCallLogsStore = loadCallLogsFromDisk();
  }
  return global.__sphCallLogsStore;
}

export const telecallerCallLogService = {
  async getAllLogs(filters?: {
    search?: string;
    branch?: string;
    outcome?: string;
    telecallerId?: string;
  }): Promise<TelecallerCallLogRecord[]> {
    const store = getCallLogsStore();
    let result = [...store];

    if (filters?.telecallerId && filters.telecallerId !== "ALL") {
      result = result.filter(
        (l) => l.telecallerId?.toLowerCase() === filters.telecallerId?.toLowerCase()
      );
    }

    if (filters?.branch && filters.branch !== "ALL" && filters.branch !== "All Branches") {
      const cleanBranch = filters.branch.toLowerCase().replace(/branch/gi, "").trim();
      result = result.filter((l) =>
        l.branch.toLowerCase().replace(/branch/gi, "").trim().includes(cleanBranch)
      );
    }

    if (filters?.outcome && filters.outcome !== "ALL" && filters.outcome !== "All Outcomes") {
      result = result.filter(
        (l) => l.callOutcome?.toLowerCase() === filters.outcome?.toLowerCase()
      );
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.patientName?.toLowerCase().includes(q) ||
          l.phone?.includes(q) ||
          l.agentName?.toLowerCase().includes(q) ||
          l.notes?.toLowerCase().includes(q) ||
          l.id?.toLowerCase().includes(q)
      );
    }

    return result;
  },

  async createLog(input: Partial<TelecallerCallLogRecord>): Promise<TelecallerCallLogRecord> {
    const store = getCallLogsStore();
    const cleanPhone = (input.phone || "").replace(/\D/g, "").slice(-10);
    const newRecord: TelecallerCallLogRecord = {
      id: input.id || `LOG-${Date.now().toString().slice(-6)}`,
      telecallerId: input.telecallerId || "TC01",
      agentName: input.agentName ? input.agentName.trim() : "Telecaller",
      patientName: input.patientName ? input.patientName.trim() : "Patient",
      phone: cleanPhone,
      branch: input.branch ? input.branch.trim() : "KPHB Branch",
      callOutcome: input.callOutcome || "Interested",
      notes: input.notes ? input.notes.trim() : "",
      dateTime: input.dateTime || new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }),
      duration: input.duration || "",
      createdAt: new Date().toISOString(),
    };

    store.unshift(newRecord);
    global.__sphCallLogsStore = store;
    saveCallLogsToDisk(store);
    return newRecord;
  },

  async deleteLog(id: string): Promise<boolean> {
    const store = getCallLogsStore();
    const idx = store.findIndex((l) => l.id === id);
    if (idx === -1) return false;
    store.splice(idx, 1);
    global.__sphCallLogsStore = store;
    saveCallLogsToDisk(store);
    return true;
  },

  async getStats() {
    const store = getCallLogsStore();
    return {
      total: store.length,
      interested: store.filter((l) => l.callOutcome === "Interested").length,
      callback: store.filter((l) => l.callOutcome === "Callback Requested" || l.callOutcome === "Callback").length,
      notInterested: store.filter((l) => l.callOutcome === "Not Interested").length,
      noResponse: store.filter((l) => l.callOutcome === "No Response").length,
    };
  },
};

// ==========================================
// SHARED MEDIA SYSTEM (Global All-Branches)
// ==========================================

export interface SharedMediaLink {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  createdBy?: string;
  createdBranch?: string;
}

export interface SharedMediaFolder {
  id: string;
  name: string;
  description?: string;
  color?: string; // e.g. "sky", "emerald", "amber", "indigo", "rose", "purple"
  createdAt: string;
  createdBy?: string;
  createdBranch?: string;
  links: SharedMediaLink[];
}

declare global {
  var __sphSharedMediaStore: SharedMediaFolder[] | undefined;
}

export const INITIAL_SHARED_MEDIA_FOLDERS: SharedMediaFolder[] = [
  {
    id: "folder-diet-guides",
    name: "Diet & Nutrition Guides",
    description: "Standard clinic diet recommendations and healthy food charts",
    color: "emerald",
    createdAt: new Date().toISOString(),
    createdBy: "Clinical Admin",
    createdBranch: "Head Office",
    links: [
      {
        id: "link-general-diet",
        name: "General Chronic Care Diet Chart",
        url: "https://drive.google.com/file/d/sample-diet-guide/view",
        createdAt: new Date().toISOString(),
        createdBy: "Head Office",
        createdBranch: "Head Office",
      },
    ],
  },
  {
    id: "folder-exercise-physio",
    name: "Exercise & Physiotherapy",
    description: "Rehabilitation and physical movement reference videos",
    color: "sky",
    createdAt: new Date().toISOString(),
    createdBy: "Clinical Admin",
    createdBranch: "Head Office",
    links: [],
  },
  {
    id: "folder-test-templates",
    name: "Lab Test Templates & Forms",
    description: "Common diagnostic requisition forms and testing guidelines",
    color: "indigo",
    createdAt: new Date().toISOString(),
    createdBy: "Clinical Admin",
    createdBranch: "Head Office",
    links: [],
  },
  {
    id: "folder-patient-brochures",
    name: "Patient Education & FAQs",
    description: "Homeopathic treatment awareness and medicine dosage guidelines",
    color: "amber",
    createdAt: new Date().toISOString(),
    createdBy: "Clinical Admin",
    createdBranch: "Head Office",
    links: [],
  },
];

function getSharedMediaCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "shared_media_store.json"))) {
    return path.join(webCache, "shared_media_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "shared_media_store.json"))) {
    return path.join(rootCache, "shared_media_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "shared_media_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".shared_media_store.json");
    }
  }
  return path.join(rootCache, "shared_media_store.json");
}

function saveSharedMediaToDisk(data: SharedMediaFolder[]): void {
  const file = getSharedMediaCachePath();
  safeAtomicWrite(file, data);
}

function getSharedMediaStore(): SharedMediaFolder[] {
  if (global.__sphSharedMediaStore && global.__sphSharedMediaStore.length > 0) {
    return global.__sphSharedMediaStore;
  }
  const file = getSharedMediaCachePath();
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        global.__sphSharedMediaStore = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to load shared media from disk:", e);
    }
  }
  const initial = JSON.parse(JSON.stringify(INITIAL_SHARED_MEDIA_FOLDERS));
  global.__sphSharedMediaStore = initial;
  saveSharedMediaToDisk(initial);
  return initial;
}

export const sharedMediaService = {
  async getAllFolders(): Promise<SharedMediaFolder[]> {
    return getSharedMediaStore();
  },

  async createFolder(data: {
    name: string;
    description?: string;
    color?: string;
    createdBy?: string;
    createdBranch?: string;
  }): Promise<SharedMediaFolder> {
    const store = getSharedMediaStore();
    const newFolder: SharedMediaFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      description: data.description ? data.description.trim() : "",
      color: data.color || "sky",
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy || "Reception",
      createdBranch: data.createdBranch || "Clinic",
      links: [],
    };
    store.push(newFolder);
    global.__sphSharedMediaStore = store;
    saveSharedMediaToDisk(store);
    return newFolder;
  },

  async deleteFolder(folderId: string): Promise<boolean> {
    let store = getSharedMediaStore();
    const beforeLen = store.length;
    store = store.filter((f) => f.id !== folderId);
    if (store.length !== beforeLen) {
      global.__sphSharedMediaStore = store;
      saveSharedMediaToDisk(store);
      return true;
    }
    return false;
  },

  async addLinkToFolder(
    folderId: string,
    data: {
      name: string;
      url: string;
      createdBy?: string;
      createdBranch?: string;
    }
  ): Promise<SharedMediaLink | null> {
    const store = getSharedMediaStore();
    const folder = store.find((f) => f.id === folderId);
    if (!folder) return null;

    if (!Array.isArray(folder.links)) {
      folder.links = [];
    }

    const newLink: SharedMediaLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      url: data.url.trim(),
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy || "Reception",
      createdBranch: data.createdBranch || "Clinic",
    };

    folder.links.unshift(newLink);
    global.__sphSharedMediaStore = store;
    saveSharedMediaToDisk(store);
    return newLink;
  },

  async deleteLinkFromFolder(folderId: string, linkId: string): Promise<boolean> {
    const store = getSharedMediaStore();
    const folder = store.find((f) => f.id === folderId);
    if (!folder || !Array.isArray(folder.links)) return false;

    const beforeLen = folder.links.length;
    folder.links = folder.links.filter((l) => l.id !== linkId);
    if (folder.links.length !== beforeLen) {
      global.__sphSharedMediaStore = store;
      saveSharedMediaToDisk(store);
      return true;
    }
    return false;
  },
};

// ==========================================
// BRANCH REVENUE QUALITY & AVERAGE REVENUE
// ==========================================

export interface BranchMonthTotalsRecord {
  id: string;
  branchId: string;
  branchName: string;
  month: string; // 'YYYY-MM' in IST
  revenueTotal: number;
  monthsTotal: number;
  updatedAt: string;
}

export interface BranchMonthPatientsRecord {
  id: string;
  branchId: string;
  branchName: string;
  month: string; // 'YYYY-MM' in IST
  patientId: string;
  revenue: number;
  months: number;
  planIds?: string[];
  firstPaidAt: string;
  updatedAt: string;
}

export interface BranchMetricsResult {
  branch: string;
  fromMonth: string;
  toMonth: string;
  patients: number;
  revenue: number;
  months: number;
  avgDuration: number | null;
  arpu: number | null;
  monthlyRate: number | null;
}

/**
 * Derives YYYY-MM month string strictly in Indian Standard Time (Asia/Kolkata).
 */
export function getISTMonthString(dateInput?: string | Date | number): string {
  try {
    const d = dateInput ? (dateInput instanceof Date ? dateInput : new Date(dateInput)) : new Date();
    if (isNaN(d.getTime())) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    if (year && month) return `${year}-${month}`;
  } catch {}
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Standardizes raw branch string into canonical display name.
 */
export function canonicalBranchName(raw?: string): string {
  const norm = normalizeBranchName(raw || "");
  if (norm.includes("kphb")) return "KPHB Branch";
  if (norm.includes("chanda")) return "Chandanagar Branch";
  if (norm.includes("nalla") || norm.includes("nlg")) return "Nallagandla Branch";
  if (norm.includes("dilshuk") || norm.includes("dilsukh") || norm.includes("dsnr")) return "Dilshuknagar Branch";
  const trimmed = (raw || "").trim();
  return trimmed || "KPHB Branch";
}

/**
 * Parses course or prescription duration string or number into decimal months.
 * Examples:
 * - 3 -> 3.0
 * - "1 Month" -> 1.0
 * - "2 Months" -> 2.0
 * - "15 Days" -> 0.5
 * - "45 Days" -> 1.5
 * - "1 Month & 15 Days" -> 1.5
 * - consultation-only / undefined -> 0
 */
export function parseCourseDurationMonths(raw: any): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") {
    return isNaN(raw) || raw < 0 ? 0 : raw;
  }
  const str = String(raw).trim().toLowerCase();
  if (!str) return 0;

  // Direct number string e.g. "3" or "2.5"
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    return isNaN(num) || num < 0 ? 0 : num;
  }

  let totalMonths = 0;
  let matched = false;

  // Match months
  const monthMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:months?|mos?|mths?)/i);
  if (monthMatch) {
    const val = parseFloat(monthMatch[1]);
    if (!isNaN(val) && val > 0) {
      totalMonths += val;
      matched = true;
    }
  }

  // Match weeks
  const weekMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:weeks?|wks?)/i);
  if (weekMatch) {
    const val = parseFloat(weekMatch[1]);
    if (!isNaN(val) && val > 0) {
      totalMonths += (val * 7) / 30;
      matched = true;
    }
  }

  // Match days
  const dayMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:days?|dys?)/i);
  if (dayMatch) {
    const val = parseFloat(dayMatch[1]);
    if (!isNaN(val) && val > 0) {
      totalMonths += val / 30;
      matched = true;
    }
  }

  if (matched) return Math.round(totalMonths * 10) / 10;

  const leadNum = parseFloat(str);
  if (!isNaN(leadNum) && leadNum > 0 && leadNum <= 12) {
    return leadNum;
  }

  return 0;
}

function getBranchMonthTotalsCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "branch_month_totals_store.json"))) {
    return path.join(webCache, "branch_month_totals_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "branch_month_totals_store.json"))) {
    return path.join(rootCache, "branch_month_totals_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "branch_month_totals_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".branch_month_totals_store.json");
    }
  }
  return path.join(rootCache, "branch_month_totals_store.json");
}

function loadBranchMonthTotalsFromDisk(): BranchMonthTotalsRecord[] {
  try {
    const file = getBranchMonthTotalsCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to load branch month totals from cache:", err);
  }
  return [];
}

function saveBranchMonthTotalsToDisk(data: BranchMonthTotalsRecord[]): void {
  const file = getBranchMonthTotalsCachePath();
  safeAtomicWrite(file, data);
  try {
    if (fs.existsSync(file)) {
      global.__sphBranchMonthTotalsLastMtime = fs.statSync(file).mtimeMs;
    }
  } catch {}
}

function getBranchMonthTotalsStore(): BranchMonthTotalsRecord[] {
  const file = getBranchMonthTotalsCachePath();
  let mtime = 0;
  try {
    if (fs.existsSync(file)) {
      mtime = fs.statSync(file).mtimeMs;
    }
  } catch {}

  if (
    !global.__sphBranchMonthTotalsStore ||
    global.__sphBranchMonthTotalsStore.length === 0 ||
    (mtime > 0 && mtime > (global.__sphBranchMonthTotalsLastMtime || 0))
  ) {
    global.__sphBranchMonthTotalsStore = loadBranchMonthTotalsFromDisk();
    global.__sphBranchMonthTotalsLastMtime = mtime;
  }
  return global.__sphBranchMonthTotalsStore;
}

function getBranchMonthPatientsCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "branch_month_patients_store.json"))) {
    return path.join(webCache, "branch_month_patients_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "branch_month_patients_store.json"))) {
    return path.join(rootCache, "branch_month_patients_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "branch_month_patients_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".branch_month_patients_store.json");
    }
  }
  return path.join(rootCache, "branch_month_patients_store.json");
}

function loadBranchMonthPatientsFromDisk(): BranchMonthPatientsRecord[] {
  try {
    const file = getBranchMonthPatientsCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to load branch month patients from cache:", err);
  }
  return [];
}

function saveBranchMonthPatientsToDisk(data: BranchMonthPatientsRecord[]): void {
  const file = getBranchMonthPatientsCachePath();
  safeAtomicWrite(file, data);
  try {
    if (fs.existsSync(file)) {
      global.__sphBranchMonthPatientsLastMtime = fs.statSync(file).mtimeMs;
    }
  } catch {}
}

function getBranchMonthPatientsStore(): BranchMonthPatientsRecord[] {
  const file = getBranchMonthPatientsCachePath();
  let mtime = 0;
  try {
    if (fs.existsSync(file)) {
      mtime = fs.statSync(file).mtimeMs;
    }
  } catch {}

  if (
    !global.__sphBranchMonthPatientsStore ||
    global.__sphBranchMonthPatientsStore.length === 0 ||
    (mtime > 0 && mtime > (global.__sphBranchMonthPatientsLastMtime || 0))
  ) {
    global.__sphBranchMonthPatientsStore = loadBranchMonthPatientsFromDisk();
    global.__sphBranchMonthPatientsLastMtime = mtime;
  }
  return global.__sphBranchMonthPatientsStore;
}

export const revenueQualityService = {
  /**
   * Records a payment atomically into branch_month_totals and branch_month_patients.
   * - Months rule: plan duration months are counted ONCE per plan, not again for installments.
   * - Revenue is counted as paid.
   * - Consultation-only visits count in Treated Patients & Revenue with 0 months.
   */
  async recordPayment(params: {
    branch: string;
    patientId: string;
    amount: number;
    durationMonths?: number;
    paidAt?: string | Date;
    planId?: string;
    isInitialPlan?: boolean;
  }): Promise<{ total: BranchMonthTotalsRecord; patient: BranchMonthPatientsRecord }> {
    const month = getISTMonthString(params.paidAt);
    const branchId = normalizeBranchName(params.branch || "kphb");
    const branchName = canonicalBranchName(params.branch);
    const cleanPatientId = (params.patientId || "").trim().toUpperCase();
    const amount = Math.max(0, Number(params.amount) || 0);
    const candidateMonths = Math.max(0, Number(params.durationMonths) || 0);

    const totalsStore = getBranchMonthTotalsStore();
    const patientsStore = getBranchMonthPatientsStore();

    // 1. Update or create branch_month_patients row
    let patIdx = patientsStore.findIndex(
      (p) => p.branchId === branchId && p.month === month && p.patientId === cleanPatientId
    );

    let monthsToAdd = 0;
    const nowIso = new Date().toISOString();

    if (patIdx !== -1) {
      const existingPat = patientsStore[patIdx];
      existingPat.revenue = Math.round((existingPat.revenue + amount) * 100) / 100;
      if (!Array.isArray(existingPat.planIds)) {
        existingPat.planIds = [];
      }

      if (params.planId) {
        if (!existingPat.planIds.includes(params.planId)) {
          existingPat.planIds.push(params.planId);
          monthsToAdd = candidateMonths;
          existingPat.months = Math.round((existingPat.months + monthsToAdd) * 10) / 10;
        } else {
          // Already counted months for this planId (e.g. installment), add revenue only
          monthsToAdd = 0;
        }
      } else {
        monthsToAdd = candidateMonths;
        existingPat.months = Math.round((existingPat.months + monthsToAdd) * 10) / 10;
      }
      existingPat.updatedAt = nowIso;
    } else {
      monthsToAdd = candidateMonths;
      const newPat: BranchMonthPatientsRecord = {
        id: `bmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        branchId,
        branchName,
        month,
        patientId: cleanPatientId,
        revenue: Math.round(amount * 100) / 100,
        months: Math.round(monthsToAdd * 10) / 10,
        planIds: params.planId ? [params.planId] : [],
        firstPaidAt: params.paidAt ? new Date(params.paidAt).toISOString() : nowIso,
        updatedAt: nowIso,
      };
      patientsStore.push(newPat);
      patIdx = patientsStore.length - 1;
    }

    // 2. Update or create branch_month_totals row
    let totIdx = totalsStore.findIndex((t) => t.branchId === branchId && t.month === month);
    if (totIdx !== -1) {
      totalsStore[totIdx].revenueTotal = Math.round((totalsStore[totIdx].revenueTotal + amount) * 100) / 100;
      totalsStore[totIdx].monthsTotal = Math.round((totalsStore[totIdx].monthsTotal + monthsToAdd) * 10) / 10;
      totalsStore[totIdx].updatedAt = nowIso;
    } else {
      const newTot: BranchMonthTotalsRecord = {
        id: `bmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        branchId,
        branchName,
        month,
        revenueTotal: Math.round(amount * 100) / 100,
        monthsTotal: Math.round(monthsToAdd * 10) / 10,
        updatedAt: nowIso,
      };
      totalsStore.push(newTot);
      totIdx = totalsStore.length - 1;
    }

    // Save stores to disk
    global.__sphBranchMonthTotalsStore = totalsStore;
    saveBranchMonthTotalsToDisk(totalsStore);

    global.__sphBranchMonthPatientsStore = patientsStore;
    saveBranchMonthPatientsToDisk(patientsStore);

    // Sync to Prisma tables when available
    try {
      if (prisma && (prisma as any).branchMonthTotals) {
        await (prisma as any).branchMonthTotals.upsert({
          where: {
            branch_month_unique: {
              branchId,
              month,
            },
          },
          update: {
            revenueTotal: { increment: amount },
            monthsTotal: { increment: monthsToAdd },
          },
          create: {
            branchId,
            month,
            revenueTotal: amount,
            monthsTotal: monthsToAdd,
          },
        }).catch(() => {});

        await (prisma as any).branchMonthPatients.upsert({
          where: {
            branch_month_patient_unique: {
              branchId,
              month,
              patientId: cleanPatientId,
            },
          },
          update: {
            revenue: { increment: amount },
            months: { increment: monthsToAdd },
          },
          create: {
            branchId,
            month,
            patientId: cleanPatientId,
            revenue: amount,
            months: monthsToAdd,
          },
        }).catch(() => {});
      }
    } catch {}

    return {
      total: totalsStore[totIdx],
      patient: patientsStore[patIdx],
    };
  },

  /**
   * Fast read API: reads ONLY branch_month_totals and branch_month_patients.
   * Under 100ms even with large dataset.
   */
  async getBranchMetrics(params: {
    branch?: string;
    fromMonth?: string;
    toMonth?: string;
  }): Promise<BranchMetricsResult> {
    let totalsStore = getBranchMonthTotalsStore();
    let patientsStore = getBranchMonthPatientsStore();

    // Auto-backfill if store is empty
    if (totalsStore.length === 0 && patientsStore.length === 0) {
      try {
        await this.backfillFromExistingData();
        totalsStore = getBranchMonthTotalsStore();
        patientsStore = getBranchMonthPatientsStore();
      } catch (err) {
        console.warn("Auto-backfill failed:", err);
      }
    }

    const currentMonth = getISTMonthString();
    let fromMonth = (params.fromMonth || currentMonth).trim();
    let toMonth = (params.toMonth || fromMonth).trim();
    if (toMonth < fromMonth) {
      const temp = fromMonth;
      fromMonth = toMonth;
      toMonth = temp;
    }

    const rawBranch = params.branch ? params.branch.trim() : "";
    const cleanBranch = rawBranch ? normalizeBranchName(rawBranch) : null;
    const isAll = !cleanBranch || cleanBranch === "all" || cleanBranch === "allbranches";

    // 1. Calculate Total Revenue & Total Months from totalsStore
    const matchingTotals = totalsStore.filter((t) => {
      if (!isAll && t.branchId !== cleanBranch) return false;
      return t.month >= fromMonth && t.month <= toMonth;
    });

    const totalRevenue = matchingTotals.reduce((sum, t) => sum + (Number(t.revenueTotal) || 0), 0);
    const totalMonths = matchingTotals.reduce((sum, t) => sum + (Number(t.monthsTotal) || 0), 0);

    // 2. Calculate Treated Patients (COUNT DISTINCT patientId) from patientsStore
    const matchingPatients = patientsStore.filter((p) => {
      if (!isAll && p.branchId !== cleanBranch) return false;
      if (p.month < fromMonth || p.month > toMonth) return false;
      return (Number(p.revenue) || 0) > 0 || (Number(p.months) || 0) > 0;
    });

    const distinctPatients = new Set<string>();
    for (const p of matchingPatients) {
      if (p.patientId) {
        distinctPatients.add(p.patientId);
      }
    }
    const treatedPatients = distinctPatients.size;

    // 3. Derived Metrics (null if denominator is zero)
    const avgDuration =
      treatedPatients > 0 ? Number((totalMonths / treatedPatients).toFixed(1)) : null;
    const arpu =
      treatedPatients > 0 ? Math.round(totalRevenue / treatedPatients) : null;
    const monthlyRate =
      totalMonths > 0 ? Math.round(totalRevenue / totalMonths) : null;

    return {
      branch: isAll ? "ALL" : canonicalBranchName(cleanBranch),
      fromMonth,
      toMonth,
      patients: treatedPatients,
      revenue: Math.round(totalRevenue),
      months: Math.round(totalMonths * 10) / 10,
      avgDuration,
      arpu,
      monthlyRate,
    };
  },

  /**
   * Retrieves metrics for all branches individually plus the aggregate ALL.
   */
  async getMultiBranchMetrics(params: {
    fromMonth?: string;
    toMonth?: string;
  }): Promise<{
    all: BranchMetricsResult;
    branches: Record<string, BranchMetricsResult>;
  }> {
    const all = await this.getBranchMetrics({ branch: "ALL", ...params });
    const branches = ["kphb", "chandanagar", "nallagandla", "dilshuknagar"];
    const branchesMap: Record<string, BranchMetricsResult> = {};

    for (const b of branches) {
      const res = await this.getBranchMetrics({ branch: b, ...params });
      branchesMap[b] = res;
    }

    return {
      all,
      branches: branchesMap,
    };
  },

  /**
   * Backfills summary tables from existing appointments, packages, and pay later records.
   */
  async backfillFromExistingData(options?: { reset?: boolean }): Promise<{
    totalRows: number;
    patientRows: number;
  }> {
    if (options?.reset) {
      global.__sphBranchMonthTotalsStore = [];
      saveBranchMonthTotalsToDisk([]);
      global.__sphBranchMonthPatientsStore = [];
      saveBranchMonthPatientsToDisk([]);
    }

    const appts = getAppointmentsStore();
    const pkgs = getPackageMembersStore();
    const payLater = getPayLaterStore();

    // 1. Process appointments
    for (const a of appts) {
      if (a.isDeleted) continue;
      const isPaid = a.isFeeCollected || a.status === "COMPLETED" || (Number(a.totalPaid) || 0) > 0;
      if (!isPaid) continue;

      const dateStr = a.paidAt || a.updatedAt || a.appointmentDate || a.createdAt;
      const branch = (a as any).branchName || a.branch || "KPHB Branch";
      const patientId = a.registrationId || a.phone;
      if (!patientId) continue;

      const paidAmt = Number(a.totalPaid) || 0;
      const dur = parseCourseDurationMonths(a.medicineDuration || a.packageDurationMonths);

      await this.recordPayment({
        branch,
        patientId,
        amount: paidAmt,
        durationMonths: dur,
        paidAt: dateStr,
        planId: a.id,
        isInitialPlan: true,
      });
    }

    // 2. Process package registrations and installments
    for (const p of pkgs) {
      const branch = p.branch || "KPHB Branch";
      const patientId = p.registrationId || p.phone;
      if (!patientId) continue;

      if (Array.isArray(p.payments) && p.payments.length > 0) {
        let isFirst = true;
        for (const pay of p.payments) {
          await this.recordPayment({
            branch,
            patientId,
            amount: Number(pay.amount) || 0,
            durationMonths: isFirst ? Number(p.durationMonths) || 1 : 0,
            paidAt: pay.paidAt || p.createdAt,
            planId: p.id,
            isInitialPlan: isFirst,
          });
          isFirst = false;
        }
      } else if ((Number(p.paidAmount) || 0) > 0) {
        await this.recordPayment({
          branch,
          patientId,
          amount: Number(p.paidAmount) || 0,
          durationMonths: Number(p.durationMonths) || 1,
          paidAt: p.createdAt || p.startDate,
          planId: p.id,
          isInitialPlan: true,
        });
      }
    }

    // 3. Process pay later cleared settlements
    for (const r of payLater) {
      const cleared = Number(r.clearedAmount) || 0;
      if (cleared > 0 && !r.clearedAppointmentId) {
        await this.recordPayment({
          branch: r.branch || "KPHB Branch",
          patientId: r.registrationId || r.phone,
          amount: cleared,
          durationMonths: 0,
          paidAt: r.clearedAt || r.updatedAt,
          planId: r.id,
          isInitialPlan: false,
        });
      }
    }

    const totals = getBranchMonthTotalsStore();
    const patients = getBranchMonthPatientsStore();

    return {
      totalRows: totals.length,
      patientRows: patients.length,
    };
  },

  /**
   * Reconciles summary stores against historical payments and returns difference log.
   */
  async reconcile(): Promise<{
    discrepanciesCount: number;
    details: string[];
  }> {
    const details: string[] = [];
    const totals = getBranchMonthTotalsStore();
    const patients = getBranchMonthPatientsStore();

    // Verify consistency between branch_month_totals and branch_month_patients
    for (const t of totals) {
      const matchingPats = patients.filter((p) => p.branchId === t.branchId && p.month === t.month);
      const patsRevenue = matchingPats.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0);
      const patsMonths = matchingPats.reduce((sum, p) => sum + (Number(p.months) || 0), 0);

      const revDiff = Math.abs(patsRevenue - t.revenueTotal);
      const monthDiff = Math.abs(patsMonths - t.monthsTotal);

      if (revDiff > 0.01) {
        details.push(
          `Branch ${t.branchName} (${t.month}): Totals Revenue (${t.revenueTotal}) != Patients Sum (${patsRevenue})`
        );
      }
      if (monthDiff > 0.1) {
        details.push(
          `Branch ${t.branchName} (${t.month}): Totals Months (${t.monthsTotal}) != Patients Sum (${patsMonths})`
        );
      }
    }

    return {
      discrepanciesCount: details.length,
      details,
    };
  },
};

// ============================================================================
// MONTHLY FEE SPREAD (EQUAL PLAN-MONTH ALLOCATION & CALENDAR REVENUE PROJECTION)
// ============================================================================

export interface PlanScheduleRecord {
  id: string;
  planId: string;
  branchId: string;
  branchName: string;
  patientId: string;
  startDate: string; // ISO
  cohortMonth: string; // 'YYYY-MM'
  months: number; // N
  totalFee: number;
  shares: number[]; // exact paise shares per month index (length N)
  isRefunded?: boolean;
  updatedAt: string;
}

export interface BranchPlanMonthRecord {
  id: string;
  branchId: string;
  branchName: string;
  cohortMonth: string; // 'YYYY-MM'
  monthIndex: number; // 1..N
  amount: number;
  plansCount: number;
  patientMonthsTotal: number;
  updatedAt: string;
}

export interface MonthSpreadRow {
  index: number;
  monthLabel: string;
  calendarMonth?: string;
  amount: number;
  plans: number;
}

export interface MonthSpreadResult {
  branch: string;
  cohort: string;
  view: "plan" | "calendar";
  rows: MonthSpreadRow[];
  grandTotal: number;
  monthsCount: number;
  patientMonths: number;
  avgMonthlyRevenue: number | null;
  avgPerMonth: number | null;
  avgPerPatientMonth: number | null;
}

/**
 * Calculates exact paise shares across N months.
 * Leftover paise are given to Month 1 so the shares sum exactly to totalFee.
 */
export function calculatePaiseShares(totalFee: number, months: number): number[] {
  const N = Math.max(1, Math.round(months));
  const feePaise = Math.round(Math.max(0, totalFee) * 100);
  const basePaise = Math.floor(feePaise / N);
  const remainderPaise = feePaise - basePaise * N;

  const shares: number[] = [];
  for (let i = 1; i <= N; i++) {
    const p = i === 1 ? basePaise + remainderPaise : basePaise;
    shares.push(p / 100);
  }
  return shares;
}

/**
 * Adds offsetMonths to a 'YYYY-MM' month string.
 */
export function addMonthsToYearMonth(ym: string, offsetMonths: number): string {
  try {
    const [yStr, mStr] = ym.split("-");
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    if (!isNaN(year) && !isNaN(month)) {
      const d = new Date(year, month - 1 + offsetMonths, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
  } catch {}
  return ym;
}

function getPlanSchedulesCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "plan_schedules_store.json"))) {
    return path.join(webCache, "plan_schedules_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "plan_schedules_store.json"))) {
    return path.join(rootCache, "plan_schedules_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "plan_schedules_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".plan_schedules_store.json");
    }
  }
  return path.join(rootCache, "plan_schedules_store.json");
}

function loadPlanSchedulesFromDisk(): PlanScheduleRecord[] {
  try {
    const file = getPlanSchedulesCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to load plan schedules from cache:", err);
  }
  return [];
}

function savePlanSchedulesToDisk(data: PlanScheduleRecord[]): void {
  const file = getPlanSchedulesCachePath();
  safeAtomicWrite(file, data);
  try {
    if (fs.existsSync(file)) {
      global.__sphPlanSchedulesLastMtime = fs.statSync(file).mtimeMs;
    }
  } catch {}
}

function getPlanSchedulesStore(): PlanScheduleRecord[] {
  const file = getPlanSchedulesCachePath();
  let mtime = 0;
  try {
    if (fs.existsSync(file)) {
      mtime = fs.statSync(file).mtimeMs;
    }
  } catch {}

  if (
    !global.__sphPlanSchedulesStore ||
    global.__sphPlanSchedulesStore.length === 0 ||
    (mtime > 0 && mtime > (global.__sphPlanSchedulesLastMtime || 0))
  ) {
    global.__sphPlanSchedulesStore = loadPlanSchedulesFromDisk();
    global.__sphPlanSchedulesLastMtime = mtime;
  }
  return global.__sphPlanSchedulesStore;
}

function getBranchPlanMonthsCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "branch_plan_months_store.json"))) {
    return path.join(webCache, "branch_plan_months_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "branch_plan_months_store.json"))) {
    return path.join(rootCache, "branch_plan_months_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "branch_plan_months_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".branch_plan_months_store.json");
    }
  }
  return path.join(rootCache, "branch_plan_months_store.json");
}

function loadBranchPlanMonthsFromDisk(): BranchPlanMonthRecord[] {
  try {
    const file = getBranchPlanMonthsCachePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to load branch plan months from cache:", err);
  }
  return [];
}

function saveBranchPlanMonthsToDisk(data: BranchPlanMonthRecord[]): void {
  const file = getBranchPlanMonthsCachePath();
  safeAtomicWrite(file, data);
  try {
    if (fs.existsSync(file)) {
      global.__sphBranchPlanMonthsLastMtime = fs.statSync(file).mtimeMs;
    }
  } catch {}
}

function getBranchPlanMonthsStore(): BranchPlanMonthRecord[] {
  const file = getBranchPlanMonthsCachePath();
  let mtime = 0;
  try {
    if (fs.existsSync(file)) {
      mtime = fs.statSync(file).mtimeMs;
    }
  } catch {}

  if (
    !global.__sphBranchPlanMonthsStore ||
    global.__sphBranchPlanMonthsStore.length === 0 ||
    (mtime > 0 && mtime > (global.__sphBranchPlanMonthsLastMtime || 0))
  ) {
    global.__sphBranchPlanMonthsStore = loadBranchPlanMonthsFromDisk();
    global.__sphBranchPlanMonthsLastMtime = mtime;
  }
  return global.__sphBranchPlanMonthsStore;
}

export const planSpreadService = {
  /**
   * Records a plan payment and spreads the fee equally over month_index 1..N.
   * Handles installments by splitting the installment amount over the plan's N months without doubling N.
   */
  async recordPlanPayment(params: {
    planId: string;
    branch: string;
    patientId: string;
    amount: number;
    durationMonths: number;
    paidAt?: string | Date;
    isInstallment?: boolean;
  }): Promise<{ plan: PlanScheduleRecord }> {
    const amount = Math.max(0, Number(params.amount) || 0);
    const months = Math.max(1, Math.round(Number(params.durationMonths) || 1));
    const branchId = normalizeBranchName(params.branch || "kphb");
    const branchName = canonicalBranchName(params.branch);
    const patientId = (params.patientId || "").trim().toUpperCase();
    const paidDate = params.paidAt ? (params.paidAt instanceof Date ? params.paidAt : new Date(params.paidAt)) : new Date();
    const cohortMonth = getISTMonthString(paidDate);
    const nowIso = new Date().toISOString();

    const planStore = getPlanSchedulesStore();
    const bpmStore = getBranchPlanMonthsStore();

    // Calculate exact paise shares for this payment
    const paymentShares = calculatePaiseShares(amount, months);

    // 1. Update or create PlanScheduleRecord
    let planIdx = planStore.findIndex((p) => p.planId === params.planId);
    let planRec: PlanScheduleRecord;

    if (planIdx !== -1) {
      planRec = planStore[planIdx];
      planRec.totalFee = Math.round((planRec.totalFee + amount) * 100) / 100;
      if (!Array.isArray(planRec.shares)) {
        planRec.shares = calculatePaiseShares(planRec.totalFee, planRec.months);
      } else {
        for (let i = 0; i < months; i++) {
          planRec.shares[i] = Math.round(((planRec.shares[i] || 0) + paymentShares[i]) * 100) / 100;
        }
      }
      planRec.updatedAt = nowIso;
    } else {
      planRec = {
        id: `ps_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        planId: params.planId,
        branchId,
        branchName,
        patientId,
        startDate: paidDate.toISOString(),
        cohortMonth,
        months,
        totalFee: amount,
        shares: paymentShares,
        isRefunded: false,
        updatedAt: nowIso,
      };
      planStore.push(planRec);
      planIdx = planStore.length - 1;
    }

    // 2. Update branch_plan_month summary table atomically
    for (let i = 1; i <= months; i++) {
      const shareVal = paymentShares[i - 1];
      let bpmIdx = bpmStore.findIndex(
        (b) => b.branchId === branchId && b.cohortMonth === cohortMonth && b.monthIndex === i
      );

      if (bpmIdx !== -1) {
        bpmStore[bpmIdx].amount = Math.round((bpmStore[bpmIdx].amount + shareVal) * 100) / 100;
        if (!params.isInstallment) {
          bpmStore[bpmIdx].plansCount += 1;
          bpmStore[bpmIdx].patientMonthsTotal = (bpmStore[bpmIdx].patientMonthsTotal || 0) + months;
        }
        bpmStore[bpmIdx].updatedAt = nowIso;
      } else {
        const newBpm: BranchPlanMonthRecord = {
          id: `bpm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          branchId,
          branchName,
          cohortMonth,
          monthIndex: i,
          amount: Math.round(shareVal * 100) / 100,
          plansCount: params.isInstallment ? 0 : 1,
          patientMonthsTotal: params.isInstallment ? 0 : months,
          updatedAt: nowIso,
        };
        bpmStore.push(newBpm);
      }
    }

    // Save stores
    global.__sphPlanSchedulesStore = planStore;
    savePlanSchedulesToDisk(planStore);

    global.__sphBranchPlanMonthsStore = bpmStore;
    saveBranchPlanMonthsToDisk(bpmStore);

    // Sync to Prisma tables when available
    try {
      if (prisma && (prisma as any).planSchedule) {
        await (prisma as any).planSchedule.upsert({
          where: { planId: params.planId },
          update: {
            totalFee: planRec.totalFee,
            shares: planRec.shares,
            isRefunded: false,
            updatedAt: new Date(),
          },
          create: {
            planId: params.planId,
            branchId,
            patientId,
            startDate: paidDate,
            cohortMonth,
            months,
            totalFee: planRec.totalFee,
            shares: planRec.shares,
            isRefunded: false,
          },
        }).catch(() => {});

        if ((prisma as any).branchPlanMonth) {
          for (let i = 1; i <= months; i++) {
            const shareVal = paymentShares[i - 1];
            await (prisma as any).branchPlanMonth.upsert({
              where: {
                branch_cohort_month_index_unique: {
                  branchId,
                  cohortMonth,
                  monthIndex: i,
                },
              },
              update: {
                amount: { increment: shareVal },
                plansCount: params.isInstallment ? undefined : { increment: 1 },
                patientMonthsTotal: params.isInstallment ? undefined : { increment: months },
              },
              create: {
                branchId,
                cohortMonth,
                monthIndex: i,
                amount: shareVal,
                plansCount: params.isInstallment ? 0 : 1,
                patientMonthsTotal: params.isInstallment ? 0 : months,
              },
            }).catch(() => {});
          }
        }
      }
    } catch {}

    return { plan: planRec };
  },

  /**
   * Reverses a plan's fee split and patient_months_total from branch_plan_month.
   */
  async refundPlan(planId: string): Promise<boolean> {
    const planStore = getPlanSchedulesStore();
    const bpmStore = getBranchPlanMonthsStore();

    const plan = planStore.find((p) => p.planId === planId);
    if (!plan || plan.isRefunded) return false;

    const nowIso = new Date().toISOString();

    for (let i = 1; i <= plan.months; i++) {
      const shareVal = plan.shares[i - 1] || 0;
      const bpmIdx = bpmStore.findIndex(
        (b) => b.branchId === plan.branchId && b.cohortMonth === plan.cohortMonth && b.monthIndex === i
      );
      if (bpmIdx !== -1) {
        bpmStore[bpmIdx].amount = Math.max(0, Math.round((bpmStore[bpmIdx].amount - shareVal) * 100) / 100);
        bpmStore[bpmIdx].plansCount = Math.max(0, bpmStore[bpmIdx].plansCount - 1);
        bpmStore[bpmIdx].patientMonthsTotal = Math.max(
          0,
          (bpmStore[bpmIdx].patientMonthsTotal || 0) - plan.months
        );
        bpmStore[bpmIdx].updatedAt = nowIso;
      }
    }

    plan.isRefunded = true;
    plan.updatedAt = nowIso;

    global.__sphPlanSchedulesStore = planStore;
    savePlanSchedulesToDisk(planStore);

    global.__sphBranchPlanMonthsStore = bpmStore;
    saveBranchPlanMonthsToDisk(bpmStore);

    try {
      if (prisma && (prisma as any).planSchedule) {
        await (prisma as any).planSchedule.update({
          where: { planId },
          data: { isRefunded: true, updatedAt: new Date() },
        }).catch(() => {});
      }
    } catch {}

    return true;
  },

  /**
   * Restores a previously refunded or cancelled plan.
   */
  async restorePlan(planId: string): Promise<boolean> {
    const planStore = getPlanSchedulesStore();
    const bpmStore = getBranchPlanMonthsStore();

    const plan = planStore.find((p) => p.planId === planId);
    if (!plan || !plan.isRefunded) return false;

    const nowIso = new Date().toISOString();

    for (let i = 1; i <= plan.months; i++) {
      const shareVal = plan.shares[i - 1] || 0;
      const bpmIdx = bpmStore.findIndex(
        (b) => b.branchId === plan.branchId && b.cohortMonth === plan.cohortMonth && b.monthIndex === i
      );
      if (bpmIdx !== -1) {
        bpmStore[bpmIdx].amount = Math.round((bpmStore[bpmIdx].amount + shareVal) * 100) / 100;
        bpmStore[bpmIdx].plansCount += 1;
        bpmStore[bpmIdx].patientMonthsTotal = (bpmStore[bpmIdx].patientMonthsTotal || 0) + plan.months;
        bpmStore[bpmIdx].updatedAt = nowIso;
      } else {
        bpmStore.push({
          id: `bpm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          branchId: plan.branchId,
          branchName: plan.branchName,
          cohortMonth: plan.cohortMonth,
          monthIndex: i,
          amount: Math.round(shareVal * 100) / 100,
          plansCount: 1,
          patientMonthsTotal: plan.months,
          updatedAt: nowIso,
        });
      }
    }

    plan.isRefunded = false;
    plan.updatedAt = nowIso;

    global.__sphPlanSchedulesStore = planStore;
    savePlanSchedulesToDisk(planStore);

    global.__sphBranchPlanMonthsStore = bpmStore;
    saveBranchPlanMonthsToDisk(bpmStore);

    try {
      if (prisma && (prisma as any).planSchedule) {
        await (prisma as any).planSchedule.update({
          where: { planId },
          data: { isRefunded: false, updatedAt: new Date() },
        }).catch(() => {});
      }
    } catch {}

    return true;
  },

  /**
   * Fast Read API: computes monthly spread strictly from branch_plan_month summary table.
   * Under 100ms with zero payments-table scanning.
   */
  async getMonthSpread(params: {
    branch?: string;
    cohort?: string;
    fromCohort?: string;
    toCohort?: string;
    view?: "plan" | "calendar";
  }): Promise<MonthSpreadResult> {
    let bpmStore = getBranchPlanMonthsStore();
    let planStore = getPlanSchedulesStore();

    // Auto-backfill if store is empty
    if (bpmStore.length === 0 && planStore.length === 0) {
      try {
        await this.backfillFromExistingData();
        bpmStore = getBranchPlanMonthsStore();
        planStore = getPlanSchedulesStore();
      } catch (err) {
        console.warn("Auto-backfill failed for plan spread:", err);
      }
    }

    const currentMonth = getISTMonthString();
    const cohort = (params.cohort || currentMonth).trim();
    let fromCohort = (params.fromCohort || cohort).trim();
    let toCohort = (params.toCohort || fromCohort).trim();
    if (toCohort < fromCohort) {
      const temp = fromCohort;
      fromCohort = toCohort;
      toCohort = temp;
    }

    const rawBranch = params.branch ? params.branch.trim() : "";
    const cleanBranch = rawBranch ? normalizeBranchName(rawBranch) : null;
    const isAll = !cleanBranch || cleanBranch === "all" || cleanBranch === "allbranches";
    const view = params.view === "calendar" ? "calendar" : "plan";

    // Filter branch_plan_month rows
    const matchingRows = bpmStore.filter((r) => {
      if (!isAll && r.branchId !== cleanBranch) return false;
      return r.cohortMonth >= fromCohort && r.cohortMonth <= toCohort;
    });

    // Also get active plans in this cohort range for accurate patientMonths calculation
    const matchingPlans = planStore.filter((p) => {
      if (p.isRefunded) return false;
      if (!isAll && p.branchId !== cleanBranch) return false;
      return p.cohortMonth >= fromCohort && p.cohortMonth <= toCohort;
    });

    const patientMonths = matchingPlans.reduce((sum, p) => sum + (Number(p.months) || 1), 0);

    let rows: MonthSpreadRow[] = [];

    if (view === "calendar") {
      // Calendar View: map (cohortMonth + monthIndex - 1)
      const calendarMap = new Map<string, { amount: number; plans: number }>();

      for (const r of matchingRows) {
        const calMonth = addMonthsToYearMonth(r.cohortMonth, r.monthIndex - 1);
        const curr = calendarMap.get(calMonth) || { amount: 0, plans: 0 };
        curr.amount = Math.round((curr.amount + r.amount) * 100) / 100;
        curr.plans += r.plansCount;
        calendarMap.set(calMonth, curr);
      }

      const sortedMonths = Array.from(calendarMap.keys()).sort();
      rows = sortedMonths.map((calMonth, idx) => {
        const entry = calendarMap.get(calMonth)!;
        return {
          index: idx + 1,
          monthLabel: calMonth,
          calendarMonth: calMonth,
          amount: entry.amount,
          plans: entry.plans,
        };
      });
    } else {
      // Plan-Month View: rows Month 1..Month N
      const indexMap = new Map<number, { amount: number; plans: number }>();

      for (const r of matchingRows) {
        const curr = indexMap.get(r.monthIndex) || { amount: 0, plans: 0 };
        curr.amount = Math.round((curr.amount + r.amount) * 100) / 100;
        curr.plans += r.plansCount;
        indexMap.set(r.monthIndex, curr);
      }

      const maxIndex = Math.max(0, ...Array.from(indexMap.keys()));
      for (let i = 1; i <= maxIndex; i++) {
        const entry = indexMap.get(i) || { amount: 0, plans: 0 };
        rows.push({
          index: i,
          monthLabel: `Month ${i}`,
          amount: entry.amount,
          plans: entry.plans,
        });
      }
    }

    const grandTotal = Math.round(rows.reduce((sum, r) => sum + r.amount, 0) * 100) / 100;

    // Number of months that have an amount (the highest month_index with amount > 0)
    const positiveRows = rows.filter((r) => r.amount > 0);
    const highestIndexWithAmount =
      view === "plan" && positiveRows.length > 0
        ? Math.max(...positiveRows.map((r) => r.index))
        : positiveRows.length;
    const monthsCount = highestIndexWithAmount;

    // Averages: return null for zero denominator, never 0 or error
    const avgMonthlyRevenue = monthsCount > 0 ? Math.round((grandTotal / monthsCount) * 100) / 100 : null;
    const avgPerPatientMonth = patientMonths > 0 ? Math.round((grandTotal / patientMonths) * 100) / 100 : null;

    return {
      branch: isAll ? "ALL" : canonicalBranchName(cleanBranch),
      cohort: fromCohort === toCohort ? fromCohort : `${fromCohort} to ${toCohort}`,
      view,
      rows,
      grandTotal,
      monthsCount,
      patientMonths,
      avgMonthlyRevenue,
      avgPerMonth: avgMonthlyRevenue,
      avgPerPatientMonth,
    };
  },

  /**
   * Backfills plan spread summary table from existing appointments and packages.
   */
  async backfillFromExistingData(options?: { reset?: boolean }): Promise<{
    plansCount: number;
    rowsCount: number;
  }> {
    if (options?.reset) {
      global.__sphPlanSchedulesStore = [];
      savePlanSchedulesToDisk([]);
      global.__sphBranchPlanMonthsStore = [];
      saveBranchPlanMonthsToDisk([]);
    }

    const appts = getAppointmentsStore();
    const pkgs = getPackageMembersStore();

    // 1. Appointments
    for (const a of appts) {
      if (a.isDeleted) continue;
      const isPaid = a.isFeeCollected || a.status === "COMPLETED" || (Number(a.totalPaid) || 0) > 0;
      if (!isPaid) continue;

      const dateStr = a.paidAt || a.updatedAt || a.appointmentDate || a.createdAt;
      const branch = (a as any).branchName || a.branch || "KPHB Branch";
      const patientId = a.registrationId || a.phone;
      if (!patientId) continue;

      const paidAmt = Number(a.totalPaid) || 0;
      if (paidAmt <= 0) continue;

      const rawDur = parseCourseDurationMonths(a.medicineDuration || a.packageDurationMonths);
      const dur = rawDur >= 1 ? Math.round(rawDur) : 1;

      await this.recordPlanPayment({
        planId: a.id,
        branch,
        patientId,
        amount: paidAmt,
        durationMonths: dur,
        paidAt: dateStr,
        isInstallment: false,
      });
    }

    // 2. Packages
    for (const p of pkgs) {
      const branch = p.branch || "KPHB Branch";
      const patientId = p.registrationId || p.phone;
      if (!patientId) continue;

      const dur = Math.max(1, Math.round(Number(p.durationMonths) || 1));

      if (Array.isArray(p.payments) && p.payments.length > 0) {
        let isFirst = true;
        for (const pay of p.payments) {
          const pAmt = Number(pay.amount) || 0;
          if (pAmt > 0) {
            await this.recordPlanPayment({
              planId: p.id,
              branch,
              patientId,
              amount: pAmt,
              durationMonths: dur,
              paidAt: pay.paidAt || p.createdAt,
              isInstallment: !isFirst,
            });
            isFirst = false;
          }
        }
      } else if ((Number(p.paidAmount) || 0) > 0) {
        await this.recordPlanPayment({
          planId: p.id,
          branch,
          patientId,
          amount: Number(p.paidAmount) || 0,
          durationMonths: dur,
          paidAt: p.createdAt || p.startDate,
          isInstallment: false,
        });
      }
    }

    const plans = getPlanSchedulesStore();
    const bpm = getBranchPlanMonthsStore();

    return {
      plansCount: plans.length,
      rowsCount: bpm.length,
    };
  },

  /**
   * Reconciles summary table from plan_schedule and logs differences.
   */
  async reconcile(): Promise<{
    discrepanciesCount: number;
    details: string[];
  }> {
    const details: string[] = [];
    const plans = getPlanSchedulesStore();
    const bpm = getBranchPlanMonthsStore();

    // Recompute in-memory
    const expected = new Map<string, number>();
    for (const p of plans) {
      if (p.isRefunded) continue;
      for (let i = 1; i <= p.months; i++) {
        const key = `${p.branchId}__${p.cohortMonth}__${i}`;
        const curr = expected.get(key) || 0;
        expected.set(key, Math.round((curr + (p.shares[i - 1] || 0)) * 100) / 100);
      }
    }

    for (const [key, expAmt] of expected.entries()) {
      const [branchId, cohortMonth, mIdxStr] = key.split("__");
      const mIdx = parseInt(mIdxStr, 10);
      const actualRow = bpm.find(
        (b) => b.branchId === branchId && b.cohortMonth === cohortMonth && b.monthIndex === mIdx
      );
      const actualAmt = actualRow ? actualRow.amount : 0;
      if (Math.abs(actualAmt - expAmt) > 0.05) {
        details.push(
          `Discrepancy at ${branchId} (${cohortMonth}, M${mIdx}): expected ${expAmt}, found ${actualAmt}`
        );
      }
    }

    return {
      discrepanciesCount: details.length,
      details,
    };
  },
};

// ==========================================
// LOGIN & LOGOUT ACTIVITY AUDIT SERVICE (12-HR IST)
// ==========================================

export interface LoginActivityRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: "RECEPTION" | "STAFF" | "HR" | "ADMIN" | "DOCTOR" | "TELECALLER";
  phone: string;
  branchName: string;
  platform: "WEB" | "STAFF_APP" | "MOBILE";
  deviceInfo?: string;
  ipAddress?: string;
  loginTimeIso: string;
  loginTimeIst: string; // Strictly 12-hour IST (e.g., "24 Nov 2026, 09:30:15 AM")
  logoutTimeIso?: string | null;
  logoutTimeIst?: string | null; // Strictly 12-hour IST (e.g., "24 Nov 2026, 06:45:20 PM")
  status: "ACTIVE" | "LOGGED_OUT" | "AUTO_EXPIRED";
  duration: string; // e.g., "Active (2h 15m)" or "8h 15m"
  createdAt: string;
  updatedAt: string;
}

export function formatTo12HourIST(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatTime12HourIST(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDateIST(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function calculateDurationIST(startIso: string, endIso?: string | null): string {
  if (!startIso) return "—";
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (isNaN(start) || isNaN(end)) return "—";
  const diffMs = Math.max(0, end - start);
  const totalMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (!endIso) {
    if (hours === 0 && mins === 0) return "Active (Just now)";
    return `Active (${hours > 0 ? `${hours}h ` : ""}${mins}m)`;
  }
  if (hours === 0 && mins === 0) return "< 1 min";
  return `${hours > 0 ? `${hours}h ` : ""}${mins}m`;
}

function getLoginActivityCachePath(): string {
  const webCache = path.resolve(process.cwd(), "apps/web/node_modules/.cache");
  if (fs.existsSync(path.join(webCache, "login_activity_store.json"))) {
    return path.join(webCache, "login_activity_store.json");
  }
  const rootCache = path.resolve(process.cwd(), "node_modules/.cache");
  if (fs.existsSync(path.join(rootCache, "login_activity_store.json"))) {
    return path.join(rootCache, "login_activity_store.json");
  }
  if (fs.existsSync(webCache)) {
    return path.join(webCache, "login_activity_store.json");
  }
  if (!fs.existsSync(rootCache)) {
    try {
      fs.mkdirSync(rootCache, { recursive: true });
    } catch {
      return path.resolve(process.cwd(), ".login_activity_store.json");
    }
  }
  return path.join(rootCache, "login_activity_store.json");
}

function loadLoginActivityFromDisk(): LoginActivityRecord[] {
  try {
    const file = getLoginActivityCachePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        // Strictly real-time: filter out any mock/seed records
        return parsed.filter((r) => r && r.id && !r.id.startsWith("log-seed-"));
      }
    }
  } catch (err) {
    console.warn("Failed to read login activity store:", err);
  }
  return [];
}

function saveLoginActivityToDisk(data: LoginActivityRecord[]): void {
  try {
    const file = getLoginActivityCachePath();
    // Strictly real-time: strip any seed records before writing
    const cleanRealtimeData = data.filter((r) => r && r.id && !r.id.startsWith("log-seed-"));
    fs.writeFileSync(file, JSON.stringify(cleanRealtimeData, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write login activity store:", err);
  }
}

function getLoginActivityStore(): LoginActivityRecord[] {
  if (!global.__sphLoginActivityStore) {
    global.__sphLoginActivityStore = loadLoginActivityFromDisk();
  } else {
    // Ensure any mock/seed records are removed from in-memory cache
    global.__sphLoginActivityStore = global.__sphLoginActivityStore.filter(
      (r) => r && r.id && !r.id.startsWith("log-seed-")
    );
  }
  return global.__sphLoginActivityStore;
}

export const loginActivityService = {
  async getAllActivities(filter?: {
    userRole?: string;
    platform?: string;
    branchName?: string;
    date?: string;
    status?: string;
    search?: string;
  }): Promise<LoginActivityRecord[]> {
    let records = [...getLoginActivityStore()];

    // Dynamically update durations for active records
    records = records.map((r) => {
      if (r.status === "ACTIVE") {
        return {
          ...r,
          duration: calculateDurationIST(r.loginTimeIso, null),
        };
      }
      return r;
    });

    if (filter?.userRole && filter.userRole !== "ALL") {
      const targetRole = filter.userRole.toUpperCase();
      if (targetRole === "TARGETED") {
        // Reception, Staff App, and HR only
        records = records.filter(
          (r) => r.userRole === "RECEPTION" || r.userRole === "STAFF" || r.userRole === "HR"
        );
      } else {
        records = records.filter((r) => r.userRole === targetRole);
      }
    }

    if (filter?.platform && filter.platform !== "ALL") {
      records = records.filter((r) => r.platform === filter.platform);
    }

    if (filter?.branchName && filter.branchName !== "ALL" && filter.branchName !== "All Branches") {
      const cleanBranch = filter.branchName.toLowerCase().replace(/branch/gi, "").trim();
      records = records.filter((r) =>
        (r.branchName || "").toLowerCase().replace(/branch/gi, "").trim().includes(cleanBranch)
      );
    }

    if (filter?.status && filter.status !== "ALL") {
      records = records.filter((r) => r.status === filter.status);
    }

    if (filter?.date && filter.date !== "ALL") {
      records = records.filter((r) => {
        const recordDateStr = formatDateIST(r.loginTimeIso);
        const searchDateStr = formatDateIST(filter.date);
        return recordDateStr === searchDateStr || (r.loginTimeIst || "").includes(filter.date!);
      });
    }

    if (filter?.search && filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      records = records.filter(
        (r) =>
          (r.userName || "").toLowerCase().includes(q) ||
          (r.phone || "").includes(q) ||
          (r.branchName || "").toLowerCase().includes(q) ||
          (r.userRole || "").toLowerCase().includes(q) ||
          (r.platform || "").toLowerCase().includes(q) ||
          (r.loginTimeIst || "").toLowerCase().includes(q) ||
          (r.logoutTimeIst || "").toLowerCase().includes(q)
      );
    }

    // Sort newest login first
    return records.sort(
      (a, b) => new Date(b.loginTimeIso).getTime() - new Date(a.loginTimeIso).getTime()
    );
  },

  async recordLogin(params: {
    userId?: string;
    userName?: string;
    userRole: string;
    phone?: string;
    branchName?: string;
    platform: "WEB" | "STAFF_APP" | "MOBILE";
    deviceInfo?: string;
    ipAddress?: string;
  }): Promise<LoginActivityRecord> {
    const store = getLoginActivityStore();
    const now = new Date();
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const role = (params.userRole || "STAFF").toUpperCase() as any;

    const record: LoginActivityRecord = {
      id,
      userId: params.userId || `usr-${Date.now()}`,
      userName: params.userName || `${role} User`,
      userRole: role,
      phone: params.phone || "",
      branchName: params.branchName || "KPHB Branch",
      platform: params.platform || "WEB",
      deviceInfo: params.deviceInfo || "Standard Client",
      ipAddress: params.ipAddress || "127.0.0.1",
      loginTimeIso: now.toISOString(),
      loginTimeIst: formatTo12HourIST(now), // Guaranteed 12-hour IST
      logoutTimeIso: null,
      logoutTimeIst: null,
      status: "ACTIVE",
      duration: "Active (Just now)",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    store.unshift(record);
    // Keep last 1000 records
    if (store.length > 1000) {
      store.splice(1000);
    }

    saveLoginActivityToDisk(store);
    return record;
  },

  async recordLogout(params: {
    sessionId?: string;
    userId?: string;
    userRole?: string;
    phone?: string;
  }): Promise<LoginActivityRecord | null> {
    const store = getLoginActivityStore();
    const now = new Date();

    let record: LoginActivityRecord | undefined;

    if (params.sessionId) {
      record = store.find((r) => r.id === params.sessionId && r.status === "ACTIVE");
    }

    if (!record && params.userId) {
      record = store.find((r) => r.userId === params.userId && r.status === "ACTIVE");
    }

    if (!record && params.phone) {
      const clean10 = params.phone.replace(/\D/g, "").slice(-10);
      record = store.find(
        (r) => r.phone && r.phone.replace(/\D/g, "").slice(-10) === clean10 && r.status === "ACTIVE"
      );
    }

    if (!record && params.userRole) {
      const reqRole = params.userRole.toUpperCase();
      record = store.find((r) => r.userRole === reqRole && r.status === "ACTIVE");
    }

    if (record) {
      record.logoutTimeIso = now.toISOString();
      record.logoutTimeIst = formatTo12HourIST(now); // Guaranteed 12-hour IST
      record.status = "LOGGED_OUT";
      record.duration = calculateDurationIST(record.loginTimeIso, record.logoutTimeIso);
      record.updatedAt = now.toISOString();

      saveLoginActivityToDisk(store);
      return record;
    }

    return null;
  },

  async clearOldActivities(days: number = 90): Promise<{ success: boolean; removedCount: number }> {
    const store = getLoginActivityStore();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const initialLen = store.length;
    const filtered = store.filter((r) => new Date(r.loginTimeIso).getTime() >= cutoff);
    const removedCount = initialLen - filtered.length;
    global.__sphLoginActivityStore = filtered;
    saveLoginActivityToDisk(filtered);
    return { success: true, removedCount };
  },
};














