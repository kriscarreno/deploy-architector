/**
 * @file NodePanel.tsx
 * @description Panel lateral del nodo seleccionado. Para servicios externos
 * permite editar su metadata; para proyectos muestra info y enlace al detalle.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { iconFor } from "./nodeIcon";
import type { DiagramEdge, DiagramNode } from "../../types";
import type { NodePayload } from "../../services/diagramService";

interface NodePanelProps {
  node: DiagramNode;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  onClose: () => void;
  onSave: (nodeId: number, payload: Partial<NodePayload>) => Promise<unknown>;
  onDelete: (nodeId: number) => Promise<unknown>;
  onStartConnect: (nodeId: number) => void;
  onSetEdgeType: (edgeId: number, type: "directed" | "bidirectional") => void;
  onInvertEdge: (edge: DiagramEdge) => void;
  onDeleteEdge: (edgeId: number) => void;
}

const STATUS_VARIANT: Record<string, "green" | "red" | "gray"> = {
  up: "green",
  down: "red",
  unknown: "gray",
};

function isBidir(t?: string | null): boolean {
  return ["bidirectional", "both", "<->", "two-way"].includes(
    (t ?? "").toLowerCase(),
  );
}

function NodePanel({
  node,
  nodes,
  edges,
  onClose,
  onSave,
  onDelete,
  onStartConnect,
  onSetEdgeType,
  onInvertEdge,
  onDeleteEdge,
}: NodePanelProps) {
  const isExternal = node.kind === "external";
  const nameOf = (nodeId: number) =>
    nodes.find((n) => n.id === nodeId)?.label ?? "?";
  const connections = edges.filter(
    (e) => e.source_node_id === node.id || e.target_node_id === node.id,
  );
  const [label, setLabel] = useState(node.label);
  const [serviceType, setServiceType] = useState(node.service_type ?? "");
  const [url, setUrl] = useState(node.url ?? "");
  const [healthcheckUrl, setHealthcheckUrl] = useState(
    node.healthcheck_url ?? "",
  );
  const [notes, setNotes] = useState(node.notes ?? "");
  const [saving, setSaving] = useState(false);

  // Re-sync local state when a different node is selected
  useEffect(() => {
    setLabel(node.label);
    setServiceType(node.service_type ?? "");
    setUrl(node.url ?? "");
    setHealthcheckUrl(node.healthcheck_url ?? "");
    setNotes(node.notes ?? "");
  }, [node]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(node.id, {
        label: label.trim() || node.label,
        serviceType: serviceType.trim() || null,
        url: url.trim() || null,
        healthcheckUrl: healthcheckUrl.trim() || null,
        notes: notes.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="flex h-full w-80 flex-shrink-0 flex-col border-l border-dark-border bg-dark-surface">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {(() => {
            const Icon = iconFor(node);
            return (
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-dark-bg text-primary-400">
                <Icon size={20} />
              </span>
            );
          })()}
          <div>
            <span className="text-xs uppercase tracking-wide text-slate-500">
              {isExternal ? "Servicio externo" : "Proyecto"}
            </span>
            <h3 className="text-lg font-semibold text-white">{node.label}</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar panel"
          className="rounded p-1 text-slate-400 hover:bg-dark-bg hover:text-white"
        >
          ✕
        </button>
      </div>

      {node.healthcheck_url && (
        <div className="flex items-center gap-2 text-sm">
          <Badge
            variant={STATUS_VARIANT[node.status] ?? "gray"}
            label={node.status}
          />
          {node.last_checked_at && (
            <span className="text-xs text-slate-500">
              {new Date(node.last_checked_at).toLocaleString("es-ES")}
            </span>
          )}
        </div>
      )}

      {isExternal ? (
        <div className="flex flex-col gap-3">
          <Field label="Nombre" value={label} onChange={setLabel} />
          <Field
            label="Tipo de servicio"
            value={serviceType}
            onChange={setServiceType}
          />
          <Field label="URL" value={url} onChange={setUrl} placeholder="https://…" />
          <Field
            label="Healthcheck URL"
            value={healthcheckUrl}
            onChange={setHealthcheckUrl}
            placeholder="https://…/health"
          />
          <div className="w-full">
            <label className="form-label">Notas</label>
            <textarea
              className="form-input min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button onClick={save} loading={saving}>
            Guardar cambios
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-sm text-slate-300">
          {node.project_id ? (
            <Link
              to={`/projects/${node.project_id}`}
              className="text-primary-400 hover:underline"
            >
              Abrir proyecto →
            </Link>
          ) : (
            <p className="text-amber-400">
              Referencia de proyecto huérfana (no existe en este entorno).
            </p>
          )}
          {node.notes && <p className="text-slate-400">{node.notes}</p>}
        </div>
      )}

      {/* Conexiones de este nodo */}
      <div className="border-t border-dark-border pt-3">
        <span className="form-label">
          Conexiones ({connections.length})
        </span>
        {connections.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            Sin conexiones. Usa "Conectar desde aquí".
          </p>
        ) : (
          <ul className="mt-1 flex flex-col gap-2">
            {connections.map((e) => {
              const bidir = isBidir(e.edge_type);
              return (
                <li
                  key={e.id}
                  className="rounded-lg border border-dark-border bg-dark-bg/50 p-2"
                >
                  <div className="mb-1 truncate text-xs text-slate-300">
                    {nameOf(e.source_node_id)} {bidir ? "↔" : "→"}{" "}
                    {nameOf(e.target_node_id)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        onSetEdgeType(e.id, bidir ? "directed" : "bidirectional")
                      }
                      className="rounded bg-dark-surface px-2 py-1 text-xs text-slate-300 hover:bg-dark-border"
                      title="Alternar un sentido / ambos extremos"
                    >
                      {bidir ? "→ Un sentido" : "↔ Ambos"}
                    </button>
                    <button
                      onClick={() => onInvertEdge(e)}
                      disabled={bidir}
                      className="rounded bg-dark-surface px-2 py-1 text-xs text-slate-300 hover:bg-dark-border disabled:opacity-40"
                      title="Invertir el sentido de la flecha"
                    >
                      ⇄ Invertir
                    </button>
                    <button
                      onClick={() => onDeleteEdge(e.id)}
                      className="ml-auto rounded px-2 py-1 text-xs text-slate-400 hover:text-red-400"
                      title="Eliminar conexión"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </div>

      {/* Acciones siempre visibles (footer fijo) */}
      <div className="flex flex-shrink-0 flex-col gap-2 border-t border-dark-border bg-dark-surface p-4">
        <Button variant="secondary" onClick={() => onStartConnect(node.id)}>
          Conectar desde aquí
        </Button>
        <Button variant="danger" onClick={() => onDelete(node.id)}>
          Eliminar nodo
        </Button>
      </div>
    </aside>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="w-full">
      <label className="form-label">{label}</label>
      <input
        className="form-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default NodePanel;
