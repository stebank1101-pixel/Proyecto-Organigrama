import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabaseClient.js";

export const app = express();

app.use(express.json({ limit: "25mb" }));

// Fallback in-memory store, used only when SUPABASE_URL / SUPABASE_ANON_KEY aren't configured.
let inMemoryNodes = [
  {
    id: "node-1",
    name: "Dra. Carolina Alarcón",
    title: "Chief Executive Officer (CEO)",
    department: "Dirección General",
    sede: "Madrid - Sede Central",
    email: "carolina.alarcon@empresa.com",
    phone: "+34 912 345 678",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    roleType: "executive",
    parentId: null,
    freeX: 450,
    freeY: 60,
    metrics: { headcount: 42, budget: "€2.8M" },
    status: "active",
    customBadge: "Comité Ejecutivo",
    iconName: "Crown"
  },
  {
    id: "node-2",
    name: "Ing. Roberto Benítez",
    title: "VP de Tecnología e Innovación",
    department: "Tecnología",
    sede: "Madrid - Sede Central",
    email: "roberto.benitez@empresa.com",
    phone: "+34 912 345 679",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
    roleType: "director",
    parentId: "node-1",
    freeX: 180,
    freeY: 220,
    metrics: { headcount: 18, budget: "€1.1M" },
    status: "active",
    customBadge: "Tech Core",
    iconName: "Cpu"
  },
  {
    id: "node-3",
    name: "Lic. Mariana Valenzuela",
    title: "Director Global de Recursos Humanos",
    department: "Recursos Humanos",
    sede: "CDMX - Tech Hub",
    email: "mariana.valenzuela@empresa.com",
    phone: "+52 55 1234 5678",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    roleType: "director",
    parentId: "node-1",
    freeX: 450,
    freeY: 220,
    metrics: { headcount: 12, budget: "€650K" },
    status: "active",
    customBadge: "Talent & Culture",
    iconName: "Users"
  },
  {
    id: "node-4",
    name: "Mtr. Fernando Sotomayor",
    title: "Chief Financial Officer (CFO)",
    department: "Finanzas y Riesgos",
    sede: "Bogotá - Sede Regional",
    email: "fernando.sotomayor@empresa.com",
    phone: "+57 1 987 6543",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    roleType: "executive",
    parentId: "node-1",
    freeX: 720,
    freeY: 220,
    metrics: { headcount: 8, budget: "€850K" },
    status: "active",
    customBadge: "Compliance & Finance",
    iconName: "Briefcase"
  },
  {
    id: "node-5",
    name: "Ing. Sofía Morales",
    title: "Lead Systems Architect",
    department: "Tecnología",
    sede: "CDMX - Tech Hub",
    email: "sofia.morales@empresa.com",
    phone: "+52 55 9876 5432",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    roleType: "manager",
    parentId: "node-2",
    freeX: 80,
    freeY: 390,
    metrics: { headcount: 6, budget: "€320K" },
    status: "active",
    customBadge: "Cloud Infrastructure",
    iconName: "Server"
  },
  {
    id: "node-6",
    name: "Carlos Eduardo Paez",
    title: "Head of Product Design & UX",
    department: "Producto",
    sede: "Remote / Global",
    email: "carlos.paez@empresa.com",
    phone: "+34 600 112 233",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    roleType: "manager",
    parentId: "node-2",
    freeX: 280,
    freeY: 390,
    metrics: { headcount: 5, budget: "€280K" },
    status: "active",
    customBadge: "Design System Lead",
    iconName: "Palette"
  }
];

// Org nodes persist in Supabase (table "org_nodes", one row per node with a jsonb "data" column)
// when SUPABASE_URL / SUPABASE_ANON_KEY are set; otherwise fall back to the in-memory array above.
async function loadNodes(): Promise<any[]> {
  if (!supabase) return inMemoryNodes;
  const { data, error } = await supabase.from("org_nodes").select("data");
  if (error) throw new Error(error.message);
  return data.map((row) => row.data);
}

async function saveNodes(nodes: any[]): Promise<void> {
  if (!supabase) {
    inMemoryNodes = nodes;
    return;
  }
  const { error: deleteError } = await supabase.from("org_nodes").delete().not("id", "is", null);
  if (deleteError) throw new Error(deleteError.message);
  if (nodes.length > 0) {
    const rows = nodes.map((n) => ({ id: n.id, data: n }));
    const { error: insertError } = await supabase.from("org_nodes").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }
}

// Work centers ("sedes") that don't have any node yet aren't inferable from org_nodes,
// so they get their own table ("work_centers") when Supabase is configured, or an
// in-memory list otherwise. Centers that already have nodes are derived from node.sede
// on the client and merged with the profile data stored here.
interface WorkCenterRecord {
  name: string;
  address: string;
  email: string;
  phone: string;
  headcount: number;
  budget: string;
  icon: string;
  isDefault: boolean;
  logo: string;
  backgroundColor: string;
  backgroundImage: string;
}

function blankCenter(name: string): WorkCenterRecord {
  return {
    name,
    address: "",
    email: "",
    phone: "",
    headcount: 0,
    budget: "",
    icon: "",
    isDefault: false,
    logo: "",
    backgroundColor: "",
    backgroundImage: ""
  };
}

// updateWorkCenterProfile forwards profile keys straight through to Supabase as column
// names; most already match (address, email, icon...) but a few multi-word fields use
// snake_case columns, so those need translating before they reach the query.
const CAMEL_TO_SNAKE_COLUMNS: Record<string, string> = {
  isDefault: "is_default",
  backgroundColor: "background_color",
  backgroundImage: "background_image"
};

let inMemoryWorkCenters: WorkCenterRecord[] = [];

async function loadWorkCenters(): Promise<WorkCenterRecord[]> {
  if (!supabase) return inMemoryWorkCenters;
  const { data, error } = await supabase.from("work_centers").select("*").order("name");
  if (error) throw new Error(error.message);
  return data.map((row: any) => ({
    name: row.name,
    address: row.address || "",
    email: row.email || "",
    phone: row.phone || "",
    headcount: row.headcount || 0,
    budget: row.budget || "",
    icon: row.icon || "",
    isDefault: row.is_default || false,
    logo: row.logo || "",
    backgroundColor: row.background_color || "",
    backgroundImage: row.background_image || ""
  }));
}

async function addWorkCenter(name: string): Promise<void> {
  if (!supabase) {
    if (!inMemoryWorkCenters.some((c) => c.name === name)) inMemoryWorkCenters.push(blankCenter(name));
    return;
  }
  const { error } = await supabase.from("work_centers").insert({ name });
  if (error && error.code !== "23505") throw new Error(error.message);
}

async function renameWorkCenterEntry(oldName: string, newName: string): Promise<void> {
  if (!supabase) {
    inMemoryWorkCenters = inMemoryWorkCenters.map((c) => (c.name === oldName ? { ...c, name: newName } : c));
    return;
  }
  const { error } = await supabase.from("work_centers").update({ name: newName }).eq("name", oldName);
  if (error) throw new Error(error.message);
}

async function deleteWorkCenterEntry(name: string): Promise<void> {
  if (!supabase) {
    inMemoryWorkCenters = inMemoryWorkCenters.filter((c) => c.name !== name);
    return;
  }
  const { error } = await supabase.from("work_centers").delete().eq("name", name);
  if (error) throw new Error(error.message);
}

async function updateWorkCenterProfile(name: string, profile: Partial<Omit<WorkCenterRecord, "name">>): Promise<void> {
  if (!supabase) {
    const idx = inMemoryWorkCenters.findIndex((c) => c.name === name);
    if (idx === -1) inMemoryWorkCenters.push({ ...blankCenter(name), ...profile });
    else inMemoryWorkCenters[idx] = { ...inMemoryWorkCenters[idx], ...profile };
    return;
  }
  const dbProfile: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(profile)) {
    dbProfile[CAMEL_TO_SNAKE_COLUMNS[key] ?? key] = value;
  }
  const { error } = await supabase.from("work_centers").upsert({ name, ...dbProfile }, { onConflict: "name" });
  if (error) throw new Error(error.message);
}

// Only one work center can be the default (the org chart that opens automatically instead
// of the "Centros de trabajo" picker), so setting it also clears the flag on every other
// center. Kept separate from updateWorkCenterProfile since it touches more than one row.
async function setDefaultWorkCenter(name: string, isDefault: boolean): Promise<void> {
  if (!supabase) {
    inMemoryWorkCenters = inMemoryWorkCenters.map((c) => ({ ...c, isDefault: c.name === name ? isDefault : false }));
    if (!inMemoryWorkCenters.some((c) => c.name === name)) inMemoryWorkCenters.push({ ...blankCenter(name), isDefault });
    return;
  }
  if (isDefault) {
    const { error: clearError } = await supabase.from("work_centers").update({ is_default: false }).neq("name", name);
    if (clearError) throw new Error(clearError.message);
  }
  await updateWorkCenterProfile(name, { isDefault });
}

// User profiles (auth), sessions, integration API keys and sync logs persist in Supabase
// (tables "app_users", "sessions", "api_keys", "sync_logs") when configured; otherwise they
// fall back to these in-memory stores, which do NOT survive a process restart or, in
// production on Vercel, a serverless cold start.
interface UserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "viewer";
  createdBy: string | null;
  createdAt: string;
}

let inMemoryUsers: UserRecord[] = [
  {
    id: "user-1",
    name: "Administrador Principal",
    email: "admin@empresa.com",
    password: "admin123",
    role: "admin",
    createdBy: null,
    createdAt: new Date().toISOString()
  }
];

let inMemorySessions = new Map<string, string>(); // token -> userId

interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  provider: string;
  status: string;
  created: string;
}

let inMemoryApiKeys: ApiKeyRecord[] = [
  {
    id: "key-1",
    name: "Workday Integration Key",
    key: "org_live_wk982347x910283",
    provider: "Workday HR",
    status: "active",
    created: "2026-01-15"
  },
  {
    id: "key-2",
    name: "Factorial RRHH Webhook",
    key: "org_live_fc102938475610",
    provider: "Factorial",
    status: "active",
    created: "2026-03-10"
  }
];

interface SyncLogRecord {
  id: string;
  timestamp: string;
  system: string;
  status: string;
  details: string;
  nodesUpdated: number;
}

let inMemorySyncLogs: SyncLogRecord[] = [
  {
    id: "log-1",
    timestamp: new Date().toISOString(),
    system: "Personio HR API",
    status: "SUCCESS",
    details: "Sincronizados 42 empleados activos y 3 sedes regionales.",
    nodesUpdated: 42
  }
];

function userRowToRecord(row: any): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

async function loadUsers(): Promise<UserRecord[]> {
  if (!supabase) return inMemoryUsers;
  const { data, error } = await supabase.from("app_users").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return data.map(userRowToRecord);
}

async function createUser(user: UserRecord): Promise<void> {
  if (!supabase) {
    inMemoryUsers.push(user);
    return;
  }
  const { error } = await supabase.from("app_users").insert({
    id: user.id,
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    created_by: user.createdBy,
    created_at: user.createdAt
  });
  if (error) throw new Error(error.message);
}

async function deleteUser(id: string): Promise<void> {
  if (!supabase) {
    inMemoryUsers = inMemoryUsers.filter((u) => u.id !== id);
    return;
  }
  const { error } = await supabase.from("app_users").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

async function createSession(token: string, userId: string): Promise<void> {
  if (!supabase) {
    inMemorySessions.set(token, userId);
    return;
  }
  const { error } = await supabase.from("sessions").insert({ token, user_id: userId });
  if (error) throw new Error(error.message);
}

async function getSessionUserId(token: string): Promise<string | null> {
  if (!supabase) return inMemorySessions.get(token) || null;
  const { data, error } = await supabase.from("sessions").select("user_id").eq("token", token).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.user_id ?? null;
}

async function deleteSession(token: string): Promise<void> {
  if (!supabase) {
    inMemorySessions.delete(token);
    return;
  }
  const { error } = await supabase.from("sessions").delete().eq("token", token);
  if (error) throw new Error(error.message);
}

async function loadApiKeys(): Promise<ApiKeyRecord[]> {
  if (!supabase) return inMemoryApiKeys;
  const { data, error } = await supabase.from("api_keys").select("*").order("created", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function createApiKey(key: ApiKeyRecord): Promise<void> {
  if (!supabase) {
    inMemoryApiKeys.push(key);
    return;
  }
  const { error } = await supabase.from("api_keys").insert(key);
  if (error) throw new Error(error.message);
}

async function loadSyncLogs(): Promise<SyncLogRecord[]> {
  if (!supabase) return inMemorySyncLogs;
  const { data, error } = await supabase.from("sync_logs").select("*").order("timestamp", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map((row: any) => ({
    id: row.id,
    timestamp: row.timestamp,
    system: row.system,
    status: row.status,
    details: row.details,
    nodesUpdated: row.nodes_updated
  }));
}

async function addSyncLog(log: SyncLogRecord): Promise<void> {
  if (!supabase) {
    inMemorySyncLogs.unshift(log);
    return;
  }
  const { error } = await supabase.from("sync_logs").insert({
    id: log.id,
    timestamp: log.timestamp,
    system: log.system,
    status: log.status,
    details: log.details,
    nodes_updated: log.nodesUpdated
  });
  if (error) throw new Error(error.message);
}

function generateToken(): string {
  return "tok_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function publicUser(u: UserRecord) {
  const { password, ...rest } = u;
  return rest;
}

async function getUserFromRequest(req: express.Request): Promise<UserRecord | null> {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const userId = await getSessionUserId(token);
  if (!userId) return null;
  const users = await loadUsers();
  return users.find((u) => u.id === userId) || null;
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Sesión inválida o expirada. Inicia sesión nuevamente." });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Solo los perfiles de administrador pueden modificar el organigrama." });
    }
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// --- AUTH ROUTES --- //

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const users = await loadUsers();
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }
    const token = generateToken();
    await createSession(token, user.id);
    res.json({ success: true, token, user: publicUser(user) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    res.json({ success: true, user: publicUser(user) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    await deleteSession(token);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- USER / PROFILE MANAGEMENT (admin only) --- //

app.get("/api/v1/users", requireAdmin, async (req, res) => {
  try {
    const users = await loadUsers();
    res.json({ success: true, data: users.map(publicUser) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/users", requireAdmin, async (req, res) => {
  try {
    const admin = (await getUserFromRequest(req))!;
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
    }
    const users = await loadUsers();
    if (users.some((u) => u.email === email)) {
      return res.status(409).json({ error: "Ya existe un perfil con ese email" });
    }
    const newUser: UserRecord = {
      id: "user-" + Date.now(),
      name,
      email,
      password,
      role: role === "admin" ? "admin" : "viewer",
      createdBy: admin.id,
      createdAt: new Date().toISOString()
    };
    await createUser(newUser);
    res.json({ success: true, data: publicUser(newUser) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/v1/users/:id", requireAdmin, async (req, res) => {
  try {
    const admin = (await getUserFromRequest(req))!;
    if (req.params.id === admin.id) {
      return res.status(400).json({ error: "No puedes eliminar tu propio perfil" });
    }
    const users = await loadUsers();
    const target = users.find((u) => u.id === req.params.id);
    if (!target) return res.status(404).json({ error: "Perfil no encontrado" });
    const remainingAdmins = users.filter((u) => u.role === "admin" && u.id !== target.id);
    if (target.role === "admin" && remainingAdmins.length === 0) {
      return res.status(400).json({ error: "Debe existir al menos un perfil administrador" });
    }
    await deleteUser(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- REST API ROUTES --- //

// Health check
app.get("/api/health", async (req, res) => {
  try {
    const nodes = await loadNodes();
    res.json({ status: "ok", timestamp: new Date().toISOString(), totalNodes: nodes.length, persistence: supabase ? "supabase" : "in-memory" });
  } catch (err: any) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// Get organigram nodes
app.get("/api/v1/nodes", async (req, res) => {
  try {
    const { sede, department } = req.query;
    let filtered = await loadNodes();
    if (sede && sede !== "all") {
      filtered = filtered.filter((n) => n.sede === sede);
    }
    if (department && department !== "all") {
      filtered = filtered.filter((n) => n.department === department);
    }
    res.json({
      success: true,
      data: filtered,
      total: filtered.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync / update nodes payload
app.post("/api/v1/nodes/bulk-sync", requireAdmin, async (req, res) => {
  const { nodes } = req.body;
  if (!Array.isArray(nodes)) {
    return res.status(400).json({ error: "Formato de nodos inválido" });
  }
  try {
    await saveNodes(nodes);
    await addSyncLog({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      system: "Dashboard Client Sync",
      status: "SUCCESS",
      details: `Estructura guardada con ${nodes.length} nodos jerárquicos.`,
      nodesUpdated: nodes.length
    });
    return res.json({ success: true, count: nodes.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Work centers ("centros de trabajo") management
app.get("/api/v1/work-centers", async (req, res) => {
  try {
    const centers = await loadWorkCenters();
    res.json({ success: true, data: centers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/work-centers", requireAdmin, async (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "El nombre del centro de trabajo es obligatorio" });
  try {
    await addWorkCenter(name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/v1/work-centers/:name", requireAdmin, async (req, res) => {
  const oldName = decodeURIComponent(req.params.name);
  const newName = (req.body?.name || "").trim();
  if (!newName) return res.status(400).json({ error: "El nuevo nombre es obligatorio" });
  try {
    await renameWorkCenterEntry(oldName, newName);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/v1/work-centers/:name", requireAdmin, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const { address, email, phone, headcount, budget, icon, isDefault, logo, backgroundColor, backgroundImage } = req.body || {};
  try {
    await updateWorkCenterProfile(name, {
      ...(address !== undefined ? { address } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(headcount !== undefined ? { headcount: Number(headcount) || 0 } : {}),
      ...(budget !== undefined ? { budget } : {}),
      ...(icon !== undefined ? { icon } : {}),
      ...(logo !== undefined ? { logo } : {}),
      ...(backgroundColor !== undefined ? { backgroundColor } : {}),
      ...(backgroundImage !== undefined ? { backgroundImage } : {})
    });
    if (isDefault !== undefined) {
      await setDefaultWorkCenter(name, !!isDefault);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/v1/work-centers/:name", requireAdmin, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    await deleteWorkCenterEntry(name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// HR API Endpoint - External Systems Sync Endpoint
app.post("/api/v1/hr/sync", requireAdmin, async (req, res) => {
  const provider = req.body.provider || "Sistema de RRHH Externo";
  const incomingEmployees = req.body.employees || [];
  const targetSede = (req.body.targetSede || "").trim();

  if (!targetSede) {
    return res.status(400).json({ error: "Debes indicar el centro de trabajo (targetSede) que recibirá la sincronización" });
  }

  if (incomingEmployees.length > 0) {
    try {
      const currentNodes = await loadNodes();

      // Merge or map incoming employees. Every synced node is stamped with the chosen
      // work center — each center's org chart is independent, so an import can never
      // silently place someone (or anchor a parent) into a different center's tree.
      const mapped = incomingEmployees.map((emp: any, index: number) => ({
        id: emp.id || `hr-emp-${Date.now()}-${index}`,
        name: emp.fullName || emp.name || "Empleado Nuevo",
        title: emp.jobTitle || emp.title || "Colaborador",
        department: emp.department || "General",
        sede: targetSede,
        email: emp.email || "contacto@empresa.com",
        phone: emp.phone || "+34 900 000 000",
        avatar: emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        roleType: emp.roleType || "employee",
        parentId: emp.reportsToId || emp.parentId || null,
        freeX: 300 + (index % 4) * 220,
        freeY: 300 + Math.floor(index / 4) * 160,
        metrics: { headcount: emp.teamSize || 0, budget: emp.budget || "N/A" },
        status: "active",
        customBadge: emp.badge || "Sincronizado vía API",
        iconName: "User",
        assignees: []
      }));

      // Optionally combine or replace — scoped to the target center only, so other
      // centers' nodes are never touched by this sync.
      let nextNodes: any[];
      if (req.body.mode === "replace") {
        nextNodes = [...currentNodes.filter((n: any) => n.sede !== targetSede), ...mapped];
      } else {
        // merge without duplicating IDs
        const existingIds = new Set(currentNodes.map((n) => n.id));
        nextNodes = [...currentNodes, ...mapped.filter((m: any) => !existingIds.has(m.id))];
      }
      await saveNodes(nextNodes);

      await addSyncLog({
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        system: provider,
        status: "SUCCESS",
        details: `Recibidos ${incomingEmployees.length} registros desde ${provider}.`,
        nodesUpdated: incomingEmployees.length
      });

      return res.json({
        success: true,
        message: `Sincronización completada exitosamente desde ${provider}`,
        totalProcessed: incomingEmployees.length,
        currentTotalNodes: nextNodes.length
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.json({
    success: true,
    message: "Endpoint de RRHH activo y listo para recibir webhooks/cargas JSON",
    samplePayloadSchema: {
      provider: "BambooHR / Personio / Workday",
      mode: "append | replace",
      employees: [
        {
          id: "EMP-001",
          fullName: "Juan Pérez",
          jobTitle: "Gerente de Ventas",
          department: "Comercial",
          sede: "Madrid - Sede Central",
          reportsToId: "node-1",
          email: "juan@empresa.com"
        }
      ]
    }
  });
});

// API Keys management endpoint
app.get("/api/v1/integrations/keys", async (req, res) => {
  try {
    const keys = await loadApiKeys();
    res.json({ success: true, data: keys });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/integrations/keys", requireAdmin, async (req, res) => {
  try {
    const { name, provider } = req.body;
    const newKey: ApiKeyRecord = {
      id: "key-" + Date.now(),
      name: name || "Nueva Clave de Integración",
      key: "org_live_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 8),
      provider: provider || "API Personalizada",
      status: "active",
      created: new Date().toISOString().split("T")[0]
    };
    await createApiKey(newKey);
    res.json({ success: true, data: newKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/v1/integrations/logs", async (req, res) => {
  try {
    const logs = await loadSyncLogs();
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Positions AI-generated nodes as an actual top-down tree (rows by hierarchy depth,
// each parent centered over its own children) instead of a mechanical N-per-row grid —
// the model's own node ORDER carries no layout information, so without this the result
// ignored the org chart's real shape regardless of how well the model read the source.
function layoutAiNodes(nodes: { id: string; parentId: string | null }[]): Map<string, { x: number; y: number }> {
  const idSet = new Set(nodes.map((n) => n.id));
  const childrenByParent = new Map<string, string[]>();
  for (const n of nodes) {
    const key = n.parentId && idSet.has(n.parentId) ? n.parentId : "__root__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(n.id);
  }

  const COL_W = 260;
  const ROW_H = 190;
  const positions = new Map<string, { x: number; y: number }>();
  const visiting = new Set<string>();
  let nextCol = 0;

  function place(id: string, depth: number): number {
    // Defends against a cyclic parentId chain in the model's output — treat a node
    // revisited mid-traversal as a leaf instead of recursing forever.
    if (visiting.has(id)) {
      const x = nextCol++;
      positions.set(id, { x: x * COL_W, y: depth * ROW_H });
      return x;
    }
    visiting.add(id);
    const children = childrenByParent.get(id) || [];
    let x: number;
    if (children.length === 0) {
      x = nextCol++;
    } else {
      const childXs = children.map((childId) => place(childId, depth + 1));
      x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    }
    positions.set(id, { x: x * COL_W, y: depth * ROW_H });
    visiting.delete(id);
    return x;
  }

  for (const rootId of childrenByParent.get("__root__") || []) place(rootId, 0);
  // Any node whose parentId never resolved to a real id (and isn't null) still needs a
  // position — place it as its own extra root rather than dropping it silently.
  for (const n of nodes) {
    if (!positions.has(n.id)) place(n.id, 0);
  }

  return positions;
}

// Gemini AI Organigram Generator Endpoint
app.post("/api/ai/generate-org", async (req, res) => {
  try {
    const { prompt, companyType, headcount, image } = req.body;
    const targetSede = (req.body.targetSede || "").trim();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!targetSede) {
      return res.status(400).json({ error: "Debes indicar el centro de trabajo (targetSede) para el que se generará el organigrama" });
    }

    if (image && (!image.mimeType || !image.data)) {
      return res.status(400).json({ error: "El archivo adjunto es inválido" });
    }

    if (!apiKey) {
      return res.status(400).json({
        error: "GEMINI_API_KEY no configurada. Agrega la clave en el panel de Configuración."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const sourceInstructions = image
      ? `Se adjunta una imagen o documento (captura, foto o PDF) de un organigrama existente. Puede tener muchas cajas y varios niveles jerárquicos (10, 30, 50 o más) — eso es normal y esperado, transcríbelas TODAS sin excepción.
Analiza cuidadosamente CADA caja visible en la imagen, sin importar cuán pequeña, secundaria o repetida parezca (asistentes, auxiliares, conductores, cargos de apoyo, coordinadores, etc.): ninguna debe quedar fuera. Identifica también todas las líneas de jerarquía (sólidas) para reconstruir el parentId correcto de cada nodo, y no confundas líneas punteadas de coordinación con líneas de jerarquía.
PROHIBIDO resumir, agrupar varias cajas en una sola, o devolver solo una muestra representativa: el número de nodos en tu respuesta debe igualar el número de cajas reales que se ven en la imagen.${
          prompt ? ` Ten en cuenta también estas indicaciones adicionales del usuario: "${prompt}".` : ""
        } Si algún nombre o dato puntual no es legible, infiere un valor razonable en su lugar, pero nunca omitas la caja completa solo porque un dato sea difícil de leer.`
      : `Empresa / Descripción: "${prompt || companyType || "Empresa tecnológica de rápido crecimiento"}"
Número aproximado de nodos: ${headcount || 12}`;

    const sysPrompt = `Eres un consultor experto en diseño organizacional y estructuras jerárquicas empresariales corporativas.
Genera una estructura de organigrama completa en formato JSON para el siguiente pedido:
${sourceInstructions}
Centro de trabajo: esta estructura es exclusivamente para el centro "${targetSede}".

REGLAS DE SALIDA OBLIGATORIAS:
1. Responde ÚNICAMENTE con un objeto JSON estructurado con la clave "nodes" que contiene un array de objetos con las siguientes propiedades:
- id: cadena única tipo "ai-node-1", "ai-node-2"...
- name: nombre completo en español (realista y ejecutivo)
- title: cargo profesional exacto
- department: departamento (ej: Dirección General, Tecnología, Recursos Humanos, Finanzas, Comercial, Operaciones, Producto)
- sede: usa siempre exactamente "${targetSede}" en este campo, para todos los nodos
- email: correo corporativo válido ficticio
- phone: teléfono formato internacional
- avatar: URL de foto de perfil limpia de unsplash (o usa variaciones de personas profesionales de unsplash)
- roleType: uno de "executive", "director", "manager", "employee"
- parentId: id del nodo superior jerárquico dentro de este mismo centro (el director del centro debe tener parentId: null). Cada otro nodo DEBE tener un parentId válido existente en el array!
- customBadge: distintivo corporativo corto (ej: "Comité Ejecutivo", "Tech Core", "Squad Lead")
- iconName: nombre de icono lucide (Crown, Cpu, Users, Briefcase, Server, Palette, Globe, Target, Shield, Award)

ASEGÚRATE de que el primer nodo sea la máxima autoridad de este centro con parentId: null, y que los directores dependan de él, los managers dependan de directores, etc.
${image ? "Recuerda: el array \"nodes\" debe incluir absolutamente todas las cajas que aparecen en la imagen adjunta, sin resumir ni truncar la lista." : ""}`;

    const contents = image
      ? [{ role: "user", parts: [{ text: sysPrompt }, { inlineData: { mimeType: image.mimeType, data: image.data } }] }]
      : sysPrompt;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents,
      config: {
        responseMimeType: "application/json",
        // A detailed org chart image (40+ boxes) needs a generous output budget — the
        // model would otherwise summarize/truncate the node list to fit a smaller
        // response.
        maxOutputTokens: 32768
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);

    if (parsed && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
      // `sede` is force-stamped server-side rather than trusted from the model's output.
      const positions = layoutAiNodes(parsed.nodes.map((n: any) => ({ id: n.id, parentId: n.parentId ?? null })));
      const nodesWithCoords = parsed.nodes.map((node: any) => {
        const pos = positions.get(node.id) || { x: 0, y: 0 };
        return {
          ...node,
          sede: targetSede,
          avatar: node.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
          assignees: node.assignees || [],
          freeX: 80 + pos.x,
          freeY: 60 + pos.y,
          status: "active"
        };
      });
      return res.json({ success: true, nodes: nodesWithCoords });
    }

    return res.status(500).json({ error: "No se pudo formatear la respuesta del modelo AI." });
  } catch (err: any) {
    console.error("AI Generation error:", err);
    return res.status(500).json({ error: err.message || "Error al comunicarse con la IA de Gemini" });
  }
});

export default app;
