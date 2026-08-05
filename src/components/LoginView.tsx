import { AlertTriangle, Eye, LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";
import checLogo from "../assets/chec-logo.jpg";
import { useAuth } from "../lib/auth";
import { LANGUAGE_LABELS, useLanguage, type Language } from "../lib/i18n";

export function LoginView() {
  const { login, enterGuestMode } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-3 flex justify-end gap-1">
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                lang === language ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <img src={checLogo} alt="Logo CHEC" className="h-16 w-auto" />
          <h1 className="rounded-full bg-sky-50 px-4 py-1.5 text-base font-bold uppercase text-sky-700">{t.login.brandTitle}</h1>
        </div>

        <button
          type="button"
          onClick={enterGuestMode}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-100"
        >
          <Eye className="h-4 w-4" />
          {t.login.viewOrgCharts}
        </button>
        <p className="mb-4 mt-2 text-center text-[11px] text-slate-400">{t.login.guestAccessDescription}</p>

        {!showAdminLogin ? (
          <button
            type="button"
            onClick={() => setShowAdminLogin(true)}
            className="btn-secondary mt-2 w-full justify-center"
          >
            <ShieldCheck className="h-4 w-4" />
            {t.login.adminAccess}
          </button>
        ) : (
          <>
            <div className="mb-4 mt-4 flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              {t.login.adminAccess}
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-xs font-medium text-slate-600">
                {t.login.email}
                <input
                  type="email"
                  required
                  autoFocus
                  className="input mt-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.login.emailPlaceholder}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                {t.login.password}
                <input
                  type="password"
                  required
                  className="input mt-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>

              {error && (
                <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
                <LogIn className="h-4 w-4" />
                {loading ? t.login.loggingIn : t.login.signIn}
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] text-slate-400">
              {t.login.testProfile} <span className="font-medium text-slate-500">admin@empresa.com</span> /{" "}
              <span className="font-medium text-slate-500">admin123</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
