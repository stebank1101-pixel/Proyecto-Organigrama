import { LogOut, Network, Plug, Shield, Sparkles, User, Users } from "lucide-react";
import { useAuth } from "../lib/auth";
import type { TabId } from "../types";

const TABS: { id: TabId; label: string; icon: typeof Network; adminOnly?: boolean }[] = [
  { id: "chart", label: "Organigrama", icon: Network },
  { id: "ai", label: "Generador IA", icon: Sparkles },
  { id: "hr", label: "Integración RRHH", icon: Plug },
  { id: "profiles", label: "Perfiles", icon: Users, adminOnly: true },
];

interface NavBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  nodeCount: number;
}

export function NavBar({ active, onChange, nodeCount }: NavBarProps) {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow">
          <Network className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-900">OrgCraft Pro</p>
          <p className="text-[10px] leading-tight text-slate-500">{nodeCount} colaboradores</p>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {TABS.filter((t) => !t.adminOnly || isAdmin).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              active === id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>

      {user && (
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                isAdmin ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-500"
              }`}
            >
              {isAdmin ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-medium text-slate-800">{user.name}</p>
              <p className="text-[10px] text-slate-500">{isAdmin ? "Administrador" : "Visualizador"}</p>
            </div>
          </div>
          <button onClick={logout} className="icon-btn text-slate-500" title="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}
