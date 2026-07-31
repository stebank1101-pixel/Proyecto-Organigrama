import { Loader2, PlusCircle, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { generateAiOrg } from "../lib/api";
import { OrgIcon } from "../lib/icons";
import type { OrgNode } from "../types";

interface AiGeneratorViewProps {
  onApply: (nodes: OrgNode[], mode: "replace" | "append") => void;
}

export function AiGeneratorView({ onApply }: AiGeneratorViewProps) {
  const [prompt, setPrompt] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [headcount, setHeadcount] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrgNode[] | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await generateAiOrg({ prompt, companyType, headcount });
      setPreview(res.nodes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el organigrama con IA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto p-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-semibold text-slate-100">Generador de organigrama con IA (Gemini)</h2>
        </div>

        <form onSubmit={handleGenerate} className="space-y-3">
          <label className="block text-xs font-medium text-slate-400">
            Describe la empresa o el equipo
            <textarea
              className="input mt-1 h-24 resize-none"
              placeholder="Ej: Startup fintech de 40 personas con foco en pagos B2B en Latinoamérica..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-400">
              Tipo de empresa (opcional)
              <input className="input mt-1" value={companyType} onChange={(e) => setCompanyType(e.target.value)} />
            </label>
            <label className="block text-xs font-medium text-slate-400">
              Número aproximado de nodos
              <input
                type="number"
                min={3}
                max={40}
                className="input mt-1"
                value={headcount}
                onChange={(e) => setHeadcount(Number(e.target.value))}
              />
            </label>
          </div>

          {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generando estructura..." : "Generar organigrama"}
          </button>
        </form>
      </div>

      {preview && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Vista previa · {preview.length} nodos</h3>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setPreview(null)}>
                <RefreshCw className="h-3.5 w-3.5" /> Descartar
              </button>
              <button className="btn-secondary" onClick={() => onApply(preview, "append")}>
                <PlusCircle className="h-3.5 w-3.5" /> Agregar al actual
              </button>
              <button className="btn-primary" onClick={() => onApply(preview, "replace")}>
                Reemplazar organigrama
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {preview.map((node) => (
              <div key={node.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 p-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
                  <OrgIcon name={node.iconName} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-200">{node.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{node.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
