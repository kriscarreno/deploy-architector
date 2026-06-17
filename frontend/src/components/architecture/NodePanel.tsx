/**
 * @file NodePanel.tsx
 * @description Panel lateral del nodo seleccionado. Para servicios externos
 * permite editar su metadata; para proyectos muestra info y enlace al detalle.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import Badge from "../common/Badge";
import type { DiagramNode } from "../../types";
import type { NodePayload } from "../../services/diagramService";

interface NodePanelProps {
  node: DiagramNode;
  onClose: () => void;
  onSave: (nodeId: number, payload: Partial<NodePayload>) => Promise<unknown>;
  onDelete: (nodeId: number) => Promise<unknown>;
  onStartConnect: (nodeId: number) => void;
}

const STATUS_VARIANT: Record<string, "green" | "red" | "gray"> = {
  up: "green",
  down: "red",
  unknown: "gray",
};

function NodePanel({
  node,
  onClose,
  onSave,
  onDelete,
  onStartConnect,
}: NodePanelProps) {
  const isExternal = node.kind === "external";
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
    <aside className="flex h-full w-80 flex-shrink-0 flex-col gap-4 overflow-y-auto border-l border-dark-border bg-dark-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            {isExternal ? "Servicio externo" : "Proyecto"}
          </span>
          <h3 className="text-lg font-semibold text-white">{node.label}</h3>
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

      <div className="mt-auto flex flex-col gap-2 border-t border-dark-border pt-4">
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
