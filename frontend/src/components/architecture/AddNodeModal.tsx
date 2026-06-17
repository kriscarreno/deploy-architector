/**
 * @file AddNodeModal.tsx
 * @description Modal para añadir un nodo al diagrama: o bien una referencia a
 * un proyecto existente, o bien un servicio externo con metadata + healthcheck.
 */
import { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Input from "../common/Input";
import type { NodePayload } from "../../services/diagramService";
import type { Project } from "../../types";

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onAdd: (payload: NodePayload) => Promise<unknown>;
}

const SERVICE_TYPES = [
  "API",
  "Database",
  "Cache",
  "Queue",
  "Storage",
  "CDN",
  "Auth",
  "Webhook",
  "Otro",
];

function AddNodeModal({ isOpen, onClose, projects, onAdd }: AddNodeModalProps) {
  const [kind, setKind] = useState<"project" | "external">("external");
  const [submitting, setSubmitting] = useState(false);

  // external fields
  const [label, setLabel] = useState("");
  const [serviceType, setServiceType] = useState("API");
  const [url, setUrl] = useState("");
  const [healthcheckUrl, setHealthcheckUrl] = useState("");
  const [color, setColor] = useState("#a855f7");
  const [notes, setNotes] = useState("");
  // project field
  const [projectId, setProjectId] = useState<number | "">("");

  const reset = () => {
    setKind("external");
    setLabel("");
    setServiceType("API");
    setUrl("");
    setHealthcheckUrl("");
    setColor("#a855f7");
    setNotes("");
    setProjectId("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canSubmit =
    kind === "project" ? projectId !== "" : label.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (kind === "project") {
        const project = projects.find((p) => p.id === Number(projectId));
        await onAdd({
          kind: "project",
          projectId: Number(projectId),
          label: project?.name ?? "Proyecto",
        });
      } else {
        await onAdd({
          kind: "external",
          label: label.trim(),
          serviceType,
          url: url.trim() || null,
          healthcheckUrl: healthcheckUrl.trim() || null,
          color,
          notes: notes.trim() || null,
        });
      }
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Añadir nodo"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={submitting} disabled={!canSubmit}>
            Añadir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Tipo de nodo */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind("external")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              kind === "external"
                ? "border-primary-500 bg-primary-600/20 text-primary-300"
                : "border-dark-border text-slate-400 hover:text-white"
            }`}
          >
            Servicio externo
          </button>
          <button
            type="button"
            onClick={() => setKind("project")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              kind === "project"
                ? "border-primary-500 bg-primary-600/20 text-primary-300"
                : "border-dark-border text-slate-400 hover:text-white"
            }`}
          >
            Proyecto
          </button>
        </div>

        {kind === "project" ? (
          <div className="w-full">
            <label htmlFor="node-project" className="form-label">
              Proyecto
            </label>
            <select
              id="node-project"
              className="form-input"
              value={projectId}
              onChange={(e) =>
                setProjectId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Selecciona un proyecto…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <Input
              id="node-label"
              label="Nombre"
              required
              placeholder="p.ej. Postgres prod"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <div className="w-full">
              <label htmlFor="node-type" className="form-label">
                Tipo de servicio
              </label>
              <select
                id="node-type"
                className="form-input"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Input
              id="node-url"
              label="URL"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Input
              id="node-healthcheck"
              label="Healthcheck URL"
              hint="Si la rellenas, el backend la pinguea y muestra estado verde/rojo."
              placeholder="https://…/health"
              value={healthcheckUrl}
              onChange={(e) => setHealthcheckUrl(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <label htmlFor="node-color" className="form-label mb-0">
                Color
              </label>
              <input
                id="node-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-dark-border bg-transparent"
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default AddNodeModal;
