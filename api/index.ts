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

let apiKeysStore = [
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

let syncLogs = [
  {
    id: "log-1",
    timestamp: new Date().toISOString(),
    system: "Personio HR API",
    status: "SUCCESS",
    details: "Sincronizados 42 empleados activos y 3 sedes regionales.",
    nodesUpdated: 42
  }
];

// In-memory mock DB for user profiles (auth) and active sessions
let usersStore = [
  {
    id: "user-1",
    name: "Administrador Principal",
    email: "admin@empresa.com",
    password: "admin123",
    role: "admin",
    createdBy: null as string | null,
    createdAt: new Date().toISOString()
  }
];

const sessions = new Map<string, string>(); // token -> userId

function generateToken(): string {
  return "tok_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function publicUser(u: (typeof usersStore)[number]) {
  const { password, ...rest } = u;
  return rest;
}

function getUserFromRequest(req: express.Request) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const userId = sessions.get(token);
  if (!userId) return null;
  return usersStore.find((u) => u.id === userId) || null;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Sesión inválida o expirada. Inicia sesión nuevamente." });
  }
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Solo los perfiles de administrador pueden modificar el organigrama." });
  }
  next();
}

// --- AUTH ROUTES --- //

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = usersStore.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Email o contraseña incorrectos" });
  }
  const token = generateToken();
  sessions.set(token, user.id);
  res.json({ success: true, token, user: publicUser(user) });
});

app.get("/api/auth/me", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "No autenticado" });
  res.json({ success: true, user: publicUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  sessions.delete(token);
  res.json({ success: true });
});

// --- USER / PROFILE MANAGEMENT (admin only) --- //

app.get("/api/v1/users", requireAdmin, (req, res) => {
  res.json({ success: true, data: usersStore.map(publicUser) });
});

app.post("/api/v1/users", requireAdmin, (req, res) => {
  const admin = getUserFromRequest(req)!;
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
  }
  if (usersStore.some((u) => u.email === email)) {
    return res.status(409).json({ error: "Ya existe un perfil con ese email" });
  }
  const newUser = {
    id: "user-" + Date.now(),
    name,
    email,
    password,
    role: role === "admin" ? "admin" : "viewer",
    createdBy: admin.id,
    createdAt: new Date().toISOString()
  };
  usersStore.push(newUser);
  res.json({ success: true, data: publicUser(newUser) });
});

app.delete("/api/v1/users/:id", requireAdmin, (req, res) => {
  const admin = getUserFromRequest(req)!;
  if (req.params.id === admin.id) {
    return res.status(400).json({ error: "No puedes eliminar tu propio perfil" });
  }
  const target = usersStore.find((u) => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: "Perfil no encontrado" });
  const remainingAdmins = usersStore.filter((u) => u.role === "admin" && u.id !== target.id);
  if (target.role === "admin" && remainingAdmins.length === 0) {
    return res.status(400).json({ error: "Debe existir al menos un perfil administrador" });
  }
  usersStore = usersStore.filter((u) => u.id !== req.params.id);
  res.json({ success: true });
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
    syncLogs.unshift({
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

// HR API Endpoint - External Systems Sync Endpoint
app.post("/api/v1/hr/sync", requireAdmin, async (req, res) => {
  const provider = req.body.provider || "Sistema de RRHH Externo";
  const incomingEmployees = req.body.employees || [];

  if (incomingEmployees.length > 0) {
    try {
      const currentNodes = await loadNodes();

      // Merge or map incoming employees
      const mapped = incomingEmployees.map((emp: any, index: number) => ({
        id: emp.id || `hr-emp-${Date.now()}-${index}`,
        name: emp.fullName || emp.name || "Empleado Nuevo",
        title: emp.jobTitle || emp.title || "Colaborador",
        department: emp.department || "General",
        sede: emp.location || emp.sede || "Sede Central",
        email: emp.email || "contacto@empresa.com",
        phone: emp.phone || "+34 900 000 000",
        avatar: emp.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        roleType: emp.roleType || "employee",
        parentId: emp.reportsToId || emp.parentId || currentNodes[0]?.id || null,
        freeX: 300 + (index % 4) * 220,
        freeY: 300 + Math.floor(index / 4) * 160,
        metrics: { headcount: emp.teamSize || 0, budget: emp.budget || "N/A" },
        status: "active",
        customBadge: emp.badge || "Sincronizado vía API",
        iconName: "User",
        assignees: []
      }));

      // Optionally combine or replace
      let nextNodes: any[];
      if (req.body.mode === "replace") {
        nextNodes = mapped;
      } else {
        // merge without duplicating IDs
        const existingIds = new Set(currentNodes.map((n) => n.id));
        nextNodes = [...currentNodes, ...mapped.filter((m: any) => !existingIds.has(m.id))];
      }
      await saveNodes(nextNodes);

      syncLogs.unshift({
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
app.get("/api/v1/integrations/keys", (req, res) => {
  res.json({ success: true, data: apiKeysStore });
});

app.post("/api/v1/integrations/keys", requireAdmin, (req, res) => {
  const { name, provider } = req.body;
  const newKey = {
    id: "key-" + Date.now(),
    name: name || "Nueva Clave de Integración",
    key: "org_live_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 8),
    provider: provider || "API Personalizada",
    status: "active",
    created: new Date().toISOString().split("T")[0]
  };
  apiKeysStore.push(newKey);
  res.json({ success: true, data: newKey });
});

app.get("/api/v1/integrations/logs", (req, res) => {
  res.json({ success: true, data: syncLogs });
});

// Gemini AI Organigram Generator Endpoint
app.post("/api/ai/generate-org", async (req, res) => {
  try {
    const { prompt, companyType, headcount } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: "GEMINI_API_KEY no configurada. Agrega la clave en el panel de Configuración."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const sysPrompt = `Eres un consultor experto en diseño organizacional y estructuras jerárquicas empresariales corporativas.
Genera una estructura de organigrama completa en formato JSON para el siguiente pedido:
Empresa / Descripción: "${prompt || companyType || "Empresa tecnológica de rápido crecimiento"}"
Número aproximado de nodos: ${headcount || 12}

REGLAS DE SALIDA OBLIGATORIAS:
1. Responde ÚNICAMENTE con un objeto JSON estructurado con la clave "nodes" que contiene un array de objetos con las siguientes propiedades:
- id: cadena única tipo "ai-node-1", "ai-node-2"...
- name: nombre completo en español (realista y ejecutivo)
- title: cargo profesional exacto
- department: departamento (ej: Dirección General, Tecnología, Recursos Humanos, Finanzas, Comercial, Operaciones, Producto)
- sede: una de las sedes sugeridas (ej: "Madrid - Sede Central", "CDMX - Tech Hub", "Bogotá - Sede Regional", "Remote / Global")
- email: correo corporativo válido ficticio
- phone: teléfono formato internacional
- avatar: URL de foto de perfil limpia de unsplash (o usa variaciones de personas profesionales de unsplash)
- roleType: uno de "executive", "director", "manager", "employee"
- parentId: id del nodo superior jerárquico (el CEO/Director General debe tener parentId: null). Cada otro nodo DEBE tener un parentId válido existente en el array!
- customBadge: distintivo corporativo corto (ej: "Comité Ejecutivo", "Tech Core", "Squad Lead")
- iconName: nombre de icono lucide (Crown, Cpu, Users, Briefcase, Server, Palette, Globe, Target, Shield, Award)

ASEGÚRATE de que el primer nodo sea el CEO/Director General con parentId: null, y que los directores dependan del CEO, los managers dependan de directores, etc.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: sysPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);

    if (parsed && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
      // Calculate coordinates for free view auto placement
      const nodesWithCoords = parsed.nodes.map((node: any, idx: number) => {
        return {
          ...node,
          avatar: node.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
          assignees: node.assignees || [],
          freeX: 350 + (idx % 3) * 260,
          freeY: 80 + Math.floor(idx / 3) * 180,
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
