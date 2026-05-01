import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import cronstrue from "cronstrue";
import useProjectStore from "../store/projectStore";
import useDeploy, { JOB_STATUS } from "../hooks/useDeploy";
import useToast from "../hooks/useToast";
import { useProjectTour } from "../hooks/useProjectTour";
import { getErrorMessage } from "../utils/errorHandler";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import Table from "../components/common/Table";
import Spinner from "../components/common/Spinner";
import Badge, { statusVariant } from "../components/common/Badge";
import RepoAutocomplete from "../components/common/RepoAutocomplete";
import { branchRules, orderRules } from "../utils/validators";
import projectService from "../services/projectService";
import deployService from "../services/deployService";
import envVarService from "../services/envVarService";
import type { EnvVar, EnvBranch } from "../types";

// Shared repo form fields
function RepoFormFields({ register, errors, control }) {
  return (
    <>
      <Controller
        name="git_url"
        control={control}
        rules={{
          required: "La URL es obligatoria",
          pattern: {
            value: /^https?:\/\/.+/,
            message: "Debe ser una URL válida",
          },
        }}
        render={({ field }) => (
          <RepoAutocomplete
            value={field.value ?? ""}
            onChange={field.onChange}
            error={errors.git_url?.message}
          />
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="main-branch"
          label="Rama main"
          required
          placeholder="main"
          error={errors.main_branch?.message}
          {...register("main_branch", branchRules)}
        />
        <Input
          id="production-branch"
          label="Rama producción"
          required
          placeholder="production"
          error={errors.production_branch?.message}
          {...register("production_branch", branchRules)}
        />
      </div>
      <Input
        id="order"
        label="Orden de despliegue"
        type="number"
        required
        placeholder="1"
        error={errors.order?.message}
        hint="Orden en que se desplegará este repo"
        {...register("order", orderRules)}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="main-url"
          label="URL despliegue main"
          placeholder="https://staging.ejemplo.com"
          hint="URL pública de la rama main"
          error={errors.main_url?.message}
          {...register("main_url", {
            pattern: {
              value: /^(https?:\/\/.+)?$/,
              message: "Debe ser una URL válida",
            },
          })}
        />
        <Input
          id="prod-url"
          label="URL despliegue producción"
          placeholder="https://ejemplo.com"
          hint="URL pública de producción"
          error={errors.prod_url?.message}
          {...register("prod_url", {
            pattern: {
              value: /^(https?:\/\/.+)?$/,
              message: "Debe ser una URL válida",
            },
          })}
        />
      </div>
      <Input
        id="workflow-file"
        label="Archivo de workflow"
        placeholder="deploy.yml"
        hint="Nombre del archivo en .github/workflows/ para deploy manual"
        error={errors.workflow_file?.message}
        {...register("workflow_file", {
          pattern: {
            value: /^[\w.-]+\.ya?ml$/,
            message: "Debe ser un archivo .yml o .yaml",
          },
        })}
      />
    </>
  );
}

// Modal: añadir repositorio
function AddRepoModal({
  isOpen,
  onClose,
  onSubmit,
  nextOrder,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  nextOrder: number;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      git_url: "",
      main_branch: "main",
      production_branch: "production",
      order: nextOrder,
      main_url: "",
      prod_url: "",
      workflow_file: "deploy.yml",
    },
  });

  // Re-sync default when nextOrder changes (modal re-opens)
  useEffect(() => {
    if (isOpen)
      reset({
        git_url: "",
        main_branch: "main",
        production_branch: "production",
        order: nextOrder,
        main_url: "",
        prod_url: "",
        workflow_file: "deploy.yml",
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, nextOrder]);

  const submit = async (data) => {
    await onSubmit({ ...data, order: Number(data.order) });
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Añadir repositorio"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" form="add-repo-form" loading={isSubmitting}>
            Añadir repo
          </Button>
        </>
      }
    >
      <form
        id="add-repo-form"
        onSubmit={handleSubmit(submit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <RepoFormFields register={register} errors={errors} control={control} />
      </form>
    </Modal>
  );
}

// Modal: editar repositorio
function EditRepoModal({ isOpen, onClose, onSubmit, repo }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    if (repo) {
      reset({
        git_url: repo.github_url,
        main_branch: repo.main_branch,
        production_branch: repo.prod_branch,
        order: repo.order_index,
        main_url: repo.main_url ?? "",
        prod_url: repo.prod_url ?? "",
        workflow_file: repo.workflow_file ?? "deploy.yml",
      });
    }
  }, [repo, reset]);

  const submit = async (data) => {
    await onSubmit({ ...data, order: Number(data.order) });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar repositorio"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-repo-form" loading={isSubmitting}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form
        id="edit-repo-form"
        onSubmit={handleSubmit(submit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <RepoFormFields register={register} errors={errors} control={control} />
      </form>
    </Modal>
  );
}

// Modal: deploy manual de rama (workflow_dispatch)
function DispatchModal({
  isOpen,
  onClose,
  repos,
  projectId,
}: {
  isOpen: boolean;
  onClose: () => void;
  repos: {
    name: string;
    github_url: string;
    main_branch: string;
    prod_branch: string;
    workflow_file: string;
  }[];
  projectId: string;
}) {
  const defaultBranch = repos[0]?.main_branch ?? "main";
  const [branch, setBranch] = useState(defaultBranch);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    { name: string; success: boolean; httpStatus: number }[] | null
  >(null);
  const { toastSuccess, toastError } = useToast();

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setBranch(repos[0]?.main_branch ?? "main");
      setResults(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleDispatch = async () => {
    if (!branch.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const data = await deployService.dispatch(projectId, branch.trim());
      setResults(data);
      const allOk = data.every((r) => r.success);
      if (allOk) toastSuccess("Workflow lanzado en todos los repos");
      else toastError("Algunos workflows fallaron — revisa los resultados");
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Unique branches across repos for quick selection
  const branchOptions = Array.from(
    new Set(repos.flatMap((r) => [r.main_branch, r.prod_branch])),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deploy manual de rama"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {results ? "Cerrar" : "Cancelar"}
          </Button>
          {!results && (
            <Button
              onClick={handleDispatch}
              loading={loading}
              disabled={loading || !branch.trim()}
            >
              Lanzar workflow
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-400">
          Lanza un{" "}
          <span className="font-mono text-slate-200">workflow_dispatch</span> de
          GitHub Actions en la rama seleccionada — equivale al botón{" "}
          <em>"Run workflow"</em> de la UI de GitHub.
        </p>

        {!results && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Rama
              </label>
              <div className="flex gap-2">
                <select
                  value={branchOptions.includes(branch) ? branch : "__custom__"}
                  onChange={(e) => {
                    if (e.target.value !== "__custom__")
                      setBranch(e.target.value);
                  }}
                  className="rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value="__custom__">Otra…</option>
                </select>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="nombre-de-rama"
                  className="flex-1 rounded-lg border border-dark-border bg-dark-bg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="rounded-lg border border-dark-border bg-dark-surface p-3">
              <p className="mb-2 text-xs font-semibold text-slate-400">
                Workflows configurados por repo:
              </p>
              <div className="flex flex-col gap-1">
                {repos.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-300 truncate">
                      {r.name ?? r.github_url?.split("/").pop()}
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className="font-mono text-primary-300">
                      .github/workflows/{r.workflow_file || "deploy.yml"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {results && (
          <div className="flex flex-col gap-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                  r.success
                    ? "border-green-800/40 bg-green-950/20"
                    : "border-red-800/40 bg-red-950/20"
                }`}
              >
                <span className="text-sm text-slate-200">{r.name}</span>
                {r.success ? (
                  <span className="text-xs font-semibold text-green-400">
                    ✓ Lanzado
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-red-400">
                    ✗ Error (HTTP {r.httpStatus})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Panel de despliegue
interface DeployPanelProps {
  status: string;
  streamLines: string[];
  onReset: () => void;
}

function DeployPanel({ status, streamLines, onReset }: DeployPanelProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const isFinished =
    status === JOB_STATUS.SUCCESS || status === JOB_STATUS.FAILED;

  // Auto-scroll al final con cada nueva línea
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [streamLines]);

  if (status === JOB_STATUS.IDLE) return null;

  return (
    <div className="mt-6 rounded-xl border border-dark-border bg-dark-bg p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">Estado del despliegue</h3>
        <Badge label={status} variant={statusVariant[status] ?? "gray"} />
      </div>

      <div className="mb-4 flex items-center gap-3">
        {!isFinished && (
          <span className="flex items-center gap-1.5 text-xs text-primary-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary-400" />
            Transmitiendo logs en tiempo real…
          </span>
        )}
        <Button variant="ghost" onClick={onReset}>
          Cerrar
        </Button>
      </div>

      {streamLines.length > 0 && (
        <div
          ref={logRef}
          className="max-h-64 overflow-y-auto rounded-lg bg-black/60 p-3 font-mono text-xs text-green-300"
          aria-live="polite"
          aria-label="Logs del despliegue"
        >
          {streamLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {status === JOB_STATUS.SUCCESS && (
        <p className="mt-3 font-semibold text-green-400">
          Despliegue completado con éxito
        </p>
      )}
      {status === JOB_STATUS.FAILED && (
        <p className="mt-3 font-semibold text-red-400">El despliegue falló</p>
      )}
    </div>
  );
}

// ── Cron presets ─────────────────────────────────────────────────────────
const CRON_PRESETS = [
  { label: "Cada día a las 2 AM", value: "0 2 * * *" },
  { label: "Cada día a medianoche", value: "0 0 * * *" },
  { label: "Cada hora", value: "0 * * * *" },
  { label: "Cada lunes a las 9 AM", value: "0 9 * * 1" },
  { label: "Cada domingo a medianoche", value: "0 0 * * 0" },
  { label: "Personalizado", value: "__custom__" },
] as const;

function parseCron(expr: string): string {
  if (!expr) return "";
  try {
    return cronstrue.toString(expr, {
      locale: "es",
      throwExceptionOnParseError: true,
    });
  } catch {
    return "Expresión inválida";
  }
}

interface CronPanelProps {
  projectId: string;
  initialExpression: string | null;
  initialEnabled: number;
  onSaved: () => void;
}

function CronPanel({
  projectId,
  initialExpression,
  initialEnabled,
  onSaved,
}: CronPanelProps) {
  const [enabled, setEnabled] = useState(!!initialEnabled);
  const [preset, setPreset] = useState<string>(() => {
    if (!initialExpression) return CRON_PRESETS[0].value;
    const found = CRON_PRESETS.find(
      (p) => p.value !== "__custom__" && p.value === initialExpression,
    );
    return found ? found.value : "__custom__";
  });
  const [custom, setCustom] = useState(initialExpression ?? "");
  const [saving, setSaving] = useState(false);
  const { toastSuccess, toastError } = useToast();

  const expression = preset === "__custom__" ? custom : preset;
  const description = expression ? parseCron(expression) : "";
  const isInvalid = expression && description === "Expresión inválida";

  const save = async () => {
    setSaving(true);
    try {
      await projectService.updateCron(projectId, {
        cron_expression: enabled ? expression || null : null,
        cron_enabled: enabled,
      });
      toastSuccess(
        enabled ? "Despliegue programado guardado" : "Programa desactivado",
      );
      onSaved();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="tour-cron-section" className="mt-6 card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Despliegue programado
        </h2>
        {/* Toggle */}
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            enabled ? "bg-primary-500" : "bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {!enabled && (
        <p className="mt-3 text-sm text-slate-500">
          Activa el interruptor para configurar un despliegue automático
          periódico.
        </p>
      )}

      {enabled && (
        <div className="mt-4 flex flex-col gap-4">
          {/* Preset selector */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Frecuencia
            </label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {CRON_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom expression */}
          {preset === "__custom__" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Expresión cron
                <a
                  href="https://crontab.guru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-primary-400 hover:underline"
                >
                  ¿Ayuda?
                </a>
              </label>
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="0 2 * * *"
                className={`w-full rounded-lg border bg-dark-bg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 ${
                  isInvalid
                    ? "border-red-500 text-red-300 focus:ring-red-500"
                    : "border-dark-border text-slate-200 focus:ring-primary-500"
                }`}
              />
            </div>
          )}

          {/* Human-readable preview */}
          {expression && (
            <div
              className={`rounded-lg px-4 py-2 text-sm ${
                isInvalid
                  ? "bg-red-950/30 text-red-400"
                  : "bg-primary-950/30 text-primary-300"
              }`}
            >
              {isInvalid ? (
                "Expresión inválida. Ejemplo válido: 0 2 * * *"
              ) : (
                <>
                  <span className="font-medium">Ejecutará:</span> {description}{" "}
                  <span className="text-slate-500">(UTC)</span>
                </>
              )}
            </div>
          )}

          <Button
            onClick={save}
            loading={saving}
            disabled={saving || !!isInvalid || !expression}
            className="self-start"
          >
            Guardar programa
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Modal: Variables de entorno por repo ──────────────────────────────────
const ENV_BRANCHES: EnvBranch[] = ["main", "production"];

/**
 * Parses .env file text into key/value pairs.
 * Handles: comments, blank lines, quoted values, `export KEY=VALUE` syntax.
 */
function parseEnvText(text: string): Array<{ key: string; value: string }> {
  const result: Array<{ key: string; value: string }> = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    // Skip empty lines and comments
    if (!line || line.startsWith("#")) continue;
    // Strip optional `export ` prefix
    const stripped = line.replace(/^export\s+/, "");
    const eqIdx = stripped.indexOf("=");
    if (eqIdx === -1) continue;
    const key = stripped.slice(0, eqIdx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = stripped.slice(eqIdx + 1).trim();
    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
    // Remove inline comment (only when value is unquoted)
    else {
      const commentIdx = value.indexOf(" #");
      if (commentIdx !== -1) value = value.slice(0, commentIdx).trim();
    }
    result.push({ key: key.toUpperCase(), value });
  }
  return result;
}

function EnvVarsModal({
  isOpen,
  onClose,
  projectId,
  repo,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  repo: { id: number; name: string } | null;
}) {
  const [activeBranch, setActiveBranch] = useState<EnvBranch>("main");
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<number, boolean>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addKey, setAddKey] = useState("");
  const [addValue, setAddValue] = useState("");
  const [addSecret, setAddSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  // Paste mode
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const { toastSuccess, toastError } = useToast();

  const parsed = pasteMode ? parseEnvText(pasteText) : [];

  const load = async () => {
    if (!repo) return;
    setLoading(true);
    try {
      const data = await envVarService.getAll(projectId, repo.id, activeBranch);
      setVars(data);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && repo) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, repo, activeBranch]);

  // Reset paste state when modal closes or branch changes
  useEffect(() => {
    if (!isOpen) {
      setPasteMode(false);
      setPasteText("");
    }
  }, [isOpen]);
  useEffect(() => {
    setPasteMode(false);
    setPasteText("");
  }, [activeBranch]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repo || !addKey.trim()) return;
    setSaving(true);
    try {
      await envVarService.upsert(projectId, repo.id, {
        branch: activeBranch,
        key: addKey.trim().toUpperCase(),
        value: addValue,
        is_secret: addSecret,
      });
      toastSuccess("Variable guardada");
      setAddKey("");
      setAddValue("");
      setAddSecret(false);
      await load();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = async () => {
    if (!repo || parsed.length === 0) return;
    setSaving(true);
    try {
      const { imported } = await envVarService.bulkUpsert(
        projectId,
        repo.id,
        activeBranch,
        parsed.map((p) => ({ ...p, is_secret: false })),
      );
      toastSuccess(
        `${imported} variable${imported !== 1 ? "s" : ""} importada${imported !== 1 ? "s" : ""}`,
      );
      setPasteMode(false);
      setPasteText("");
      await load();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (v: EnvVar) => {
    if (!repo) return;
    setSaving(true);
    try {
      await envVarService.update(projectId, repo.id, v.id, {
        value: editValue,
      });
      toastSuccess("Variable actualizada");
      setEditingId(null);
      await load();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (envId: number) => {
    if (!repo || !window.confirm("¿Eliminar esta variable?")) return;
    try {
      await envVarService.remove(projectId, repo.id, envId);
      toastSuccess("Variable eliminada");
      await load();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleExport = () => {
    if (!repo) return;
    const url = envVarService.exportUrl(projectId, repo.id, activeBranch);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!repo) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Variables de entorno — ${repo.name}`}
      footer={
        <div className="flex w-full items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleExport}
            title={`Descargar .env.${activeBranch}`}
          >
            ↓ Exportar .env
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      {/* Branch tabs */}
      <div className="mb-4 flex gap-2">
        {ENV_BRANCHES.map((b) => (
          <button
            key={b}
            onClick={() => setActiveBranch(b)}
            className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
              activeBranch === b
                ? "bg-primary-600 text-white"
                : "bg-dark-surface text-slate-400 hover:text-slate-200"
            }`}
          >
            {b}
          </button>
        ))}
        <button
          onClick={() => setPasteMode((v) => !v)}
          className={`ml-auto rounded-full px-4 py-1 text-sm font-medium transition-colors ${
            pasteMode
              ? "bg-yellow-600 text-white"
              : "bg-dark-surface text-slate-400 hover:text-slate-200"
          }`}
          title="Pegar contenido de archivo .env"
        >
          📋 Pegar .env
        </button>
      </div>

      {/* ── Paste mode ── */}
      {pasteMode ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-400">
            Pega aquí el contenido de tu archivo{" "}
            <span className="font-mono text-slate-300">.env</span>. Las líneas
            con comentarios (<span className="font-mono">#</span>) y las
            inválidas se ignoran. Los valores existentes se{" "}
            <strong className="text-yellow-400">sobreescriben</strong>.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={
              "# Ejemplo\nDATABASE_URL=postgres://...\nAPI_KEY=secreto123\nDEBUG=false"
            }
            rows={10}
            className="w-full rounded-lg border border-dark-border bg-black/40 px-3 py-2 font-mono text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            spellCheck={false}
          />

          {/* Preview */}
          {parsed.length > 0 && (
            <div className="rounded-lg border border-dark-border bg-dark-surface p-3">
              <p className="mb-2 text-xs font-semibold text-slate-400">
                Vista previa — {parsed.length} variable
                {parsed.length !== 1 ? "s" : ""} detectada
                {parsed.length !== 1 ? "s" : ""}:
              </p>
              <div className="max-h-36 overflow-y-auto flex flex-col gap-1">
                {parsed.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 font-mono text-xs"
                  >
                    <span className="text-primary-300 w-40 shrink-0 truncate">
                      {p.key}
                    </span>
                    <span className="text-slate-400 shrink-0">=</span>
                    <span className="text-slate-300 truncate">
                      {p.value || <em className="text-slate-600">(vacío)</em>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pasteText && parsed.length === 0 && (
            <p className="text-xs text-red-400">
              No se encontraron variables válidas en el texto pegado.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleBulkImport}
              loading={saving}
              disabled={saving || parsed.length === 0}
            >
              Importar {parsed.length > 0 ? `(${parsed.length})` : ""}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPasteMode(false);
                setPasteText("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Add variable form */}
          <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={addKey}
                onChange={(e) => setAddKey(e.target.value)}
                placeholder="NOMBRE_VAR"
                className="form-input flex-1 font-mono text-sm uppercase"
                pattern="[A-Za-z_][A-Za-z0-9_]*"
                title="Letras, dígitos y guión bajo"
              />
              <input
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                placeholder="valor"
                type={addSecret ? "password" : "text"}
                className="form-input flex-1 font-mono text-sm"
              />
              <label className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={addSecret}
                  onChange={(e) => setAddSecret(e.target.checked)}
                  className="accent-primary-500"
                />
                Secreto
              </label>
              <Button
                type="submit"
                loading={saving}
                disabled={saving || !addKey.trim()}
              >
                +
              </Button>
            </div>
          </form>

          {/* Variables list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : vars.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-6">
              No hay variables para la rama{" "}
              <span className="font-mono text-slate-300">{activeBranch}</span>.
            </p>
          ) : (
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
              {vars.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 rounded-lg bg-dark-surface px-3 py-2"
                >
                  <span className="w-40 shrink-0 font-mono text-xs font-semibold text-primary-300 truncate">
                    {v.key}
                  </span>
                  {editingId === v.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="form-input flex-1 font-mono text-xs py-1"
                    />
                  ) : (
                    <span className="flex-1 font-mono text-xs text-slate-300 truncate">
                      {v.is_secret && !showSecret[v.id] ? "••••••••" : v.value}
                    </span>
                  )}
                  <div className="flex shrink-0 items-center gap-1">
                    {v.is_secret && editingId !== v.id && (
                      <button
                        onClick={() =>
                          setShowSecret((s) => ({ ...s, [v.id]: !s[v.id] }))
                        }
                        className="rounded p-1 text-xs text-slate-500 hover:text-slate-300"
                        title={showSecret[v.id] ? "Ocultar" : "Mostrar"}
                      >
                        {showSecret[v.id] ? "🙈" : "👁"}
                      </button>
                    )}
                    {editingId === v.id ? (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => handleUpdate(v)}
                          loading={saving}
                          disabled={saving}
                          className="py-1 px-2 text-xs"
                        >
                          Guardar
                        </Button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded p-1 text-xs text-slate-500 hover:text-slate-300"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(v.id);
                          setEditValue(v.value);
                        }}
                        className="rounded p-1 text-slate-500 hover:text-primary-400 transition-colors"
                        title="Editar valor"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="rounded p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

// Project Detail Page
function ProjectDetailPage() {
  const { id } = useParams();
  const [addRepoOpen, setAddRepoOpen] = useState(false);
  const [editRepo, setEditRepo] = useState(null);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [envVarsRepo, setEnvVarsRepo] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const { toastSuccess, toastError } = useToast();
  const { startTour } = useProjectTour();
  const {
    selectedProject: project,
    detailLoading,
    fetchProject,
    addRepo,
    removeRepo,
    updateRepo,
    clearSelectedProject,
  } = useProjectStore();

  const { deploy, status, streamLines, isDeploying, reset } = useDeploy(id);

  type RepoDiff = {
    repoId: number;
    name: string;
    diff: string;
    upToDate: boolean;
  };
  const [diffs, setDiffs] = useState<RepoDiff[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const checkDiff = async (silent = false) => {
    setDiffLoading(true);
    if (!silent) setDiffs(null);
    try {
      const result = await projectService.getDiff(id);
      setDiffs(result);
    } catch (err) {
      if (!silent) toastError(getErrorMessage(err));
    } finally {
      setDiffLoading(false);
    }
  };

  useEffect(() => {
    fetchProject(id);
    return clearSelectedProject;
  }, [id, fetchProject, clearSelectedProject]);

  // Auto-load diff in background once repos are available
  const repoCount = project?.repos?.length ?? 0;
  useEffect(() => {
    if (repoCount > 0) checkDiff(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoCount]);

  const handleAddRepo = async (payload) => {
    try {
      await addRepo(id, payload);
      toastSuccess("Repositorio añadido");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleEditRepo = async (payload) => {
    try {
      await updateRepo(id, editRepo.id, payload);
      toastSuccess("Repositorio actualizado");
      setEditRepo(null);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleRemoveRepo = async (repoId) => {
    if (!window.confirm("¿Eliminar este repositorio del proyecto?")) return;
    try {
      await removeRepo(id, repoId);
      toastSuccess("Repositorio eliminado");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const columns = [
    { key: "order_index", label: "#", width: "48px" },
    {
      key: "github_url",
      label: "Repositorio",
      render: (val) => (
        <span className="font-mono text-xs text-primary-300 break-all">
          {val}
        </span>
      ),
    },
    { key: "main_branch", label: "Rama main" },
    { key: "prod_branch", label: "Rama producción" },
    {
      key: "sync",
      label: "Sincronización",
      width: "130px",
      render: (_val, row) => {
        if (diffLoading && !diffs) {
          return (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500" />
              Verificando…
            </span>
          );
        }
        const info = diffs?.find((d) => d.repoId === row.id);
        if (!info) return <span className="text-xs text-slate-600">—</span>;
        return info.upToDate ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Al día
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs font-medium text-yellow-400">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            Pendiente
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "",
      width: "120px",
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEnvVarsRepo({ id: row.id, name: row.name })}
            aria-label={`Variables de entorno de ${row.name}`}
            title="Variables de entorno"
            className="rounded p-1 text-slate-500 hover:text-yellow-400 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20 3H4v2h16V3zm1 7H3v2h18v-2zm-1 7H4v2h16v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setEditRepo(row)}
            aria-label={`Editar repo ${row.github_url}`}
            className="rounded p-1 text-slate-500 hover:text-primary-400 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
          <button
            onClick={() => handleRemoveRepo(row.id)}
            aria-label={`Eliminar repo ${row.github_url}`}
            className="rounded p-1 text-slate-500 hover:text-red-400 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  if (detailLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-12 text-center text-slate-400">
        Proyecto no encontrado.{" "}
        <Link to="/dashboard" className="text-primary-400 underline">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  return (
    <section>
      <nav aria-label="Migas de pan" className="mb-1 text-xs text-slate-500">
        <Link to="/dashboard" className="hover:text-primary-400">
          Dashboard
        </Link>
        <span className="mx-1">/</span>
        <span className="text-slate-300">{project.name}</span>
      </nav>

      <div
        id="tour-project-header"
        className="mb-6 flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-slate-400">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={startTour}
            title="Ver tutorial"
            aria-label="Ver tutorial guiado"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-dark-border bg-dark-surface text-slate-400 hover:border-primary-500 hover:text-primary-400 transition-colors text-sm font-semibold"
          >
            ?
          </button>
          <Link
            to={`/projects/${id}/status`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark-surface px-3 py-1.5 text-sm text-slate-300 hover:border-primary-500 hover:text-primary-400 transition-colors"
            title="Ver estado de despliegue"
          >
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            Estado
          </Link>
          <Button variant="secondary" onClick={() => setAddRepoOpen(true)}>
            + Añadir repo
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDispatchOpen(true)}
            disabled={(project.repos?.length ?? 0) === 0}
            title="Lanzar workflow de GitHub Actions manualmente en una rama"
          >
            Deploy rama
          </Button>
          <Button
            onClick={deploy}
            loading={isDeploying}
            disabled={isDeploying || (project.repos?.length ?? 0) === 0}
            aria-label="Desplegar proyecto ahora"
          >
            {isDeploying ? "Desplegando..." : "Desplegar ahora"}
          </Button>
        </div>
      </div>

      <div id="tour-repo-table" className="card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Repositorios ({project.repos?.length ?? 0})
        </h2>
        <Table
          columns={columns}
          data={project.repos ?? []}
          emptyMessage="Sin repositorios. Añade el primero para poder desplegar."
        />
      </div>

      {/* Cambios pendientes */}
      <div id="tour-diff-section" className="mt-6 card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Cambios pendientes
          </h2>
          <Button
            variant="ghost"
            onClick={() => checkDiff()}
            loading={diffLoading}
            disabled={diffLoading || (project.repos?.length ?? 0) === 0}
          >
            {diffLoading
              ? "Verificando..."
              : diffs
                ? "Actualizar"
                : "Ver cambios"}
          </Button>
        </div>

        {!diffs && !diffLoading && (
          <p className="mt-3 text-sm text-slate-500">
            Haz clic en "Ver cambios" para comparar main con producción en cada
            repo.
          </p>
        )}

        {diffs && (
          <div className="mt-4 flex flex-col gap-4">
            {diffs.map((r) => (
              <div
                key={r.repoId}
                className={`rounded-lg border p-4 ${
                  r.upToDate
                    ? "border-green-800/40 bg-green-950/20"
                    : "border-yellow-800/40 bg-yellow-950/20"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      r.upToDate ? "bg-green-400" : "bg-yellow-400"
                    }`}
                  />
                  <span className="text-sm font-medium text-slate-200">
                    {r.name}
                  </span>
                  {r.upToDate && (
                    <span className="text-xs text-green-400">Al día</span>
                  )}
                </div>
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300">
                  {r.diff}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeployPanel status={status} streamLines={streamLines} onReset={reset} />

      <CronPanel
        projectId={id!}
        initialExpression={project.cron_expression ?? null}
        initialEnabled={project.cron_enabled ?? 0}
        onSaved={() => fetchProject(id)}
      />

      <AddRepoModal
        isOpen={addRepoOpen}
        onClose={() => setAddRepoOpen(false)}
        onSubmit={handleAddRepo}
        nextOrder={(project.repos?.length ?? 0) + 1}
      />
      <EditRepoModal
        isOpen={Boolean(editRepo)}
        onClose={() => setEditRepo(null)}
        onSubmit={handleEditRepo}
        repo={editRepo}
      />
      <DispatchModal
        isOpen={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        repos={project.repos ?? []}
        projectId={id!}
      />
      <EnvVarsModal
        isOpen={Boolean(envVarsRepo)}
        onClose={() => setEnvVarsRepo(null)}
        projectId={id!}
        repo={envVarsRepo}
      />
    </section>
  );
}

export default ProjectDetailPage;
