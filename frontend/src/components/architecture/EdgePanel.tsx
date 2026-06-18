/**
 * @file EdgePanel.tsx
 * @description Panel lateral de la conexión seleccionada. Permite cambiar la
 * dirección (un sentido / ambos extremos), invertir el sentido (intercambiar
 * origen y destino) y eliminar la conexión.
 */
import Button from "../common/Button";
import type { DiagramEdge } from "../../types";

interface EdgePanelProps {
  edge: DiagramEdge;
  sourceLabel: string;
  targetLabel: string;
  onClose: () => void;
  onSetType: (edgeType: "directed" | "bidirectional") => void;
  onInvert: () => void;
  onDelete: () => void;
}

function isBidir(t?: string | null): boolean {
  return ["bidirectional", "both", "<->", "two-way"].includes(
    (t ?? "").toLowerCase(),
  );
}

function EdgePanel({
  edge,
  sourceLabel,
  targetLabel,
  onClose,
  onSetType,
  onInvert,
  onDelete,
}: EdgePanelProps) {
  const bidir = isBidir(edge.edge_type);

  return (
    <aside className="flex h-full w-80 flex-shrink-0 flex-col gap-4 overflow-y-auto border-l border-dark-border bg-dark-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Conexión
          </span>
          <h3 className="text-lg font-semibold text-white">
            {sourceLabel} {bidir ? "↔" : "→"} {targetLabel}
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar panel"
          className="rounded p-1 text-slate-400 hover:bg-dark-bg hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Dirección */}
      <div>
        <span className="form-label">Dirección</span>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => onSetType("directed")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              !bidir
                ? "border-primary-500 bg-primary-600/20 text-primary-300"
                : "border-dark-border text-slate-400 hover:text-white"
            }`}
          >
            → Un sentido
          </button>
          <button
            type="button"
            onClick={() => onSetType("bidirectional")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              bidir
                ? "border-primary-500 bg-primary-600/20 text-primary-300"
                : "border-dark-border text-slate-400 hover:text-white"
            }`}
          >
            ↔ Ambos
          </button>
        </div>
      </div>

      <Button variant="secondary" onClick={onInvert} disabled={bidir}>
        ⇄ Invertir sentido
      </Button>
      {bidir && (
        <p className="-mt-2 text-xs text-slate-500">
          Para invertir, primero cambia a "un sentido".
        </p>
      )}

      <div className="mt-auto border-t border-dark-border pt-4">
        <Button variant="danger" onClick={onDelete} className="w-full">
          Eliminar conexión
        </Button>
      </div>
    </aside>
  );
}

export default EdgePanel;
