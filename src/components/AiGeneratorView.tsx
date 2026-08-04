import { Loader2, PlusCircle, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { generateAiOrg } from "../lib/api";
import { OrgIcon } from "../lib/icons";
import { computeAllSedes } from "../lib/workCenters";
import type { OrgNode, WorkCenter } from "../types";

const ACCEPTED_FILE_TYPES = "image/png,image/jpeg,image/webp,application/pdf";

function readFileAsBase64(file: File): Promise<{ mimeType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve({ mimeType: file.type, data: base64 });
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

interface AiGeneratorViewProps {
  nodes: OrgNode[];
  workCenters: WorkCenter[];
  onApply: (nodes: OrgNode[], mode: "replace" | "append", targetSede: string) => void;
  readOnly?: boolean;
}

export function AiGeneratorView({ nodes, workCenters, onApply, readOnly }: AiGeneratorViewProps) {
  const [prompt, setPrompt] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [headcount, setHeadcount] = useState(12);
  const [targetSede, setTargetSede] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrgNode[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allSedes = computeAllSedes(nodes, workCenters);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] || null;
    setFile(picked);
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return picked && picked.type.startsWith("image/") ? URL.createObjectURL(picked) : null;
    });
  }

  function clearFile() {
    setFile(null);
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!targetSede) return;
    setLoading(true);
    setError(null);
    try {
      const image = file ? await readFileAsBase64(file) : null;
      const res = await generateAiOrg({ prompt, companyType, headcount, targetSede, image });
      setPreview(res.nodes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el organigrama con IA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-sky-600" />
          <h2 className="text-base font-semibold text-slate-900">Generador de organigrama con IA (Gemini)</h2>
        </div>

        {readOnly && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Tu perfil es de solo lectura: puedes generar una vista previa, pero solo un administrador puede aplicarla al organigrama.
          </p>
        )}

        <form onSubmit={handleGenerate} className="space-y-3">
          <label className="block text-xs font-medium text-slate-600">
            Describe la empresa o el equipo
            <textarea
              className="input mt-1 h-24 resize-none"
              placeholder="Ej: Startup fintech de 40 personas con foco en pagos B2B en Latinoamérica..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>

          <div className="block text-xs font-medium text-slate-600">
            O sube una imagen o PDF de un organigrama existente (opcional)
            <p className="mb-1.5 mt-0.5 text-[11px] font-normal text-slate-400">
              La IA analizará el archivo y transcribirá esa estructura para este centro de trabajo.
            </p>
            {!file ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary w-full justify-center"
              >
                <Upload className="h-3.5 w-3.5" /> Elegir imagen o PDF
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                {filePreviewUrl ? (
                  <img src={filePreviewUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-slate-200 text-[10px] font-semibold text-slate-500">
                    PDF
                  </div>
                )}
                <p className="min-w-0 flex-1 truncate text-xs text-slate-700">{file.name}</p>
                <button type="button" onClick={clearFile} className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-600">
              Tipo de empresa (opcional)
              <input className="input mt-1" value={companyType} onChange={(e) => setCompanyType(e.target.value)} />
            </label>
            <label className="block text-xs font-medium text-slate-600">
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

          <label className="block text-xs font-medium text-slate-600">
            Centro de trabajo destino
            <select className="input mt-1" value={targetSede} onChange={(e) => setTargetSede(e.target.value)}>
              <option value="">— Elige un centro —</option>
              {allSedes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

          <button type="submit" disabled={loading || !targetSede} className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generando estructura..." : "Generar organigrama"}
          </button>
        </form>
      </div>

      {preview && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Vista previa · {preview.length} nodos</h3>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setPreview(null)}>
                <RefreshCw className="h-3.5 w-3.5" /> Descartar
              </button>
              {!readOnly && (
                <>
                  <button className="btn-secondary" onClick={() => onApply(preview, "append", targetSede)}>
                    <PlusCircle className="h-3.5 w-3.5" /> Agregar al actual
                  </button>
                  <button className="btn-primary" onClick={() => onApply(preview, "replace", targetSede)}>
                    Reemplazar organigrama
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {preview.map((node) => (
              <div key={node.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                  <OrgIcon name={node.iconName} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800">{node.name}</p>
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
