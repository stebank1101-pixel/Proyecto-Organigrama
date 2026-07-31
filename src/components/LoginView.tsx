import { AlertTriangle, Eye, LogIn, Network } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../lib/auth";

export function LoginView() {
  const { login, enterGuestMode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow">
            <Network className="h-5 w-5" />
          </div>
          <h1 className="rounded-full bg-sky-50 px-4 py-1.5 text-base font-bold uppercase text-sky-700">ORGANIGRAMA CHEC-COLOMBIA</h1>
        </div>

        <button
          type="button"
          onClick={enterGuestMode}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-100"
        >
          <Eye className="h-4 w-4" />
          Ver organigramas
        </button>
        <p className="mb-4 mt-2 text-center text-[11px] text-slate-400">
          Acceso de invitado: consulta los organigramas de todos los centros de trabajo en modo solo lectura.
        </p>

        <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          o inicia sesión
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-medium text-slate-600">
            Email
            <input
              type="email"
              required
              autoFocus
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@empresa.com"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Contraseña
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
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Perfil de prueba: <span className="font-medium text-slate-500">admin@empresa.com</span> /{" "}
          <span className="font-medium text-slate-500">admin123</span>
        </p>
      </div>
    </div>
  );
}
