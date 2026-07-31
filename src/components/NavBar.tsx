import { Network, Plug, Sparkles } from "lucide-react";
import type { TabId } from "../types";

const TABS: { id: TabId; label: string; icon: typeof Network }[] = [
  { id: "chart", label: "Organigrama", icon: Network },
  { id: "ai", label: "Generador IA", icon: Sparkles },
  { id: "hr", label: "Integración RRHH", icon: Plug },
];

interface NavBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  nodeCount: number;
}

export function NavBar({ active, onChange, nodeCount }: NavBarProps) {
  return (
    <header className="flex items-center gap-4 border-b border-white/10 bg-slate-950/80 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow">
          <Network className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-100">OrgCraft Pro</p>
          <p className="text-[10px] leading-tight text-slate-500">{nodeCount} colaboradores</p>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              active === id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
