"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharedMediaService = exports.INITIAL_SHARED_MEDIA_FOLDERS = exports.telecallerCallLogService = exports.INITIAL_CALL_LOGS = exports.payLaterService = exports.packageService = exports.payrollSettingsService = exports.payCutService = exports.staffDailyWorkService = exports.staffLeaveService = exports.INITIAL_STAFF_LEAVES = exports.staffAttendanceService = exports.medicineRequestService = exports.cleaningTaskService = exports.branchTargetService = exports.registrationSequenceService = exports.temporarySlotsService = exports.appointmentService = exports.patientService = exports.doctorNoShowService = exports.doctorScheduleService = exports.employeeService = exports.INITIAL_EMPLOYEES = exports.branchService = exports.prisma = void 0;
exports.normalizePhone = normalizePhone;
exports.getBranchReceptionPhone = getBranchReceptionPhone;
exports.normalizeDateStr = normalizeDateStr;
exports.matchPatientProfile = matchPatientProfile;
exports.matchBranch = matchBranch;
exports.resolveFollowUpToDate = resolveFollowUpToDate;
exports.computePatientVisitBadge = computePatientVisitBadge;
exports.decorateAppointmentWithVisitInfo = decorateAppointmentWithVisitInfo;
exports.getBranchShortcut = getBranchShortcut;
exports.getTodayDDMMYYYY = getTodayDDMMYYYY;
exports.toDDMMYYYY = toDDMMYYYY;
exports.toYYYYMMDD = toYYYYMMDD;
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const path_1 = require("path");
exports.prisma = global.prisma ||
    new client_1.PrismaClient({
        log: process.env.PRISMA_LOG === "true" ? ["query", "error", "warn"] : [],
    });
if (process.env.NODE_ENV !== "production") {
    global.prisma = exports.prisma;
}
__exportStar(require("@prisma/client"), exports);
// Normalize phone number to pure 10 digits
function normalizePhone(raw) {
    if (!raw)
        return "";
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
// Persistent fallback store file location
function getCacheFilePath() {
    const cacheDir = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (!fs_1.default.existsSync(cacheDir)) {
        try {
            fs_1.default.mkdirSync(cacheDir, { recursive: true });
        }
        catch {
            // Fallback
            return path_1.default.resolve(process.cwd(), ".branches_store.json");
        }
    }
    return path_1.default.join(cacheDir, "branches_store.json");
}
function loadBranchesFromDisk() {
    try {
        const file = getCacheFilePath();
        if (fs_1.default.existsSync(file)) {
            const content = fs_1.default.readFileSync(file, "utf-8");
            return JSON.parse(content);
        }
    }
    catch (err) {
        console.warn("Failed to load branches from disk cache:", err);
    }
    return [];
}
function saveBranchesToDisk(branches) {
    try {
        const file = getCacheFilePath();
        fs_1.default.writeFileSync(file, JSON.stringify(branches, null, 2), "utf-8");
    }
    catch (err) {
        console.warn("Failed to save branches to disk cache:", err);
    }
}
const DEFAULT_BRANCHES_STORE = [
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
async function cascadeBranchRename(oldName, newName) {
    if (!oldName || !newName)
        return;
    const cleanOld = normalizeBranchName(oldName);
    const cleanNew = normalizeBranchName(newName);
    const isChandanagar = cleanOld.includes("chanda") || cleanNew.includes("chanda") || oldName.toLowerCase().includes("chanda");
    const targetNewName = isChandanagar ? "Chandanagar Branch" : newName;
    // 1. Update Branch table via prisma
    try {
        await exports.prisma.branch.updateMany({
            where: {
                OR: [
                    { name: oldName },
                    { name: { contains: "Chandanagar Nagar", mode: "insensitive" } },
                ],
            },
            data: { name: targetNewName },
        });
    }
    catch (err) { }
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
            await exports.prisma.$executeRawUnsafe(q).catch(() => { });
        }
    }
    catch (err) { }
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
    }
    catch (err) {
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
        const targetMap = new Map();
        targets.forEach((t) => {
            const key = `${normalizeBranchName(t.branch)}_${t.monthYear}`;
            if (!targetMap.has(key)) {
                targetMap.set(key, t);
            }
            else {
                const prev = targetMap.get(key);
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
    }
    catch (err) {
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
    }
    catch (err) {
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
                    const tOld = bs.targetBranch === oldName || (cleanOld && normalizeBranchName(bs.targetBranch) === cleanOld);
                    const tNew = cleanNew && normalizeBranchName(bs.targetBranch) === cleanNew;
                    const tChanda = isChandanagar && (bs.targetBranch || "").toLowerCase().includes("chandanagar nagar");
                    if (tOld || tNew || tChanda) {
                        if (bs.targetBranch !== targetNewName) {
                            bs.targetBranch = targetNewName;
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
    }
    catch (err) {
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
    }
    catch (err) {
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
    }
    catch (err) {
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
    }
    catch (err) {
        console.warn("Failed cascading branch rename to package members:", err);
    }
}
function getBranchReceptionPhone(branchName = "") {
    const lower = (branchName || "").toLowerCase().replace(/branch/gi, "").trim();
    if (lower.includes("nalla") || lower.includes("nlg"))
        return "+91 91321 76176";
    if (lower.includes("dilshuk") || lower.includes("dilsukh") || lower.includes("dsnr") || lower.includes("dil"))
        return "+91 98041 76176";
    if (lower.includes("chanda") || lower.includes("cngr") || lower.includes("chn"))
        return "+91 95531 76176";
    if (lower.includes("kphb") || lower.includes("kpb") || lower.includes("kukatpally"))
        return "+91 90301 76176";
    return "+91 90301 76176";
}
// Shared In-Memory & Cache Store
function getMemoryStore() {
    if (!global.__sphBranchesStore) {
        const fromDisk = loadBranchesFromDisk();
        const raw = fromDisk.length > 0 ? fromDisk : DEFAULT_BRANCHES_STORE;
        // Deduplicate in-memory store by normalized branch name to prevent duplicate branches
        const dedupedMap = new Map();
        raw.forEach((b) => {
            const key = normalizeBranchName(b.name);
            const canonicalPhone = getBranchReceptionPhone(b.name);
            const updatedBranch = { ...b, phone: canonicalPhone || b.phone };
            if (!dedupedMap.has(key)) {
                dedupedMap.set(key, updatedBranch);
            }
            else {
                const prev = dedupedMap.get(key);
                dedupedMap.set(key, { ...prev, ...updatedBranch, phone: canonicalPhone || updatedBranch.phone });
            }
        });
        global.__sphBranchesStore = Array.from(dedupedMap.values());
    }
    return global.__sphBranchesStore;
}
exports.branchService = {
    // Get all active branches (checks Prisma first, falls back to store)
    async getAllBranches() {
        let branches = [];
        try {
            const dbBranches = await exports.prisma.branch.findMany({
                where: { isActive: true },
                orderBy: { createdAt: "desc" },
            });
            if (dbBranches && dbBranches.length > 0) {
                branches = dbBranches.map((b) => ({
                    ...b,
                    photoName: b.photoName || undefined,
                    photoUrl: b.photoUrl || "",
                    createdAt: b.createdAt.toISOString(),
                    updatedAt: b.updatedAt ? b.updatedAt.toISOString() : undefined,
                }));
            }
        }
        catch {
            // Database not connected
        }
        if (branches.length === 0) {
            branches = getMemoryStore();
            if (branches.length === 0)
                branches = DEFAULT_BRANCHES_STORE;
        }
        // Deduplicate branches by normalized name (keeps the latest canonical one)
        const seen = new Map();
        branches.forEach((b) => {
            if (b.name && b.name.toLowerCase().includes("chandanagar nagar")) {
                b.name = "Chandanagar Branch";
            }
            const key = normalizeBranchName(b.name);
            if (!seen.has(key)) {
                seen.set(key, b);
            }
            else {
                const prev = seen.get(key);
                seen.set(key, { ...prev, ...b });
            }
        });
        return Array.from(seen.values());
    },
    // Create a new branch (saves to Prisma + local store)
    async createBranch(input) {
        const store = getMemoryStore();
        const cleanInputName = normalizeBranchName(input.name);
        // If a branch with the same normalized name already exists, update it instead of creating a duplicate!
        const existingIdx = store.findIndex((b) => normalizeBranchName(b.name) === cleanInputName);
        if (existingIdx !== -1) {
            const updated = await this.updateBranch(store[existingIdx].id, input);
            if (updated)
                return updated;
        }
        const newRecord = {
            id: Date.now().toString(),
            name: input.name.trim(),
            phone: input.phone.trim(),
            address: input.address.trim(),
            city: input.city?.trim() || "Hyderabad",
            timings: input.timings?.trim() || "9:00 AM - 8:30 PM (Mon - Sat)",
            photoUrl: input.photoUrl ||
                "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500&q=80",
            photoName: input.photoName || "branch_photo.jpg",
            doctorsCount: Math.floor(Math.random() * 3) + 1,
            isActive: true,
            createdAt: new Date().toISOString(),
        };
        // Try saving to Prisma DB
        try {
            const dbBranch = await exports.prisma.branch.create({
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
        }
        catch {
            // Prisma offline, kept in shared memory
        }
        // Add to top of list
        store.unshift(newRecord);
        // Filter duplicates by normalized name
        const seen = new Map();
        store.forEach((b) => {
            const key = normalizeBranchName(b.name);
            if (!seen.has(key))
                seen.set(key, b);
        });
        const deduped = Array.from(seen.values());
        global.__sphBranchesStore = deduped;
        saveBranchesToDisk(deduped);
        return newRecord;
    },
    // Update an existing branch (saves to Prisma + local store)
    async updateBranch(id, input) {
        try {
            await exports.prisma.branch.update({
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
        }
        catch {
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
            const cleanedStore = [];
            const seenKeys = new Set();
            store.forEach((b, i) => {
                const key = normalizeBranchName(b.name);
                if (i === idx) {
                    cleanedStore.push(b);
                    seenKeys.add(key);
                }
                else if (!seenKeys.has(key)) {
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
    async cascadeBranchRename(oldName, newName) {
        await cascadeBranchRename(oldName, newName);
    },
    // Synchronize and clean all branches across all cache stores
    async syncAllStoresToCanonicalBranches() {
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
        }
        catch (e) {
            console.warn("Failed syncAllStoresToCanonicalBranches:", e);
        }
    },
    // Delete branch
    async deleteBranch(id) {
        try {
            await exports.prisma.branch.delete({ where: { id } });
        }
        catch {
            // Ignore
        }
        const store = getMemoryStore().filter((b) => b.id !== id);
        global.__sphBranchesStore = store;
        saveBranchesToDisk(store);
        return true;
    },
    // Find branch matching a phone number
    async findBranchByPhone(phone) {
        const cleanSearch = normalizePhone(phone);
        if (!cleanSearch)
            return null;
        // 1. Try Prisma DB
        try {
            const branches = await exports.prisma.branch.findMany({
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
        }
        catch {
            // Prisma offline
        }
        // 2. Check shared store
        const store = getMemoryStore();
        const match = store.find((b) => normalizePhone(b.phone) === cleanSearch);
        return match || null;
    },
};
exports.INITIAL_EMPLOYEES = [];
function getEmployeesCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "employees_store.json"))) {
        return path_1.default.join(webCache, "employees_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "employees_store.json"))) {
        return path_1.default.join(rootCache, "employees_store.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "employees_store.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".employees_store.json");
        }
    }
    return path_1.default.join(rootCache, "employees_store.json");
}
function loadEmployeesFromDisk() {
    try {
        const file = getEmployeesCachePath();
        if (fs_1.default.existsSync(file)) {
            const content = fs_1.default.readFileSync(file, "utf-8");
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length > 0)
                return parsed;
        }
    }
    catch (err) {
        console.warn("Failed to read employees cache:", err);
    }
    saveEmployeesToDisk(exports.INITIAL_EMPLOYEES);
    return [...exports.INITIAL_EMPLOYEES];
}
function saveEmployeesToDisk(data) {
    try {
        const file = getEmployeesCachePath();
        fs_1.default.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    }
    catch (err) {
        console.warn("Failed to write employees cache:", err);
    }
}
function getEmployeesStore() {
    if (!global.__sphEmployeesStore) {
        global.__sphEmployeesStore = loadEmployeesFromDisk();
    }
    return global.__sphEmployeesStore;
}
exports.employeeService = {
    async getAllEmployees(category) {
        const store = getEmployeesStore();
        if (!category || category === "ALL")
            return store;
        return store.filter((e) => e.category === category.toUpperCase());
    },
    async createEmployee(input) {
        const store = getEmployeesStore();
        const newRecord = {
            id: Date.now().toString(),
            name: input.name ? input.name.trim() : "Staff Member",
            category: (input.category || "STAFF"),
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
    async updateEmployee(id, updates) {
        const store = getEmployeesStore();
        const idx = store.findIndex((e) => e.id === id);
        if (idx === -1)
            return null;
        const updated = {
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
    async deleteEmployee(id) {
        const store = getEmployeesStore();
        const filtered = store.filter((e) => e.id !== id);
        global.__sphEmployeesStore = filtered;
        saveEmployeesToDisk(filtered);
        return true;
    },
};
function getSchedulesCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "doctor_schedules_store.json"))) {
        return path_1.default.join(webCache, "doctor_schedules_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "doctor_schedules_store.json"))) {
        return path_1.default.join(rootCache, "doctor_schedules_store.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "doctor_schedules_store.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".doctor_schedules_store.json");
        }
    }
    return path_1.default.join(rootCache, "doctor_schedules_store.json");
}
function normalizeBranchName(name) {
    let clean = (name || "")
        .toLowerCase()
        .replace(/spiritual\s*homeopathy/gi, "")
        .replace(/\bbranch\b/gi, "")
        .replace(/chandanagar\s*nagar/gi, "chandanagar")
        .replace(/chandanagarnagar/gi, "chandanagar")
        .replace(/[^a-z0-9]/g, "")
        .trim();
    if (clean.includes("chanda"))
        clean = "chandanagar";
    if (clean.includes("nalla") || clean.includes("nlg"))
        clean = "nallagandla";
    if (clean.includes("dilshuk") || clean.includes("dilsukh") || clean.includes("dsnr"))
        clean = "dilshuknagar";
    if (clean.includes("kphb") || clean.includes("kpb") || clean.includes("kukatpally"))
        clean = "kphb";
    return clean;
}
function getDefaultDoctorSchedules() {
    const defaultSlots = [
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
    const makeWeekDays = (availableDays) => {
        const days = [
            "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
        ];
        const map = {};
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
function loadSchedulesFromDisk() {
    try {
        const file = getSchedulesCachePath();
        if (fs_1.default.existsSync(file)) {
            const content = fs_1.default.readFileSync(file, "utf-8");
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length >= 2)
                return parsed;
        }
    }
    catch (err) {
        console.warn("Failed to read doctor schedules cache:", err);
    }
    const defaults = getDefaultDoctorSchedules();
    saveSchedulesToDisk(defaults);
    return defaults;
}
function saveSchedulesToDisk(data) {
    try {
        const file = getSchedulesCachePath();
        fs_1.default.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    }
    catch (err) {
        console.warn("Failed to write doctor schedules cache:", err);
    }
}
function getDoctorSchedulesStore() {
    if (!global.__sphDoctorSchedulesStore) {
        global.__sphDoctorSchedulesStore = loadSchedulesFromDisk();
    }
    return global.__sphDoctorSchedulesStore;
}
exports.doctorScheduleService = {
    async getAllSchedules() {
        return getDoctorSchedulesStore();
    },
    async getScheduleByDoctorId(doctorId) {
        const store = getDoctorSchedulesStore();
        return store.find((s) => s.doctorId === doctorId || s.id === doctorId) || null;
    },
    async saveSchedule(record) {
        const store = getDoctorSchedulesStore();
        const idx = store.findIndex((s) => s.doctorId === record.doctorId || s.id === record.id);
        // Auto-normalize inverted AM/PM in saved branch schedules
        if (record.branchSchedules && Array.isArray(record.branchSchedules)) {
            record.branchSchedules.forEach((bs) => {
                const normalizeSlot = (s) => {
                    if (!s)
                        return;
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
                    Object.values(bs.days).forEach((d) => {
                        if (d && Array.isArray(d.slots))
                            d.slots.forEach(normalizeSlot);
                    });
                }
                if (bs.daySchedules) {
                    Object.values(bs.daySchedules).forEach((ds) => {
                        if (ds && Array.isArray(ds.slots))
                            ds.slots.forEach(normalizeSlot);
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
        }
        else {
            store.unshift(updatedRecord);
        }
        global.__sphDoctorSchedulesStore = store;
        saveSchedulesToDisk(store);
        return updatedRecord;
    },
    async deleteSchedule(doctorId) {
        const store = getDoctorSchedulesStore();
        const filtered = store.filter((s) => s.doctorId !== doctorId && s.id !== doctorId);
        global.__sphDoctorSchedulesStore = filtered;
        saveSchedulesToDisk(filtered);
        return true;
    },
    async getDoctorsAvailable(branchName, dayAbbr) {
        const store = getDoctorSchedulesStore();
        const cleanTarget = normalizeBranchName(branchName);
        if (!cleanTarget)
            return [];
        const result = [];
        for (const doc of store) {
            if (!doc.branchSchedules || !Array.isArray(doc.branchSchedules))
                continue;
            for (const bs of doc.branchSchedules) {
                const rawBs = bs.branchName || bs.targetBranch || "";
                const cleanBs = normalizeBranchName(rawBs);
                if (!cleanBs)
                    continue;
                const branchMatches = cleanBs === cleanTarget ||
                    (cleanBs.length >= 4 && cleanTarget.length >= 4 && (cleanBs.startsWith(cleanTarget) || cleanTarget.startsWith(cleanBs)));
                if (branchMatches) {
                    const daySched = bs.days?.[dayAbbr];
                    const daySchedAlt = bs.daySchedules?.[dayAbbr];
                    let isAvailable = false;
                    let rawSlots = [];
                    if (daySched && daySched.isAvailable === true && Array.isArray(daySched.slots) && daySched.slots.length > 0) {
                        isAvailable = true;
                        rawSlots = daySched.slots;
                    }
                    else if (daySchedAlt && daySchedAlt.status === "Available" && Array.isArray(daySchedAlt.slots) && daySchedAlt.slots.length > 0) {
                        isAvailable = true;
                        rawSlots = daySchedAlt.slots;
                    }
                    else if (daySched && daySched.isAvailable === true) {
                        isAvailable = true;
                        rawSlots = Array.isArray(daySched.slots) ? daySched.slots : [];
                    }
                    else if (daySchedAlt && daySchedAlt.status === "Available") {
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
                        const normalizedSlots = rawSlots.map((s, idx) => {
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
                                doctorName: doc.doctorName || doc.name,
                                phone: doc.phone || "",
                                slots: normalizedSlots,
                            });
                        }
                        else {
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
function getNoShowsCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "doctor_noshows_store.json"))) {
        return path_1.default.join(webCache, "doctor_noshows_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "doctor_noshows_store.json"))) {
        return path_1.default.join(rootCache, "doctor_noshows_store.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "doctor_noshows_store.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".doctor_noshows_store.json");
        }
    }
    return path_1.default.join(rootCache, "doctor_noshows_store.json");
}
function loadNoShowsFromDisk() {
    try {
        const file = getNoShowsCachePath();
        if (fs_1.default.existsSync(file)) {
            const content = fs_1.default.readFileSync(file, "utf-8");
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed))
                return parsed;
        }
    }
    catch (err) {
        console.warn("Failed to read doctor no-shows cache:", err);
    }
    return [];
}
function safeAtomicWrite(filePath, data) {
    try {
        const dir = path_1.default.dirname(filePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        const tempFile = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const jsonStr = Array.isArray(data) && data.length > 500
            ? JSON.stringify(data)
            : JSON.stringify(data, null, 2);
        fs_1.default.writeFileSync(tempFile, jsonStr, "utf-8");
        fs_1.default.renameSync(tempFile, filePath);
    }
    catch (err) {
        try {
            const jsonStr = Array.isArray(data) && data.length > 500
                ? JSON.stringify(data)
                : JSON.stringify(data, null, 2);
            fs_1.default.writeFileSync(filePath, jsonStr, "utf-8");
        }
        catch (fallbackErr) {
            console.warn("Failed to write cache safely:", fallbackErr);
        }
    }
}
function saveNoShowsToDisk(data) {
    const file = getNoShowsCachePath();
    safeAtomicWrite(file, data);
}
function getDoctorNoShowsStore() {
    if (!global.__sphDoctorNoShowsStore) {
        global.__sphDoctorNoShowsStore = loadNoShowsFromDisk();
    }
    return global.__sphDoctorNoShowsStore;
}
function normalizeDateStr(dt) {
    if (!dt)
        return "";
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
            if (yr < 100)
                yr = 2000 + yr;
            const m = parts[1].padStart(2, "0");
            const d = parts[2].padStart(2, "0");
            return `${yr}-${m}-${d}`;
        }
        // If DD-MM-YYYY (4-digit last part, e.g. 12-11-2026)
        if (parts[2].length === 4) {
            let yr = parseInt(parts[2], 10);
            if (yr < 100)
                yr = 2000 + yr;
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
function normalizePatientName(raw) {
    if (!raw) return "";
    let s = String(raw).toLowerCase().trim();
    s = s.replace(/^(mr|mrs|ms|miss|dr|smt|sri|mast|master)\.?\s+/gi, "");
    s = s.replace(/^(baby\s+of|b\/o|s\/o|d\/o|w\/o|c\/o)\.?\s+/gi, "");
    s = s.replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    return s;
}
exports.normalizePatientName = normalizePatientName;
function isExplicitRegId(reg) {
    if (!reg) return false;
    const clean = String(reg).trim().toUpperCase();
    if (clean.length < 3) return false;
    if (["NEW", "N/A", "NA", "PENDING", "NONE", "NULL", "UNDEFINED"].includes(clean)) return false;
    if (/^\d{10}$/.test(clean)) return false;
    return true;
}
exports.isExplicitRegId = isExplicitRegId;
function matchPatientProfile(appt, patient) {
    if (!appt || !patient) return false;
    const apptReg = ((appt.registrationId || appt.regId || appt.patientId || "") + "").trim().toUpperCase();
    const patReg = ((patient.regId || patient.registrationId || patient.patientId || "") + "").trim().toUpperCase();
    const hasApptReg = isExplicitRegId(apptReg);
    const hasPatReg = isExplicitRegId(patReg);

    if (hasApptReg && hasPatReg) {
        return apptReg === patReg;
    }

    const apptPhone = normalizePhone(appt.phone || appt.phoneNumber || "");
    const patPhone = normalizePhone(patient.phone || patient.phoneNumber || "");
    if (!apptPhone || !patPhone || apptPhone.length < 10 || patPhone.length < 10)
        return false;
    if (apptPhone.slice(-10) !== patPhone.slice(-10))
        return false;
    const apptName = normalizePatientName(appt.patientName || appt.name || "");
    const patName = normalizePatientName(patient.name || patient.patientName || "");
    if (!apptName || !patName || apptName.length < 2 || patName.length < 2)
        return false;
    if (apptName === patName) return true;
    const apptWords = apptName.split(" ").filter(Boolean);
    const patWords = patName.split(" ").filter(Boolean);
    if (apptWords.length === patWords.length && apptWords.length > 1) {
        const sortedA = [...apptWords].sort().join(" ");
        const sortedB = [...patWords].sort().join(" ");
        if (sortedA === sortedB) return true;
    }
    return false;
}
function matchBranch(targetBranch, branchFilter) {
    if (!branchFilter || branchFilter === "All Branches" || branchFilter.toLowerCase() === "all")
        return true;
    const cleanFilter = branchFilter.toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/branch/gi, "").trim();
    const cleanTarget = (targetBranch || "").toLowerCase().replace(/spiritual\s*homeopathy/gi, "").replace(/branch/gi, "").trim();
    if (!cleanFilter || !cleanTarget)
        return true;
    if (cleanTarget === "all" || cleanFilter === "all")
        return true;
    const isKpbMatch = (cleanFilter === "kpb" || cleanFilter === "kphb") && (cleanTarget === "kpb" || cleanTarget === "kphb");
    return cleanTarget === cleanFilter || cleanTarget.includes(cleanFilter) || cleanFilter.includes(cleanTarget) || isKpbMatch;
}
exports.doctorNoShowService = {
    async getAllNoShows(branch, date) {
        let store = getDoctorNoShowsStore();
        if (branch && branch.toUpperCase() !== "ALL" && branch.toLowerCase() !== "all branches") {
            const cleanBranch = branch.toLowerCase().replace(/branch/gi, "").trim();
            store = store.filter((item) => {
                const itemBranch = item.branch.toLowerCase().replace(/branch/gi, "").trim();
                // If marked for ALL branches, it applies everywhere
                if (itemBranch === "all" || item.branch === "ALL")
                    return true;
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
    async addNoShow(record) {
        const store = getDoctorNoShowsStore();
        const newRecord = {
            ...record,
            id: record.id || `noshow_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            createdAt: record.createdAt || new Date().toISOString(),
        };
        store.unshift(newRecord);
        global.__sphDoctorNoShowsStore = store;
        saveNoShowsToDisk(store);
        return newRecord;
    },
    async deleteNoShow(id) {
        const store = getDoctorNoShowsStore();
        const filtered = store.filter((item) => item.id !== id);
        global.__sphDoctorNoShowsStore = filtered;
        saveNoShowsToDisk(filtered);
        return true;
    },
    async getDoctorsAvailableForBranch(branchName) {
        const schedules = getDoctorSchedulesStore();
        const cleanTarget = normalizeBranchName(branchName);
        if (!cleanTarget)
            return [];
        const matchedDoctors = [];
        const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        for (const doc of schedules) {
            const branchSchedule = (doc.branchSchedules || []).find((bs) => {
                const cleanBs = normalizeBranchName(bs.branchName || bs.targetBranch || "");
                if (!cleanBs)
                    return false;
                return (cleanBs === cleanTarget ||
                    (cleanBs.length >= 4 && cleanTarget.length >= 4 && (cleanBs.startsWith(cleanTarget) || cleanTarget.startsWith(cleanBs))));
            });
            if (branchSchedule) {
                const scheduledDays = [];
                const daysMap = {};
                weekDays.forEach((dayAbbr) => {
                    const daySched = branchSchedule.days?.[dayAbbr];
                    const daySchedAlt = branchSchedule.daySchedules?.[dayAbbr];
                    let isAvail = false;
                    let slotsDesc = [];
                    if (daySched && daySched.isAvailable === true) {
                        isAvail = true;
                        if (Array.isArray(daySched.slots) && daySched.slots.length > 0) {
                            slotsDesc = daySched.slots.map((s) => s.displayText || `${s.startHour || "10"}:${s.startMin || "00"} ${s.startAmPm || "AM"} - ${s.endHour || "01"}:${s.endMin || "00"} ${s.endAmPm || "PM"}`);
                        }
                    }
                    else if (daySchedAlt && daySchedAlt.status === "Available") {
                        isAvail = true;
                        if (Array.isArray(daySchedAlt.slots) && daySchedAlt.slots.length > 0) {
                            slotsDesc = daySchedAlt.slots.map((s) => s.displayText || `${s.startHour || "10"}:${s.startMin || "00"} ${s.startAmPm || "AM"} - ${s.endHour || "01"}:${s.endMin || "00"} ${s.endAmPm || "PM"}`);
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
/**
 * Resolves follow-up intervals or custom date strings into normalized YYYY-MM-DD.
 * Handles "1 Month", "2 Months", "15 Days", "DD-MM-YYYY", "YYYY-MM-DD", etc.
 */
function resolveFollowUpToDate(followUpStr, baseDate) {
    if (!followUpStr || typeof followUpStr !== "string")
        return "";
    const trimmed = followUpStr.trim();
    if (trimmed.length === 0 ||
        trimmed.toLowerCase() === "no follow-up" ||
        trimmed.toLowerCase() === "custom date") {
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
    }
    else if (lower.includes("day")) {
        daysToAdd = count;
    }
    else if (lower.includes("week")) {
        daysToAdd = count * 7;
    }
    else if (lower.includes("year")) {
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
function computePatientVisitBadge(completedVisitsCount, activeFollowUpDate, options) {
    const hasPrior = (typeof completedVisitsCount === "number" && completedVisitsCount > 0) ||
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
            }
            else {
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
function getPatientsCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "patients_store.json"))) {
        return path_1.default.join(webCache, "patients_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "patients_store.json"))) {
        return path_1.default.join(rootCache, "patients_store.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "patients_store.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".patients_store.json");
        }
    }
    return path_1.default.join(rootCache, "patients_store.json");
}
function loadPatientsFromDisk() {
    try {
        const file = getPatientsCachePath();
        if (fs_1.default.existsSync(file)) {
            const parsed = JSON.parse(fs_1.default.readFileSync(file, "utf-8"));
            if (Array.isArray(parsed)) {
                let modified = false;
                parsed.forEach((p) => {
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
    }
    catch (err) {
        console.warn("Failed to load patients from cache:", err);
    }
    return [];
}
function rebuildPatientIndices(store) {
    const data = store || (global.__sphPatientsStore ? global.__sphPatientsStore : loadPatientsFromDisk());
    const phoneMap = new Map();
    const regIdMap = new Map();
    for (let i = 0; i < data.length; i++) {
        const p = data[i];
        if (p.isDeleted)
            continue;
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
function getPatientsPhoneIndex() {
    if (!global.__sphPatientsPhoneIndex) {
        rebuildPatientIndices();
    }
    return global.__sphPatientsPhoneIndex;
}
function getPatientsRegIdIndex() {
    if (!global.__sphPatientsRegIdIndex) {
        rebuildPatientIndices();
    }
    return global.__sphPatientsRegIdIndex;
}
function savePatientsToDisk(data) {
    const file = getPatientsCachePath();
    safeAtomicWrite(file, data);
    rebuildPatientIndices(data);
}
function getPatientsStore() {
    if (!global.__sphPatientsStore) {
        global.__sphPatientsStore = loadPatientsFromDisk();
    }
    if (!global.__sphPatientsPhoneIndex || !global.__sphPatientsRegIdIndex) {
        rebuildPatientIndices(global.__sphPatientsStore);
    }
    return global.__sphPatientsStore;
}
exports.patientService = {
    async getAllPatients(branch) {
        const store = getPatientsStore();
        const active = store.filter((p) => !p.isDeleted);
        if (!branch || branch === "All Branches" || branch.toLowerCase() === "all")
            return active;
        return active.filter((p) => matchBranch(p.branch, branch));
    },
    async getByRegId(regId) {
        const clean = regId.trim().toUpperCase();
        if (!clean)
            return null;
        const regIndex = getPatientsRegIdIndex();
        const found = regIndex.get(clean);
        if (found && !found.isDeleted)
            return found;
        const store = getPatientsStore();
        return store.find((p) => p.regId.trim().toUpperCase() === clean && !p.isDeleted) || null;
    },
    async searchPatients(query, branch, limit = 50) {
        const q = query.trim().toLowerCase();
        if (!q)
            return [];
        const cleanDigits = q.replace(/\D/g, "");
        const cleanReg = q.toUpperCase();
        // 1. Exact or 10-digit phone lookup -> instant O(1) hash map hit
        if (cleanDigits.length >= 10) {
            const phoneIndex = getPatientsPhoneIndex();
            const exactMatches = phoneIndex.get(cleanDigits.slice(-10));
            if (exactMatches && exactMatches.length > 0) {
                const activeMatches = exactMatches.filter((p) => !p.isDeleted);
                if (!branch || branch === "All Branches" || branch.toLowerCase() === "all")
                    return activeMatches;
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
        const results = [];
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            if (p.phone.includes(q) ||
                p.name.toLowerCase().includes(q) ||
                p.regId.toLowerCase().includes(q)) {
                results.push(p);
                if (limit > 0 && results.length >= limit)
                    break;
            }
        }
        return results;
    },
    /**
     * Returns all active profiles sharing this mobile number
     */
    async getProfilesByPhone(phone) {
        const cleanPhone = normalizePhone(phone);
        if (!cleanPhone || cleanPhone.length < 10)
            return [];
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
    async upsertPatient(data) {
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
            const updated = {
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
        const newRecord = {
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
    async updatePatientName(regId, newName) {
        const cleanReg = regId.trim().toUpperCase();
        const trimmedName = newName.trim();
        if (!trimmedName)
            return null;
        const store = getPatientsStore();
        const idx = store.findIndex((p) => p.regId.trim().toUpperCase() === cleanReg);
        if (idx === -1)
            return null;
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
        }
        catch (_) { }
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
        }
        catch (_) { }
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
        }
        catch (_) { }
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
        }
        catch (_) { }
        // 5. Update PostgreSQL relational tables (Prisma & raw SQL)
        try {
            await exports.prisma.$executeRawUnsafe(`UPDATE "Appointment" SET "patientName" = '${trimmedName}' WHERE "registrationId" = '${cleanReg}' OR "patientName" = '${oldName}';`).catch(() => { });
            await exports.prisma.$executeRawUnsafe(`UPDATE "PatientProfile" SET "name" = '${trimmedName}' WHERE "mrn" = '${cleanReg}' OR "name" = '${oldName}';`).catch(() => { });
            await exports.prisma.$executeRawUnsafe(`UPDATE "Patient" SET "name" = '${trimmedName}' WHERE "registrationId" = '${cleanReg}' OR "name" = '${oldName}';`).catch(() => { });
            await exports.prisma.$executeRawUnsafe(`UPDATE "Invoice" SET "patientName" = '${trimmedName}' WHERE "patientName" = '${oldName}';`).catch(() => { });
        }
        catch (_) { }
        return store[idx];
    },
    /**
     * Soft deletes a patient profile and moves to 30-day retention trash.
     * Note: The regId sequence counter is NEVER rolled back or reassigned.
     */
    async deletePatientProfile(regId, deletedBy = "Reception", reason = "User Request") {
        const cleanReg = regId.trim().toUpperCase();
        const store = getPatientsStore();
        const idx = store.findIndex((p) => p.regId.trim().toUpperCase() === cleanReg);
        if (idx === -1)
            return null;
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
    async restorePatientProfile(regId) {
        const cleanReg = regId.trim().toUpperCase();
        const store = getPatientsStore();
        const idx = store.findIndex((p) => p.regId.trim().toUpperCase() === cleanReg);
        if (idx === -1)
            return null;
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
    async permanentlyDeletePatientProfile(regId) {
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
    async mergeProfiles(targetRegId, sourceRegId) {
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
    async getDeletedProfiles(branch, searchQuery, sortBy = "newest") {
        let store = getPatientsStore();
        const now = Date.now();
        // Auto-purge records exceeding 30 days
        const validStore = store.filter((p) => {
            if (!p.isDeleted || !p.retentionUntil)
                return true;
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
            deleted = deleted.filter((p) => p.name.toLowerCase().includes(q) ||
                p.phone.includes(q) ||
                p.regId.toLowerCase().includes(q));
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
function getAppointmentsCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "appointments_store.json"))) {
        return path_1.default.join(webCache, "appointments_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "appointments_store.json"))) {
        return path_1.default.join(rootCache, "appointments_store.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "appointments_store.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".appointments_store.json");
        }
    }
    return path_1.default.join(rootCache, "appointments_store.json");
}
function loadAppointmentsFromDisk() {
    try {
        const file = getAppointmentsCachePath();
        if (fs_1.default.existsSync(file)) {
            const parsed = JSON.parse(fs_1.default.readFileSync(file, "utf-8"));
            if (Array.isArray(parsed)) {
                let modified = false;
                parsed.forEach((a) => {
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
                });
                if (modified) {
                    safeAtomicWrite(file, parsed);
                }
                return parsed;
            }
        }
    }
    catch (err) {
        console.warn("Failed to load appointments from cache:", err);
    }
    return [];
}
function rebuildAppointmentIndices() {
    const store = global.__sphAppointmentsStore || [];
    const phoneMap = new Map();
    const regIdMap = new Map();
    for (const a of store) {
        if (a.isDeleted)
            continue;
        const reg = (a.registrationId || a.regId || a.patientId || "").trim().toUpperCase();
        if (reg) {
            let list = regIdMap.get(reg);
            if (!list) {
                list = [];
                regIdMap.set(reg, list);
            }
            list.push(a);
        }
        const digits = normalizePhone(a.phone || a.phoneNumber || "");
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
function getAppointmentsPhoneIndex() {
    if (!global.__sphApptsPhoneIndex) {
        rebuildAppointmentIndices();
    }
    return global.__sphApptsPhoneIndex;
}
function getAppointmentsRegIdIndex() {
    if (!global.__sphApptsRegIdIndex) {
        rebuildAppointmentIndices();
    }
    return global.__sphApptsRegIdIndex;
}
function saveAppointmentsToDisk(data) {
    const file = getAppointmentsCachePath();
    safeAtomicWrite(file, data);
    rebuildAppointmentIndices();
}
function getAppointmentsStore() {
    if (!global.__sphAppointmentsStore) {
        global.__sphAppointmentsStore = loadAppointmentsFromDisk();
        rebuildAppointmentIndices();
    }
    return global.__sphAppointmentsStore;
}
/**
 * Decorates an appointment with accurate visit badge ("New" | "In-Dur" | "Revisit"),
 * follow-up continuity date, and package metadata across all lifecycle stages.
 */
function decorateAppointmentWithVisitInfo(a, allStore, patientsStore, pkgStore) {
    const store = allStore || getAppointmentsStore();
    const patients = patientsStore || getPatientsStore();
    const packages = pkgStore || getPackageMembersStore();
    const regIndex = getPatientsRegIdIndex();
    const phoneIndex = getPatientsPhoneIndex();
    const aReg = (a.registrationId || "").trim().toUpperCase();
    const aDigits = normalizePhone(a.phone || "");
    const aPhone = aDigits.length >= 10 ? aDigits.slice(-10) : "";
    const pat = (aReg && regIndex.get(aReg)) ||
        patients.find((p) => matchPatientProfile(a, p));
    // HIGH-PERFORMANCE CANDIDATE LOOKUP:
    // Instead of scanning all 20,000 appointments twice (O(N)), look up sibling appointments in O(1)
    const apptPhoneIdx = getAppointmentsPhoneIndex();
    const apptRegIdx = getAppointmentsRegIdIndex();
    const candidatePool = [];
    const seenIds = new Set();
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
    const priorCompleted = candidatePool.filter((past) => {
        if (past.isDeleted)
            return false;
        const isCompleted = past.status === "COMPLETED" ||
            past.isFeeCollected ||
            (typeof past.totalPaid === "number" && past.totalPaid > 0);
        return isCompleted;
    });
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
        }
        else if (pastWithFollowUp.length > 0) {
            activeFollowUp = pastWithFollowUp[0].followUpDate;
            followUpStartDate = pastWithFollowUp[0].followUpStartDate || normalizeDateStr(pastWithFollowUp[0].appointmentDate || pastWithFollowUp[0].createdAt?.slice(0, 10)) || undefined;
        }
    }
    else {
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
exports.appointmentService = {
    async getAppointments(branch, date, doctorId, includeDeleted = false, decorate = true) {
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
            const matchedSchedule = schedules.find((s) => (s.doctorId && s.doctorId.toLowerCase() === cleanDoc) ||
                (s.doctorName && s.doctorName.toLowerCase().replace(/^dr\.?\s*/i, "").trim() === normDocName));
            const targetId = matchedSchedule?.doctorId?.toLowerCase() || cleanDoc;
            const targetName = matchedSchedule?.doctorName?.toLowerCase().replace(/^dr\.?\s*/i, "").trim() || normDocName;
            list = list.filter((a) => {
                const dId = (a.doctorId || "").toLowerCase().trim();
                const dName = (a.doctorName || "").toLowerCase().replace(/^dr\.?\s*/i, "").trim();
                return (dId === cleanDoc ||
                    dId === targetId ||
                    dName === targetName ||
                    dName.includes(targetName) ||
                    targetName.includes(dName));
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
    async createAppointment(data) {
        // Sanitization: Strip dangerous script/HTML tags and trim whitespace
        const sanitize = (val) => typeof val === "string" ? val.replace(/<[^>]*>?/gm, "").trim() : "";
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
        const isHistorical = data.status === "COMPLETED" ||
            (typeof data.marketingSource === "string" &&
                (data.marketingSource.includes("Historical") || data.marketingSource.includes("Old Record")));
        // Anti-overbooking guardrail: Check capacity before creating prospective in-clinic appointment
        if (!isOnline && !isHistorical) {
            const currentBookedCount = await this.getSlotBookedCount(cleanBranch, cleanDate, cleanDoctorId, cleanTimeSlot);
            if (currentBookedCount >= 3) {
                throw new Error(`Slot "${cleanTimeSlot}" is already fully booked (${currentBookedCount}/3 capacity). Please choose another time slot.`);
            }
        }
        const store = getAppointmentsStore();
        const tokenNum = Math.floor(10 + Math.random() * 90);
        const newRecord = {
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
        await exports.patientService.upsertPatient({
            regId: newRecord.registrationId,
            name: newRecord.patientName,
            phone: newRecord.phone,
            email: newRecord.email,
            diseases: newRecord.diseases,
            branch: newRecord.branch,
        });
        // When an appointment is booked, mark any prior follow-up for this patient as booked/shifted
        const sourceFollowUpId = data.followUpAppointmentId || data.sourceFollowUpId;
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
    async markFollowUpAsBooked(sourceId, bookedAppointmentId, patientIdentifier) {
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
                if (a.id !== bookedAppointmentId &&
                    !a.isFollowUpBooked &&
                    (a.followUpDate || a.followUpInterval) &&
                    matchPatientProfile(a, patientIdentifier)) {
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
    async getSlotBookedCount(branch, date, doctorId, timeSlot) {
        const appointments = await this.getAppointments(branch, date, doctorId);
        const cleanSlot = timeSlot.trim().toUpperCase();
        return appointments.filter((a) => a.timeSlot.trim().toUpperCase() === cleanSlot &&
            a.status !== "CANCELLED" &&
            !a.isDeleted &&
            a.consultationMode?.trim().toLowerCase() !== "online").length;
    },
    /**
     * Soft-deletes an appointment with 24h (Reception) / 48h (Admin) retention window.
     */
    async deleteAppointment(id, deletedBy = "Reception", role = "RECEPTION", reason = "Cancelled by user") {
        const store = getAppointmentsStore();
        const idx = store.findIndex((a) => a.id === id || a.token === id);
        if (idx === -1)
            return null;
        store[idx].isDeleted = true;
        store[idx].deletedAt = new Date().toISOString();
        store[idx].updatedAt = new Date().toISOString();
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
    async restoreAppointment(id) {
        const store = getAppointmentsStore();
        const idx = store.findIndex((a) => a.id === id || a.token === id);
        if (idx === -1)
            return null;
        store[idx].isDeleted = false;
        store[idx].deletedAt = undefined;
        store[idx].updatedAt = new Date().toISOString();
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
    async getAppointmentById(id) {
        const store = getAppointmentsStore();
        const appt = store.find((a) => a.id === id || a.token === id);
        if (!appt)
            return null;
        return decorateAppointmentWithVisitInfo(appt, store);
    },
    /**
     * Updates an appointment's status (e.g. IN_CONSULTATION, COMPLETED).
     */
    async updateAppointmentStatus(id, status) {
        const store = getAppointmentsStore();
        const appt = store.find((a) => a.id === id || a.token === id);
        if (!appt)
            return null;
        appt.status = status;
        appt.updatedAt = new Date().toISOString();
        global.__sphAppointmentsStore = store;
        saveAppointmentsToDisk(store);
        if (status === "COMPLETED") {
            const patients = getPatientsStore();
            const patIdx = patients.findIndex((p) => matchPatientProfile(appt, p));
            if (patIdx !== -1) {
                const completedCount = store.filter((a) => !a.isDeleted && a.status === "COMPLETED" && matchPatientProfile(a, patients[patIdx])).length;
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
    async recordAppointmentPayment(id, data) {
        const store = getAppointmentsStore();
        const appt = store.find((a) => a.id === id || a.token === id);
        if (!appt)
            return null;
        if (data.consultationFee !== undefined)
            appt.consultationFee = data.consultationFee;
        if (data.medicineFee !== undefined)
            appt.medicineFee = data.medicineFee;
        if (data.dietPlanFee !== undefined) {
            appt.dietPlanFee = data.dietPlanFee;
            appt.dietFee = data.dietPlanFee;
        }
        else if (data.dietFee !== undefined) {
            appt.dietPlanFee = data.dietFee;
            appt.dietFee = data.dietFee;
        }
        if (data.hasPackage !== undefined)
            appt.hasPackage = data.hasPackage;
        if (data.packageInstallmentPaid !== undefined)
            appt.packageInstallmentPaid = data.packageInstallmentPaid;
        if (data.isRegularBilling !== undefined)
            appt.isRegularBilling = data.isRegularBilling;
        if (data.billingMode !== undefined)
            appt.billingMode = data.billingMode;
        if (data.paymentType !== undefined)
            appt.paymentType = data.paymentType;
        if (data.paymentMode !== undefined)
            appt.paymentMode = data.paymentMode;
        if (data.totalAmountDue !== undefined)
            appt.totalAmountDue = data.totalAmountDue;
        if (data.paymentMethod !== undefined)
            appt.paymentMethod = data.paymentMethod;
        if (data.splitDetails !== undefined)
            appt.splitDetails = data.splitDetails;
        const medItems = data.medicinesList !== undefined ? data.medicinesList : data.medicines;
        if (medItems !== undefined) {
            appt.medicinesList = medItems;
            appt.medicines = medItems;
        }
        if (data.medicineDuration !== undefined)
            appt.medicineDuration = data.medicineDuration;
        if (data.discountRequested !== undefined)
            appt.discountRequested = data.discountRequested;
        if (data.discountApproved !== undefined)
            appt.discountApproved = data.discountApproved;
        if (data.discountNotes !== undefined)
            appt.discountNotes = data.discountNotes;
        if (data.discountStatus !== undefined)
            appt.discountStatus = data.discountStatus;
        if (data.otherCharges !== undefined)
            appt.otherCharges = data.otherCharges;
        if (data.discount !== undefined)
            appt.discount = data.discount;
        if (data.discountReason !== undefined)
            appt.discountReason = data.discountReason;
        if (data.totalPaid !== undefined)
            appt.totalPaid = data.totalPaid;
        const payLaterAmt = Number(data.payLaterAmount) || 0;
        const prevDuePaid = Number(data.previousDuePaid) || 0;
        if (payLaterAmt > 0) {
            appt.payLaterAmount = payLaterAmt;
            appt.pendingBalance = payLaterAmt;
        }
        if (prevDuePaid > 0) {
            appt.previousDuePaid = prevDuePaid;
        }
        if (data.invoiceId) {
            appt.invoiceId = data.invoiceId;
        }
        else if (!appt.invoiceId) {
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
            const completedCount = store.filter((a) => !a.isDeleted && (a.status === "COMPLETED" || a.id === appt.id) && matchPatientProfile(a, patients[patIdx])).length;
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
            await exports.payLaterService.createPayLater({
                patientId: appt.registrationId || appt.phone,
                registrationId: appt.registrationId,
                patientName: appt.patientName,
                phone: appt.phone,
                branch: appt.branchName || appt.branch || "KPHB Branch",
                appointmentId: appt.id,
                invoiceId: appt.invoiceId,
                originalBillAmount: data.totalAmountDue || 0,
                amountPaid: data.totalPaid || 0,
                pendingAmount: payLaterAmt,
                visitDate: appt.appointmentDate || new Date().toISOString(),
                dueDate: data.dueDate || undefined,
                notes: data.payLaterNotes || undefined,
            });
        }
        if (prevDuePaid > 0) {
            await exports.payLaterService.settleBalance(appt.registrationId || appt.phone, prevDuePaid, appt.invoiceId, appt.id);
        }
        // Auto-update package installment if patient has active package and this visit is explicitly marked for package installment
        const shouldRecordPackagePayment = (Boolean(data.hasPackage) || data.paymentType === "package" || data.packageInstallmentPaid !== undefined) &&
            !data.skipPackagePayment &&
            !data.isRegularBilling;
        if (shouldRecordPackagePayment) {
            const activePkg = await exports.packageService.getPackageByProfile(appt.registrationId || appt.phone, appt.patientName);
            if (activePkg && activePkg.status === "ACTIVE" && (data.totalPaid || 0) > 0) {
                await exports.packageService.recordPackagePayment(activePkg.id, {
                    amount: data.packageInstallmentPaid !== undefined ? data.packageInstallmentPaid : (data.totalPaid || 0),
                    paymentMethod: data.paymentMethod || "CASH",
                    appointmentId: appt.id,
                    invoiceId: appt.invoiceId,
                    notes: `Visit payment on ${appt.appointmentDate}`,
                });
            }
        }
        return decorateAppointmentWithVisitInfo(appt, store);
    },
    /**
     * Requests a medicine discount for HR/Admin approval.
     */
    async requestMedicineDiscount(id, data) {
        const store = getAppointmentsStore();
        const appt = store.find((a) => a.id === id || a.token === id);
        if (!appt)
            return null;
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
    async respondMedicineDiscount(id, data) {
        const store = getAppointmentsStore();
        const appt = store.find((a) => a.id === id || a.token === id);
        if (!appt)
            return null;
        if (data.action === "ACCEPT") {
            appt.discountStatus = "APPROVED";
            appt.discountApproved = data.approvedAmount !== undefined ? data.approvedAmount : (appt.discountRequested || 0);
        }
        else {
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
    async getPendingDiscounts() {
        const res = await this.getDiscounts({ status: "PENDING" });
        return res.discounts;
    },
    /**
     * Returns discount requests (pending, approved, rejected) within the last N months (default 2 months).
     */
    async getDiscounts(options) {
        const store = getAppointmentsStore();
        const months = options?.months || 2;
        const cutoffTime = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
        // Filter appointments that have a discount request
        const discountAppts = store.filter((a) => {
            if (a.isDeleted)
                return false;
            const status = a.discountStatus;
            const hasDiscount = (typeof a.discountRequested === "number" && a.discountRequested > 0) ||
                (typeof a.discountApproved === "number" && a.discountApproved > 0) ||
                (status && status !== "NONE");
            if (!hasDiscount)
                return false;
            // Pending are always shown regardless of date!
            if (status === "PENDING")
                return true;
            // Approved / Rejected: check within last N months (by discountRespondedAt, createdAt, or appointmentDate)
            let recordTime = 0;
            if (a.discountRespondedAt) {
                recordTime = new Date(a.discountRespondedAt).getTime();
            }
            else if (a.createdAt) {
                recordTime = new Date(a.createdAt).getTime();
            }
            else if (a.appointmentDate) {
                const parts = a.appointmentDate.split("-");
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        recordTime = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
                    }
                    else {
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
            if (isAPending && !isBPending)
                return -1;
            if (!isAPending && isBPending)
                return 1;
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
    async updatePatientFile(id, data) {
        const store = getAppointmentsStore();
        const appt = store.find((a) => a.id === id || a.token === id);
        if (!appt)
            return null;
        if (data.diagnosisNotes !== undefined)
            appt.diagnosisNotes = data.diagnosisNotes;
        if (data.prescriptionText !== undefined)
            appt.prescriptionText = data.prescriptionText;
        if (data.prescriptionImages !== undefined)
            appt.prescriptionImages = data.prescriptionImages;
        if (data.sharedMediaLinks !== undefined)
            appt.sharedMediaLinks = data.sharedMediaLinks;
        if (data.followUpInterval !== undefined)
            appt.followUpInterval = data.followUpInterval;
        if (data.consultationFee !== undefined)
            appt.consultationFee = data.consultationFee;
        if (data.dietPlan !== undefined)
            appt.dietPlan = data.dietPlan;
        if (data.dietPlanFee !== undefined) {
            appt.dietPlanFee = data.dietPlanFee;
            appt.dietFee = data.dietPlanFee;
        }
        if (data.isSentToReception !== undefined)
            appt.isSentToReception = data.isSentToReception;
        if (data.status !== undefined)
            appt.status = data.status;
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
        }
        else if (!appt.followUpDate && patIdx !== -1 && patients[patIdx].activeFollowUpDate) {
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
    async reorderAppointments(orderedIds) {
        const store = getAppointmentsStore();
        if (!Array.isArray(orderedIds) || orderedIds.length === 0)
            return false;
        const idIndexMap = new Map(orderedIds.map((id, index) => [id, index]));
        store.sort((a, b) => {
            const idxA = idIndexMap.has(a.id) ? idIndexMap.get(a.id) : 999999;
            const idxB = idIndexMap.has(b.id) ? idIndexMap.get(b.id) : 999999;
            return idxA - idxB;
        });
        const nowIso = new Date().toISOString();
        orderedIds.forEach((id) => {
            const a = store.find((item) => item.id === id);
            if (a)
                a.updatedAt = nowIso;
        });
        global.__sphAppointmentsStore = store;
        saveAppointmentsToDisk(store);
        return true;
    },
    /**
     * Reschedules an appointment to a new date and time slot.
     */
    async rescheduleAppointment(id, newDate, newTimeSlot, doctorId, doctorName) {
        const store = getAppointmentsStore();
        const appt = store.find((a) => a.id === id || a.token === id);
        if (!appt)
            return null;
        appt.appointmentDate = newDate;
        appt.timeSlot = newTimeSlot;
        appt.updatedAt = new Date().toISOString();
        if (doctorId)
            appt.doctorId = doctorId;
        if (doctorName)
            appt.doctorName = doctorName;
        global.__sphAppointmentsStore = store;
        saveAppointmentsToDisk(store);
        return decorateAppointmentWithVisitInfo(appt, store);
    },
    /**
     * Permanently deletes an appointment record.
     */
    async permanentlyDeleteAppointment(id) {
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
    async getDeletedAppointments(role = "RECEPTION", branch) {
        let store = getAppointmentsStore();
        const now = Date.now();
        const maxHours = role === "ADMIN" ? 48 : 24;
        const maxMs = maxHours * 60 * 60 * 1000;
        // Purge records older than 48 hours completely
        const purge48Ms = 48 * 60 * 60 * 1000;
        const activeStore = store.filter((a) => {
            if (!a.isDeleted || !a.deletedAt)
                return true;
            const elapsed = now - new Date(a.deletedAt).getTime();
            return elapsed <= purge48Ms;
        });
        if (activeStore.length !== store.length) {
            global.__sphAppointmentsStore = activeStore;
            saveAppointmentsToDisk(activeStore);
            store = activeStore;
        }
        let deleted = store.filter((a) => {
            if (!a.isDeleted || !a.deletedAt)
                return false;
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
            const elapsed = now - new Date(a.deletedAt).getTime();
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
    async getMonthlyDeletedAppointmentsCount() {
        const store = getAppointmentsStore();
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ];
        const allBranches = await exports.branchService.getAllBranches();
        const branchWise = {};
        allBranches.forEach((b) => {
            branchWise[b.name] = 0;
        });
        let total = 0;
        store.forEach((a) => {
            if (!a.deletedAt)
                return;
            const dt = new Date(a.deletedAt);
            if (dt.getFullYear() === curYear && dt.getMonth() === curMonth) {
                total++;
                const rawBranch = (a.branch || "").trim();
                const matched = allBranches.find((b) => b.name.toLowerCase() === rawBranch.toLowerCase() ||
                    rawBranch.toLowerCase().includes(b.name.toLowerCase()) ||
                    b.name.toLowerCase().includes(rawBranch.toLowerCase()));
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
    async getChanges(branch, date) {
        const list = await this.getAppointments(branch, date, undefined, false, false);
        let maxUpdated = "";
        for (let i = 0; i < list.length; i++) {
            const up = list[i].updatedAt || list[i].createdAt || "";
            if (up > maxUpdated)
                maxUpdated = up;
        }
        const count = list.length;
        const version = `${maxUpdated}:${count}`;
        return { maxUpdatedAt: maxUpdated, count, version };
    },
};
function getTemporarySlotsCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "temporary_slots_store.json"))) {
        return path_1.default.join(webCache, "temporary_slots_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "temporary_slots_store.json"))) {
        return path_1.default.join(rootCache, "temporary_slots_store.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "temporary_slots_store.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".temporary_slots_store.json");
        }
    }
    return path_1.default.join(rootCache, "temporary_slots_store.json");
}
function loadTemporarySlotsFromDisk() {
    try {
        const file = getTemporarySlotsCachePath();
        if (fs_1.default.existsSync(file)) {
            const content = fs_1.default.readFileSync(file, "utf-8");
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed))
                return parsed;
        }
    }
    catch (err) {
        console.warn("Failed to read temporary slots cache:", err);
    }
    return [];
}
function saveTemporarySlotsToDisk(data) {
    try {
        const file = getTemporarySlotsCachePath();
        fs_1.default.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    }
    catch (err) {
        console.warn("Failed to write temporary slots cache:", err);
    }
}
function getTemporarySlotsStore() {
    if (!global.__sphTemporarySlotsStore) {
        global.__sphTemporarySlotsStore = loadTemporarySlotsFromDisk();
    }
    return global.__sphTemporarySlotsStore;
}
exports.temporarySlotsService = {
    async getTemporarySlots(branch, doctorId, date) {
        const store = getTemporarySlotsStore();
        const cleanBranch = normalizeBranchName(branch);
        const cleanDate = date.trim();
        return store
            .filter((s) => normalizeBranchName(s.branch) === cleanBranch &&
            (s.doctorId === doctorId || doctorId === "ALL") &&
            s.date.trim() === cleanDate)
            .map((s) => ({ time: s.time, sessionIndex: s.sessionIndex }));
    },
    async addTemporarySlot(branch, doctorId, date, time, sessionIndex) {
        const store = getTemporarySlotsStore();
        const cleanBranch = normalizeBranchName(branch);
        const cleanDate = date.trim();
        const cleanTime = time.trim();
        const exists = store.some((s) => normalizeBranchName(s.branch) === cleanBranch &&
            s.doctorId === doctorId &&
            s.date.trim() === cleanDate &&
            s.time.trim() === cleanTime);
        if (!exists) {
            const newRecord = {
                id: `ts_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                branch,
                doctorId,
                date: cleanDate,
                time: cleanTime,
                sessionIndex: typeof sessionIndex === "number" ? sessionIndex : undefined,
                createdAt: new Date().toISOString(),
            };
            store.push(newRecord);
            global.__sphTemporarySlotsStore = store;
            saveTemporarySlotsToDisk(store);
        }
        return this.getTemporarySlots(branch, doctorId, date);
    },
    async removeTemporarySlot(branch, doctorId, date, time) {
        let store = getTemporarySlotsStore();
        const cleanBranch = normalizeBranchName(branch);
        const cleanDate = date.trim();
        const cleanTime = time.trim();
        store = store.filter((s) => !(normalizeBranchName(s.branch) === cleanBranch &&
            s.doctorId === doctorId &&
            s.date.trim() === cleanDate &&
            s.time.trim() === cleanTime));
        global.__sphTemporarySlotsStore = store;
        saveTemporarySlotsToDisk(store);
        return this.getTemporarySlots(branch, doctorId, date);
    },
};
function getBranchShortcut(branchNameOrId) {
    if (!branchNameOrId)
        return "KPB";
    const b = branchNameOrId.toLowerCase();
    if (b.includes("chanda") || b.includes("chn"))
        return "CHN";
    if (b.includes("dilshuk") || b.includes("dil") || b.includes("dls"))
        return "DIL";
    if (b.includes("nalla") || b.includes("ngl") || b.includes("nlg"))
        return "NGL";
    return "KPB"; // Default to KPHB
}
function getRegistrationSequenceCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "registration_sequences_store.json"))) {
        return path_1.default.join(webCache, "registration_sequences_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "registration_sequences_store.json"))) {
        return path_1.default.join(rootCache, "registration_sequences_store.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "registration_sequences_store.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".registration_sequences_store.json");
        }
    }
    return path_1.default.join(rootCache, "registration_sequences_store.json");
}
function loadRegistrationSequencesFromDisk() {
    try {
        const file = getRegistrationSequenceCachePath();
        if (fs_1.default.existsSync(file)) {
            const parsed = JSON.parse(fs_1.default.readFileSync(file, "utf-8"));
            if (parsed && typeof parsed === "object")
                return parsed;
        }
    }
    catch (err) {
        console.warn("Failed to load registration sequences from disk cache:", err);
    }
    return { KPB: 0, CHN: 0, DIL: 0, NGL: 0 };
}
function saveRegistrationSequencesToDisk(data) {
    try {
        const file = getRegistrationSequenceCachePath();
        fs_1.default.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    }
    catch (err) {
        console.warn("Failed to save registration sequences cache:", err);
    }
}
function getRegistrationSequencesStore() {
    if (!global.__sphRegistrationSequencesStore) {
        global.__sphRegistrationSequencesStore = loadRegistrationSequencesFromDisk();
    }
    return global.__sphRegistrationSequencesStore;
}
exports.registrationSequenceService = {
    getBranchCode(branchNameOrId) {
        return getBranchShortcut(branchNameOrId);
    },
    async getNextRegistrationId(branchNameOrId) {
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
    async peekNextRegistrationId(branchNameOrId) {
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
    async resetSequence(branchCode, startValue = 0) {
        const store = getRegistrationSequencesStore();
        store[branchCode] = startValue;
        global.__sphRegistrationSequencesStore = store;
        saveRegistrationSequencesToDisk(store);
    },
};
function getBranchTargetsCachePath() {
    const rootCache = path_1.default.join(process.cwd(), "..", "..", ".cache");
    if (!fs_1.default.existsSync(rootCache)) {
        fs_1.default.mkdirSync(rootCache, { recursive: true });
    }
    return path_1.default.join(rootCache, "branch_targets_store.json");
}
function loadBranchTargetsFromDisk() {
    try {
        const file = getBranchTargetsCachePath();
        if (fs_1.default.existsSync(file)) {
            const parsed = JSON.parse(fs_1.default.readFileSync(file, "utf-8"));
            if (Array.isArray(parsed)) {
                let modified = false;
                parsed.forEach((t) => {
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
    }
    catch (err) {
        console.warn("Failed to load branch targets from cache:", err);
    }
    return [];
}
function saveBranchTargetsToDisk(data) {
    const file = getBranchTargetsCachePath();
    safeAtomicWrite(file, data);
}
function getBranchTargetsStore() {
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
exports.branchTargetService = {
    getMonthWindowInfo,
    async canSetTarget(monthYear, role, branch) {
        const info = getMonthWindowInfo();
        const cleanBranch = normalizeBranchName(branch);
        const store = getBranchTargetsStore();
        const existing = store.find((t) => normalizeBranchName(t.branch) === cleanBranch && t.monthYear === monthYear);
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
    async setBranchTarget(data) {
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
        const existingIdx = store.findIndex((t) => normalizeBranchName(t.branch) === cleanBranch && t.monthYear === monthYear);
        const nowIso = new Date().toISOString();
        if (existingIdx >= 0) {
            const existing = store[existingIdx];
            existing.targetAmount = targetAmount;
            existing.updatedAt = nowIso;
            existing.setByRole = role;
            if (userName)
                existing.setByName = userName;
            if (role === "HR")
                existing.hrLocked = true;
            global.__sphBranchTargetsStore = store;
            saveBranchTargetsToDisk(store);
            return { success: true, target: existing };
        }
        else {
            const newRecord = {
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
    async getBranchTargets(monthYear, userRole = "ADMIN") {
        const info = getMonthWindowInfo();
        const activeMonth = monthYear || info.currentMonthKey;
        const allBranches = await exports.branchService.getAllBranches();
        const targetsStore = getBranchTargetsStore();
        const appointments = getAppointmentsStore();
        // Map targets with live revenue calculated per branch
        const branchResults = allBranches.map((b) => {
            const cleanBranch = normalizeBranchName(b.name);
            // 1. Target configured for this month
            const targetRecord = targetsStore.find((t) => normalizeBranchName(t.branch) === cleanBranch && t.monthYear === activeMonth);
            const targetGoal = targetRecord ? targetRecord.targetAmount : 0;
            // 2. Real-time live revenue reached: calculate sum of all completed appointments for THIS branch in THIS month
            const branchAppts = appointments.filter((a) => {
                if (a.isDeleted)
                    return false;
                if (a.isHistorical)
                    return false;
                const src = (a.marketingSource || "").toLowerCase();
                const notes = ((a.diagnosisNotes || "") + " " + (a.notes || "")).toLowerCase();
                if (src.includes("historical") ||
                    src.includes("old record") ||
                    src.includes("old entry") ||
                    src.includes("uploaded") ||
                    notes.includes("historical prescription") ||
                    notes.includes("historical entry")) {
                    return false;
                }
                // Check branch match
                const apptBranch = normalizeBranchName(a.branch);
                if (apptBranch !== cleanBranch)
                    return false;
                // Check completion status or paid payment
                const isPaidOrCompleted = a.status === "COMPLETED" ||
                    Boolean(a.paidAt) ||
                    Boolean(a.paymentMethod);
                if (!isPaidOrCompleted)
                    return false;
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
                const fee = typeof a.totalPaid === "number" && a.totalPaid > 0
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
                if (targetReached >= targetGoal)
                    status = "Achieved";
                else if (percentage >= 75)
                    status = "On Track";
                else if (percentage >= 40)
                    status = "In Progress";
                else
                    status = "Needs Attention";
            }
            // Permissions check
            const canEdit = userRole === "ADMIN" ||
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
/**
 * Returns today's date formatted strictly as DD-MM-YYYY
 */
function getTodayDDMMYYYY() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    return `${d}-${m}-${y}`;
}
/**
 * Normalizes any date string (ISO, YYYY-MM-DD, etc.) into DD-MM-YYYY
 */
function toDDMMYYYY(input) {
    if (!input)
        return getTodayDDMMYYYY();
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
function toYYYYMMDD(ddmmyyyy) {
    if (!ddmmyyyy)
        return "";
    const trimmed = ddmmyyyy.trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        const [d, m, y] = trimmed.split("-");
        return `${y}-${m}-${d}`;
    }
    return trimmed;
}
function getCleaningCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "cleaning_tasks_store.json"))) {
        return path_1.default.join(webCache, "cleaning_tasks_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "cleaning_tasks_store.json"))) {
        return path_1.default.join(rootCache, "cleaning_tasks_store.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "cleaning_tasks_store.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".cleaning_tasks_store.json");
        }
    }
    return path_1.default.join(rootCache, "cleaning_tasks_store.json");
}
function loadCleaningTasksFromDisk() {
    try {
        const file = getCleaningCachePath();
        if (fs_1.default.existsSync(file)) {
            const content = fs_1.default.readFileSync(file, "utf-8");
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed))
                return parsed;
        }
    }
    catch (err) {
        console.warn("Failed to read cleaning tasks cache:", err);
    }
    return [];
}
function saveCleaningTasksToDisk(data) {
    try {
        const file = getCleaningCachePath();
        fs_1.default.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    }
    catch (err) {
        console.warn("Failed to write cleaning tasks cache:", err);
    }
}
function getCleaningTasksStore() {
    if (!global.__sphCleaningTasksStore) {
        global.__sphCleaningTasksStore = loadCleaningTasksFromDisk();
    }
    return global.__sphCleaningTasksStore;
}
exports.cleaningTaskService = {
    async getAllTasks(filter) {
        let tasks = getCleaningTasksStore();
        if (filter?.branchName && filter.branchName !== "ALL") {
            const cleanFilter = filter.branchName.toLowerCase().replace(/branch/gi, "").trim();
            tasks = tasks.filter((t) => t.branchName.toLowerCase().replace(/branch/gi, "").trim().includes(cleanFilter));
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
    async getTaskById(id) {
        const tasks = getCleaningTasksStore();
        return tasks.find((t) => t.id === id) || null;
    },
    async createTask(input) {
        const tasks = getCleaningTasksStore();
        const dateFormatted = toDDMMYYYY(input.assignedDate);
        // Build fields array
        const fields = input.fieldNames.map((name, index) => ({
            id: `fld-${Date.now()}-${index}`,
            name: name.trim(),
            photos: [],
            status: "PENDING",
        }));
        const newTask = {
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
    async updateTask(id, updates) {
        const tasks = getCleaningTasksStore();
        const idx = tasks.findIndex((t) => t.id === id);
        if (idx === -1)
            return null;
        const existing = tasks[idx];
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        tasks[idx] = updated;
        global.__sphCleaningTasksStore = tasks;
        saveCleaningTasksToDisk(tasks);
        return updated;
    },
    async submitPhotosForVerification(taskId, fieldsData, submittedBy) {
        const tasks = getCleaningTasksStore();
        const idx = tasks.findIndex((t) => t.id === taskId);
        if (idx === -1)
            return null;
        const task = tasks[idx];
        // Update each field's photos
        const updatedFields = task.fields.map((field) => {
            const match = fieldsData.find((f) => f.fieldId === field.id);
            if (match) {
                return {
                    ...field,
                    photos: match.photos,
                    status: match.photos.length > 0 ? "UPLOADED" : field.status,
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
    async reviewTask(taskId, review) {
        const tasks = getCleaningTasksStore();
        const idx = tasks.findIndex((t) => t.id === taskId);
        if (idx === -1)
            return null;
        const task = tasks[idx];
        if (review.action === "APPROVE") {
            task.status = "APPROVED";
            task.reviewedBy = review.reviewedBy;
            task.reviewedRole = review.reviewedRole;
            task.reviewedAt = new Date().toISOString();
            task.reviewRemarks = review.remarks || "All cleaning photos verified and approved.";
            task.fields = task.fields.map((f) => ({
                ...f,
                status: "APPROVED",
                rejectReason: undefined,
            }));
            task.historyLogs.push({
                action: "TASK_APPROVED",
                performedBy: review.reviewedBy,
                performedRole: review.reviewedRole,
                timestamp: new Date().toISOString(),
                remarks: review.remarks || "Approved all inspection areas. Reception unlocked.",
            });
        }
        else {
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
                        status: "REJECTED",
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
    async checkLockout(branchName, targetDateStr) {
        if (!branchName)
            return { lockout: false, task: null };
        const dateStr = targetDateStr ? toDDMMYYYY(targetDateStr) : getTodayDDMMYYYY();
        const cleanBranch = branchName.toLowerCase().replace(/branch/gi, "").trim();
        const tasks = getCleaningTasksStore();
        const matchingTask = tasks.find((t) => t.branchName.toLowerCase().replace(/branch/gi, "").trim().includes(cleanBranch) &&
            t.assignedDate === dateStr);
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
        }
        else if (matchingTask.status === "REJECTED") {
            msg = "Cleaning photos were rejected. Please check feedback and re-upload.";
        }
        return {
            lockout: true,
            task: matchingTask,
            message: msg,
        };
    },
    async deleteTask(id) {
        const tasks = getCleaningTasksStore();
        const filtered = tasks.filter((t) => t.id !== id);
        if (filtered.length === tasks.length)
            return false;
        global.__sphCleaningTasksStore = filtered;
        saveCleaningTasksToDisk(filtered);
        return true;
    },
};
function getMedicineRequestsCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "medicine_requests_store.json"))) {
        return path_1.default.join(webCache, "medicine_requests_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "medicine_requests_store.json"))) {
        return path_1.default.join(rootCache, "medicine_requests_store.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "medicine_requests_store.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".medicine_requests_store.json");
        }
    }
    return path_1.default.join(rootCache, "medicine_requests_store.json");
}
function saveMedicineRequestsToDisk(data) {
    const file = getMedicineRequestsCachePath();
    safeAtomicWrite(file, data);
}
function getMedicineRequestsStore() {
    if (global.__sphMedicineRequestsStore && global.__sphMedicineRequestsStore.length > 0) {
        return global.__sphMedicineRequestsStore;
    }
    const file = getMedicineRequestsCachePath();
    if (fs_1.default.existsSync(file)) {
        try {
            const content = fs_1.default.readFileSync(file, "utf8");
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                global.__sphMedicineRequestsStore = parsed;
                return parsed;
            }
        }
        catch (e) {
            console.warn("Failed to load medicine requests from disk:", e);
        }
    }
    global.__sphMedicineRequestsStore = [];
    return [];
}
exports.medicineRequestService = {
    async getAllRequests(branch, status) {
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
    async createRequest(data) {
        const store = getMedicineRequestsStore();
        const generatedId = `med_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newRecord = {
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
    async updateRequestStatus(id, status) {
        const store = getMedicineRequestsStore();
        const item = store.find((r) => r.id === id || r.requestId === id);
        if (!item)
            return null;
        item.status = status;
        item.updatedAt = new Date().toISOString();
        global.__sphMedicineRequestsStore = store;
        saveMedicineRequestsToDisk(store);
        return item;
    },
    async deleteRequest(id) {
        const store = getMedicineRequestsStore();
        const filtered = store.filter((r) => r.id !== id && r.requestId !== id);
        if (filtered.length === store.length)
            return false;
        global.__sphMedicineRequestsStore = filtered;
        saveMedicineRequestsToDisk(filtered);
        return true;
    },
};
function getStaffAttendanceCachePath() {
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    return path_1.default.join(rootCache, "staff_attendance_store.json");
}
function loadStaffAttendanceFromDisk() {
    try {
        const file = getStaffAttendanceCachePath();
        if (fs_1.default.existsSync(file)) {
            const parsed = JSON.parse(fs_1.default.readFileSync(file, "utf-8"));
            if (Array.isArray(parsed))
                return parsed;
        }
    }
    catch (e) {
        console.warn("Failed reading staff attendance cache:", e);
    }
    return [];
}
function saveStaffAttendanceToDisk(data) {
    try {
        const file = getStaffAttendanceCachePath();
        fs_1.default.mkdirSync(path_1.default.dirname(file), { recursive: true });
        fs_1.default.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    }
    catch (e) {
        console.warn("Failed writing staff attendance cache:", e);
    }
}
function getStaffAttendanceStore() {
    if (!global.__sphStaffAttendanceStore) {
        global.__sphStaffAttendanceStore = loadStaffAttendanceFromDisk();
    }
    return global.__sphStaffAttendanceStore;
}
exports.staffAttendanceService = {
    async getAllRecords(branch, date) {
        const store = getStaffAttendanceStore();
        return store.filter((r) => {
            const matchBranch = !branch || branch === "All Branches" || r.branch.toLowerCase().includes(branch.toLowerCase());
            const matchDate = !date || r.date === date;
            return matchBranch && matchDate;
        });
    },
    async getTodayRecord(staffId, dateStr) {
        const today = dateStr || new Date().toISOString().split("T")[0];
        const store = getStaffAttendanceStore();
        return store.find((r) => r.staffId === staffId && r.date === today) || null;
    },
    async recordPunch(payload) {
        const store = getStaffAttendanceStore();
        const today = new Date().toISOString().split("T")[0];
        const nowTime = new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
        let existing = store.find((r) => r.staffId === payload.staffId && r.date === today);
        // Calculate late status on Punch In (Dynamic shift & grace period configured by HR/Admin)
        if (payload.type === "in") {
            const now = new Date();
            let shiftHour = 9;
            let shiftMin = 0;
            let grace = 15;
            try {
                const lateConfig = await exports.payrollSettingsService.getLatePenaltyConfig();
                if (lateConfig) {
                    grace = Number(lateConfig.graceMinutes) || 15;
                    if (lateConfig.shiftStartTime) {
                        const timeParts = lateConfig.shiftStartTime.trim().split(" ");
                        const hm = timeParts[0].split(":");
                        let h = parseInt(hm[0], 10) || 9;
                        const m = parseInt(hm[1], 10) || 0;
                        if (timeParts[1] && timeParts[1].toUpperCase() === "PM" && h < 12)
                            h += 12;
                        if (timeParts[1] && timeParts[1].toUpperCase() === "AM" && h === 12)
                            h = 0;
                        shiftHour = h;
                        shiftMin = m;
                    }
                }
            }
            catch { }
            const shiftStart = new Date();
            shiftStart.setHours(shiftHour, shiftMin, 0, 0);
            const diffMinutes = Math.max(0, Math.floor((now.getTime() - shiftStart.getTime()) / (1000 * 60)));
            const isLate = diffMinutes > grace;
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
            }
            else {
                existing.punchInTime = nowTime;
                existing.punchInLocation = payload.location;
                existing.punchInPhoto = payload.photo;
                existing.punchInCoords = payload.coords || undefined;
                existing.status = isLate ? "Late" : "Present";
                existing.lateMinutes = diffMinutes;
                existing.updatedAt = new Date().toISOString();
            }
        }
        else {
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
            }
            else {
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
                    }
                    catch {
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
function getStaffLeavesCachePath() {
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    return path_1.default.join(rootCache, "staff_leaves_store.json");
}
exports.INITIAL_STAFF_LEAVES = [
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
function loadStaffLeavesFromDisk() {
    try {
        const file = getStaffLeavesCachePath();
        if (fs_1.default.existsSync(file)) {
            const parsed = JSON.parse(fs_1.default.readFileSync(file, "utf-8"));
            if (Array.isArray(parsed) && parsed.length > 0)
                return parsed;
        }
    }
    catch (e) {
        console.warn("Failed reading staff leaves cache:", e);
    }
    saveStaffLeavesToDisk(exports.INITIAL_STAFF_LEAVES);
    return [...exports.INITIAL_STAFF_LEAVES];
}
function saveStaffLeavesToDisk(data) {
    try {
        const file = getStaffLeavesCachePath();
        fs_1.default.mkdirSync(path_1.default.dirname(file), { recursive: true });
        fs_1.default.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    }
    catch (e) {
        console.warn("Failed writing staff leaves cache:", e);
    }
}
function getStaffLeavesStore() {
    if (!global.__sphStaffLeavesStore) {
        global.__sphStaffLeavesStore = loadStaffLeavesFromDisk();
    }
    return global.__sphStaffLeavesStore;
}
exports.staffLeaveService = {
    async getAllLeaves(staffId) {
        const store = getStaffLeavesStore();
        if (staffId) {
            return store.filter((l) => l.staffId === staffId);
        }
        return store;
    },
    async applyLeave(payload) {
        const store = getStaffLeavesStore();
        const newRecord = {
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
    async approveLeave(id, reviewedBy = "Admin") {
        const store = getStaffLeavesStore();
        const item = store.find((l) => l.id === id);
        if (!item)
            return null;
        item.status = "Approved";
        item.reviewedBy = reviewedBy;
        item.updatedAt = new Date().toISOString();
        global.__sphStaffLeavesStore = store;
        saveStaffLeavesToDisk(store);
        return item;
    },
    async rejectLeave(id, rejectionReason, reviewedBy = "Admin") {
        const store = getStaffLeavesStore();
        const item = store.find((l) => l.id === id);
        if (!item)
            return null;
        item.status = "Rejected";
        item.rejectionReason = rejectionReason;
        item.reviewedBy = reviewedBy;
        item.updatedAt = new Date().toISOString();
        global.__sphStaffLeavesStore = store;
        saveStaffLeavesToDisk(store);
        return item;
    },
};
function getStaffDailyWorksCachePath() {
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    return path_1.default.join(rootCache, "staff_daily_works_store.json");
}
function loadStaffDailyWorksFromDisk() {
    try {
        const file = getStaffDailyWorksCachePath();
        if (fs_1.default.existsSync(file)) {
            const parsed = JSON.parse(fs_1.default.readFileSync(file, "utf-8"));
            if (Array.isArray(parsed))
                return parsed;
        }
    }
    catch (e) {
        console.warn("Failed reading staff daily works cache:", e);
    }
    return [];
}
function saveStaffDailyWorksToDisk(data) {
    try {
        const file = getStaffDailyWorksCachePath();
        fs_1.default.mkdirSync(path_1.default.dirname(file), { recursive: true });
        fs_1.default.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    }
    catch (e) {
        console.warn("Failed writing staff daily works cache:", e);
    }
}
function getStaffDailyWorksStore() {
    if (!global.__sphStaffDailyWorksStore) {
        global.__sphStaffDailyWorksStore = loadStaffDailyWorksFromDisk();
    }
    return global.__sphStaffDailyWorksStore;
}
exports.staffDailyWorkService = {
    async getAllReports(staffId, date) {
        const store = getStaffDailyWorksStore();
        return store.filter((r) => {
            const matchStaff = !staffId || r.staffId === staffId;
            const matchDate = !date || r.date === date;
            return matchStaff && matchDate;
        });
    },
    async getTodayReport(staffId, dateStr) {
        const today = dateStr || new Date().toISOString().split("T")[0];
        const store = getStaffDailyWorksStore();
        return store.find((r) => r.staffId === staffId && r.date === today) || null;
    },
    async submitReport(payload) {
        const store = getStaffDailyWorksStore();
        const existing = store.find((r) => r.staffId === payload.staffId && r.date === payload.date);
        if (existing) {
            Object.assign(existing, payload);
            saveStaffDailyWorksToDisk(store);
            return existing;
        }
        const newRecord = {
            ...payload,
            id: `DW-${Date.now()}`,
        };
        store.unshift(newRecord);
        global.__sphStaffDailyWorksStore = store;
        saveStaffDailyWorksToDisk(store);
        return newRecord;
    },
};
function getPayCutsCachePath() {
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    return path_1.default.join(rootCache, "staff_pay_cuts_store.json");
}
function loadPayCutsFromDisk() {
    try {
        const file = getPayCutsCachePath();
        if (fs_1.default.existsSync(file)) {
            const parsed = JSON.parse(fs_1.default.readFileSync(file, "utf-8"));
            if (Array.isArray(parsed))
                return parsed;
        }
    }
    catch (e) {
        console.warn("Failed reading pay cuts cache:", e);
    }
    return [];
}
function savePayCutsToDisk(data) {
    try {
        const file = getPayCutsCachePath();
        fs_1.default.mkdirSync(path_1.default.dirname(file), { recursive: true });
        fs_1.default.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    }
    catch (e) {
        console.warn("Failed writing pay cuts cache:", e);
    }
}
function getPayCutsStore() {
    if (!global.__sphPayCutsStore) {
        global.__sphPayCutsStore = loadPayCutsFromDisk();
    }
    return global.__sphPayCutsStore;
}
exports.payCutService = {
    async getAllPayCuts(employeeId, month) {
        const store = getPayCutsStore();
        return store.filter((p) => {
            const matchEmp = !employeeId || p.employeeId === employeeId;
            const matchMonth = !month || p.month === month;
            return matchEmp && matchMonth;
        });
    },
    async createPayCut(payload) {
        const store = getPayCutsStore();
        const newCut = {
            ...payload,
            id: `PC-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        store.unshift(newCut);
        global.__sphPayCutsStore = store;
        savePayCutsToDisk(store);
        return newCut;
    },
    async deletePayCut(id) {
        const store = getPayCutsStore();
        const filtered = store.filter((p) => p.id !== id);
        if (filtered.length === store.length)
            return false;
        global.__sphPayCutsStore = filtered;
        savePayCutsToDisk(filtered);
        return true;
    },
};
const DEFAULT_LATE_CONFIG = {
    shiftStartTime: "09:00 AM",
    graceMinutes: 15,
    lateThresholdDays: 3,
    lateThresholdMinutes: 15,
    penaltyAmount: 500,
};
function getLateConfigCachePath() {
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    return path_1.default.join(rootCache, "late_penalty_config.json");
}
function loadLateConfigFromDisk() {
    try {
        const file = getLateConfigCachePath();
        if (fs_1.default.existsSync(file)) {
            return { ...DEFAULT_LATE_CONFIG, ...JSON.parse(fs_1.default.readFileSync(file, "utf-8")) };
        }
    }
    catch (e) {
        console.warn("Failed reading late penalty config:", e);
    }
    return { ...DEFAULT_LATE_CONFIG };
}
function saveLateConfigToDisk(cfg) {
    try {
        const file = getLateConfigCachePath();
        fs_1.default.mkdirSync(path_1.default.dirname(file), { recursive: true });
        fs_1.default.writeFileSync(file, JSON.stringify(cfg, null, 2), "utf-8");
    }
    catch (e) {
        console.warn("Failed writing late penalty config:", e);
    }
}
exports.payrollSettingsService = {
    async getLatePenaltyConfig() {
        if (!global.__sphLatePenaltyConfig) {
            global.__sphLatePenaltyConfig = loadLateConfigFromDisk();
        }
        return global.__sphLatePenaltyConfig;
    },
    async updateLatePenaltyConfig(updates) {
        const current = await exports.payrollSettingsService.getLatePenaltyConfig();
        const updated = { ...current, ...updates };
        global.__sphLatePenaltyConfig = updated;
        saveLateConfigToDisk(updated);
        return updated;
    },
};
// ============================================================================
// PACKAGE MEMBERS SERVICE
// ============================================================================
function getPackageMembersCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "package_members_store.json"))) {
        return path_1.default.join(webCache, "package_members_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "package_members_store.json"))) {
        return path_1.default.join(rootCache, "package_members_store.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "package_members_store.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".package_members_store.json");
        }
    }
    return path_1.default.join(rootCache, "package_members_store.json");
}
function loadPackageMembersFromDisk() {
    try {
        const file = getPackageMembersCachePath();
        if (fs_1.default.existsSync(file)) {
            const parsed = JSON.parse(fs_1.default.readFileSync(file, "utf-8"));
            if (Array.isArray(parsed))
                return parsed;
        }
    }
    catch (err) {
        console.warn("Failed to load package members from cache:", err);
    }
    return [];
}
function savePackageMembersToDisk(data) {
    const file = getPackageMembersCachePath();
    safeAtomicWrite(file, data);
}
function getPackageMembersStore() {
    if (!global.__sphPackageMembersStore) {
        global.__sphPackageMembersStore = loadPackageMembersFromDisk();
    }
    return global.__sphPackageMembersStore;
}
exports.packageService = {
    async getAllPackageMembers(branch) {
        let list = getPackageMembersStore();
        if (branch) {
            const cleanTarget = normalizeBranchName(branch);
            if (cleanTarget && cleanTarget !== "all branches" && cleanTarget !== "all") {
                list = list.filter((p) => {
                    const pb = normalizeBranchName(p.branch);
                    return pb === cleanTarget || pb.includes(cleanTarget) || cleanTarget.includes(pb);
                });
            }
        }
        return list;
    },
    async getPackageByProfile(regIdOrPhone, patientName) {
        const store = getPackageMembersStore();
        const isPhone = /^\d{10}$/.test(normalizePhone(regIdOrPhone));
        const cleanReg = !isPhone && isExplicitRegId(regIdOrPhone) ? regIdOrPhone.trim().toUpperCase() : "";
        const cleanPhone = normalizePhone(regIdOrPhone);
        const normName = normalizePatientName(patientName || "");

        // 1. If valid explicit registration ID is provided, match by registration ID:
        if (cleanReg) {
            const found = store.find((p) => isExplicitRegId(p.registrationId) && (p.registrationId || "").trim().toUpperCase() === cleanReg);
            if (found)
                return found;
        }

        // 2. If phone is provided, we MUST match BOTH phone AND exact patient name!
        if (cleanPhone.length >= 10 && normName) {
            const found = store.find((p) => {
                const pPhone = normalizePhone(p.phone);
                if (pPhone.slice(-10) !== cleanPhone.slice(-10)) return false;
                return matchPatientProfile({ phone: cleanPhone, patientName }, p);
            });
            if (found)
                return found;
        }

        return null;
    },
    async registerPackage(data) {
        const store = getPackageMembersStore();
        const cleanReg = (data.registrationId || "").trim().toUpperCase();
        const cleanPhone = normalizePhone(data.phone);
        const cleanName = data.patientName.trim();
        const cleanBranch = data.branch.trim();
        const duration = Math.max(1, Math.min(7, data.durationMonths || 1));
        const total = Math.max(0, data.totalAmount || 0);
        const initialPaid = Math.max(0, data.initialPaidAmount || 0);
        const pending = Math.max(0, total - initialPaid);
        const now = new Date();
        const startYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const endDateObj = new Date(now.getFullYear(), now.getMonth() + duration, now.getDate());
        const endYmd = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, "0")}-${String(endDateObj.getDate()).padStart(2, "0")}`;
        const payments = [];
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
                throw new Error(`Patient ${data.patientName} already has an active package (${existing.packageName}) valid till ${existing.endDate}. Another package cannot be registered until the current package expires.`);
            }
            const updated = {
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
            return updated;
        }
        const newPkg = {
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
        return newPkg;
    },
    async recordPackagePayment(packageIdOrRegId, data) {
        const store = getPackageMembersStore();
        const cleanId = packageIdOrRegId.trim().toUpperCase();
        const idx = store.findIndex((p) => p.id === packageIdOrRegId || (p.registrationId || "").trim().toUpperCase() === cleanId);
        if (idx === -1)
            return null;
        const pkg = store[idx];
        const newPayment = {
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
        return pkg;
    },
};
function getPayLaterCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "pay_later_store.json"))) {
        return path_1.default.join(webCache, "pay_later_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "pay_later_store.json"))) {
        return path_1.default.join(rootCache, "pay_later_store.json");
    }
    return path_1.default.join(webCache, "pay_later_store.json");
}
function savePayLaterToDisk(store) {
    try {
        const filePath = getPayLaterCachePath();
        const dir = path_1.default.dirname(filePath);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        fs_1.default.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf8");
    }
    catch (err) {
        console.warn("Failed to persist pay later store to disk:", err);
    }
}
function getPayLaterStore() {
    if (global.__sphPayLaterStore && Array.isArray(global.__sphPayLaterStore)) {
        return global.__sphPayLaterStore;
    }
    const filePath = getPayLaterCachePath();
    if (fs_1.default.existsSync(filePath)) {
        try {
            const data = fs_1.default.readFileSync(filePath, "utf8");
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                global.__sphPayLaterStore = parsed;
                return parsed;
            }
        }
        catch { }
    }
    global.__sphPayLaterStore = [];
    return [];
}
exports.payLaterService = {
    async getAll(branch, status) {
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
    async getPendingByPatient(phoneOrRegId) {
        const clean = phoneOrRegId.replace(/\D/g, "").slice(-10);
        const store = getPayLaterStore();
        return store.filter((r) => {
            if (r.status === "CLEARED")
                return false;
            const rPhone = (r.phone || "").replace(/\D/g, "").slice(-10);
            const rReg = (r.registrationId || "").trim().toLowerCase();
            const targetReg = phoneOrRegId.trim().toLowerCase();
            return (clean && rPhone === clean) || (rReg && rReg === targetReg);
        });
    },
    async createPayLater(data) {
        const store = getPayLaterStore();
        const id = data.id || `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newRecord = {
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
    async settleBalance(phoneOrRegId, amountCleared, clearedInvoiceId, clearedAppointmentId) {
        const clean = phoneOrRegId.replace(/\D/g, "").slice(-10);
        const store = getPayLaterStore();
        let remainingToClear = amountCleared;
        const updatedRecords = [];
        for (const r of store) {
            if (remainingToClear <= 0)
                break;
            if (r.status === "CLEARED")
                continue;
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
                }
                else {
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
    async manualSettle(id, amount, clearedInvoiceId) {
        const store = getPayLaterStore();
        const item = store.find((r) => r.id === id);
        if (!item)
            return null;
        if (amount >= item.pendingAmount) {
            item.clearedAmount = (item.clearedAmount || 0) + item.pendingAmount;
            item.pendingAmount = 0;
            item.status = "CLEARED";
            item.clearedAt = new Date().toISOString();
            item.clearedInvoiceId = clearedInvoiceId || `REC-CLR-${Date.now().toString().slice(-6)}`;
        }
        else {
            item.pendingAmount -= amount;
            item.clearedAmount = (item.clearedAmount || 0) + amount;
            item.status = "PARTIALLY_PAID";
            item.updatedAt = new Date().toISOString();
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
        return item;
    },
    async getSummary(branch) {
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
        const uniquePatients = new Set();
        const branchMap = {
            "KPHB Branch": { pending: 0, cleared: 0, count: 0 },
            "Chandanagar Branch": { pending: 0, cleared: 0, count: 0 },
            "Dilshuknagar Branch": { pending: 0, cleared: 0, count: 0 },
            "Nallagandla Branch": { pending: 0, cleared: 0, count: 0 },
        };
        for (const r of filtered) {
            const bName = Object.keys(branchMap).find((k) => k.toLowerCase().includes(r.branch.toLowerCase().replace(/branch/gi, "").trim())) || "KPHB Branch";
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
exports.INITIAL_CALL_LOGS = [
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
function getCallLogsCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "telecaller_call_logs.json"))) {
        return path_1.default.join(webCache, "telecaller_call_logs.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "telecaller_call_logs.json"))) {
        return path_1.default.join(rootCache, "telecaller_call_logs.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "telecaller_call_logs.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".telecaller_call_logs.json");
        }
    }
    return path_1.default.join(rootCache, "telecaller_call_logs.json");
}
function loadCallLogsFromDisk() {
    try {
        const file = getCallLogsCachePath();
        if (fs_1.default.existsSync(file)) {
            const content = fs_1.default.readFileSync(file, "utf-8");
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length > 0)
                return parsed;
        }
    }
    catch (err) {
        console.warn("Failed to read telecaller call logs cache:", err);
    }
    saveCallLogsToDisk(exports.INITIAL_CALL_LOGS);
    return [...exports.INITIAL_CALL_LOGS];
}
function saveCallLogsToDisk(data) {
    try {
        const file = getCallLogsCachePath();
        fs_1.default.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    }
    catch (err) {
        console.warn("Failed to write telecaller call logs cache:", err);
    }
}
function getCallLogsStore() {
    if (!global.__sphCallLogsStore) {
        global.__sphCallLogsStore = loadCallLogsFromDisk();
    }
    return global.__sphCallLogsStore;
}
exports.telecallerCallLogService = {
    async getAllLogs(filters) {
        const store = getCallLogsStore();
        let result = [...store];
        if (filters?.telecallerId && filters.telecallerId !== "ALL") {
            result = result.filter((l) => l.telecallerId?.toLowerCase() === filters.telecallerId?.toLowerCase());
        }
        if (filters?.branch && filters.branch !== "ALL" && filters.branch !== "All Branches") {
            const cleanBranch = filters.branch.toLowerCase().replace(/branch/gi, "").trim();
            result = result.filter((l) => l.branch.toLowerCase().replace(/branch/gi, "").trim().includes(cleanBranch));
        }
        if (filters?.outcome && filters.outcome !== "ALL" && filters.outcome !== "All Outcomes") {
            result = result.filter((l) => l.callOutcome?.toLowerCase() === filters.outcome?.toLowerCase());
        }
        if (filters?.search && filters.search.trim().length > 0) {
            const q = filters.search.toLowerCase().trim();
            result = result.filter((l) => l.patientName?.toLowerCase().includes(q) ||
                l.phone?.includes(q) ||
                l.agentName?.toLowerCase().includes(q) ||
                l.notes?.toLowerCase().includes(q) ||
                l.id?.toLowerCase().includes(q));
        }
        return result;
    },
    async createLog(input) {
        const store = getCallLogsStore();
        const cleanPhone = (input.phone || "").replace(/\D/g, "").slice(-10);
        const newRecord = {
            id: input.id || `LOG-${Date.now().toString().slice(-6)}`,
            telecallerId: input.telecallerId || "TC01",
            agentName: input.agentName ? input.agentName.trim() : "Telecaller",
            patientName: input.patientName ? input.patientName.trim() : "Patient",
            phone: cleanPhone,
            branch: input.branch ? input.branch.trim() : "KPHB Branch",
            callOutcome: input.callOutcome || "Interested",
            notes: input.notes ? input.notes.trim() : "",
            dateTime: input.dateTime || new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }),
            duration: input.duration || "1m 30s",
            createdAt: new Date().toISOString(),
        };
        store.unshift(newRecord);
        global.__sphCallLogsStore = store;
        saveCallLogsToDisk(store);
        return newRecord;
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
exports.INITIAL_SHARED_MEDIA_FOLDERS = [
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
function getSharedMediaCachePath() {
    const webCache = path_1.default.resolve(process.cwd(), "apps/web/node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(webCache, "shared_media_store.json"))) {
        return path_1.default.join(webCache, "shared_media_store.json");
    }
    const rootCache = path_1.default.resolve(process.cwd(), "node_modules/.cache");
    if (fs_1.default.existsSync(path_1.default.join(rootCache, "shared_media_store.json"))) {
        return path_1.default.join(rootCache, "shared_media_store.json");
    }
    if (fs_1.default.existsSync(webCache)) {
        return path_1.default.join(webCache, "shared_media_store.json");
    }
    if (!fs_1.default.existsSync(rootCache)) {
        try {
            fs_1.default.mkdirSync(rootCache, { recursive: true });
        }
        catch {
            return path_1.default.resolve(process.cwd(), ".shared_media_store.json");
        }
    }
    return path_1.default.join(rootCache, "shared_media_store.json");
}
function saveSharedMediaToDisk(data) {
    const file = getSharedMediaCachePath();
    safeAtomicWrite(file, data);
}
function getSharedMediaStore() {
    if (global.__sphSharedMediaStore && global.__sphSharedMediaStore.length > 0) {
        return global.__sphSharedMediaStore;
    }
    const file = getSharedMediaCachePath();
    if (fs_1.default.existsSync(file)) {
        try {
            const content = fs_1.default.readFileSync(file, "utf8");
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length > 0) {
                global.__sphSharedMediaStore = parsed;
                return parsed;
            }
        }
        catch (e) {
            console.warn("Failed to load shared media from disk:", e);
        }
    }
    const initial = JSON.parse(JSON.stringify(exports.INITIAL_SHARED_MEDIA_FOLDERS));
    global.__sphSharedMediaStore = initial;
    saveSharedMediaToDisk(initial);
    return initial;
}
exports.sharedMediaService = {
    async getAllFolders() {
        return getSharedMediaStore();
    },
    async createFolder(data) {
        const store = getSharedMediaStore();
        const newFolder = {
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
    async deleteFolder(folderId) {
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
    async addLinkToFolder(folderId, data) {
        const store = getSharedMediaStore();
        const folder = store.find((f) => f.id === folderId);
        if (!folder)
            return null;
        if (!Array.isArray(folder.links)) {
            folder.links = [];
        }
        const newLink = {
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
    async deleteLinkFromFolder(folderId, linkId) {
        const store = getSharedMediaStore();
        const folder = store.find((f) => f.id === folderId);
        if (!folder || !Array.isArray(folder.links))
            return false;
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
