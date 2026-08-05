import { Eye, Globe, LogIn, LogOut, Network, Plug, Shield, Sparkles, User, Users } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import { LANGUAGE_LABELS, useLanguage, type Language } from "../lib/i18n";
import type { TabId } from "../types";

interface NavBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  nodeCount: number;
}

export function NavBar({ active, onChange, nodeCount }: NavBarProps) {
  const { user, isAdmin, isGuest, logout, exitGuestMode } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const TABS: { id: TabId; label: string; icon: typeof Network; adminOnly?: boolean; hideForGuest?: boolean }[] = [
    { id: "chart", label: t.nav.tabChart, icon: Network },
    { id: "ai", label: t.nav.tabAi, icon: Sparkles, hideForGuest: true },
    { id: "hr", label: t.nav.tabHr, icon: Plug, hideForGuest: true },
    { id: "profiles", label: t.nav.tabProfiles, icon: Users, adminOnly: true },
  ];

  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow">
          <Network className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-900">{t.nav.appTitle}</p>
          <p className="text-[10px] leading-tight text-slate-500">{t.nav.collaborators(nodeCount)}</p>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {TABS.filter((tab) => (!tab.adminOnly || isAdmin) && (!tab.hideForGuest || !isGuest)).map(({ id, label, icon: Icon }) => (
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

      <div className="relative">
        <button
          onClick={() => setLangMenuOpen((v) => !v)}
          onBlur={() => setTimeout(() => setLangMenuOpen(false), 150)}
          className="icon-btn border border-slate-200 text-slate-500"
          title={t.nav.language}
        >
          <Globe className="h-3.5 w-3.5" />
        </button>
        {langMenuOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
              <button
                key={lang}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setLanguage(lang);
                  setLangMenuOpen(false);
                }}
                className={`block w-full px-3 py-1.5 text-left text-xs ${
                  lang === language ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        )}
      </div>

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
              <p className="text-[10px] text-slate-500">{isAdmin ? t.nav.administrator : t.nav.viewer}</p>
            </div>
          </div>
          <button onClick={logout} className="icon-btn text-slate-500" title={t.nav.logoutTitle}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}

      {!user && isGuest && (
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <Eye className="h-3 w-3" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-medium text-slate-800">{t.nav.guest}</p>
              <p className="text-[10px] text-slate-500">{t.nav.readOnly}</p>
            </div>
          </div>
          <button onClick={exitGuestMode} className="icon-btn text-slate-500" title={t.nav.loginTitle}>
            <LogIn className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}
