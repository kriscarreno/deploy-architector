/**
 * @file HealthcheckConfigPage.tsx
 * @description Configuración de healthchecks de un proyecto para la página de
 * estado: URL base, visibilidad pública y la lista de endpoints (nombre + URL).
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import statusService from "../services/statusService";
import projectService from "../services/projectService";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Spinner from "../components/common/Spinner";
import useToast from "../hooks/useToast";
import { getErrorMessage } from "../utils/errorHandler";
import type { ProjectHealthcheck } from "../types";

/** Set estándar de healthchecks (rutas relativas a la URL base del proyecto). */
const DEFAULT_HEALTHCHECKS: { name: string; url: string }[] = [
  { name: "Database Tests", url: "/api/healthz/database" },
  { name: "Logs DB Tests", url: "/api/healthz/logs" },
  { name: "Database EF Tests", url: "/api/healthz/database-ef" },
  { name: "Cache Tests", url: "/api/healthz/cache" },
  { name: "Messaging Tests", url: "/api/healthz/messaging" },
  { name: "System Tests", url: "/api/healthz/system" },
  { name: "External Services", url: "/api/healthz/external" },
];

function HealthcheckConfigPage() {
  const { id } = useParams<{ id: string }>();
  const { toastError, toastSuccess, toastInfo } = useToast();

  const [projectName, setProjectName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [checks, setChecks] = useState<ProjectHealthcheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);

  // New healthcheck form
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addingDefaults, setAddingDefaults] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [project, cfg, hcs] = await Promise.all([
          projectService.getById(id as string),
          statusService.getConfig(id as string),
          statusService.listHealthchecks(id as string),
        ]);
        if (cancelled) return;
        setProjectName(project.name);
        setBaseUrl(cfg.status_base_url ?? "");
        setIsPublic(cfg.status_public === 1);
        setChecks(hcs);
      } catch (err) {
        if (!cancelled) toastError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, toastError]);

  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      await statusService.setConfig(id as string, {
        statusBaseUrl: baseUrl.trim(),
        statusPublic: isPublic,
      });
      toastSuccess("Configuración guardada");
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSavingCfg(false);
    }
  };

  const addCheck = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setAdding(true);
    try {
      const hc = await statusService.addHealthcheck(id as string, {
        name: newName.trim(),
        url: newUrl.trim(),
        orderIndex: checks.length,
      });
      setChecks((prev) => [...prev, hc]);
      setNewName("");
      setNewUrl("");
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const addDefaults = async () => {
    setAddingDefaults(true);
    try {
      const existing = new Set(checks.map((c) => c.name.toLowerCase()));
      const toAdd = DEFAULT_HEALTHCHECKS.filter(
        (d) => !existing.has(d.name.toLowerCase()),
      );
      if (toAdd.length === 0) {
        toastInfo("Ya tienes todos los healthchecks por defecto.");
        return;
      }
      const added: ProjectHealthcheck[] = [];
      for (let i = 0; i < toAdd.length; i++) {
        const hc = await statusService.addHealthcheck(id as string, {
          name: toAdd[i].name,
          url: toAdd[i].url,
          orderIndex: checks.length + i,
        });
        added.push(hc);
      }
      setChecks((prev) => [...prev, ...added]);
      toastSuccess(`${added.length} healthcheck(s) añadidos`);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setAddingDefaults(false);
    }
  };

  const deleteCheck = async (hcId: number) => {
    try {
      await statusService.deleteHealthcheck(id as string, hcId);
      setChecks((prev) => prev.filter((c) => c.id !== hcId));
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const effectiveUrl = (url: string) => {
    if (/^https?:\/\//i.test(url)) return url;
    if (!baseUrl) return url;
    return `${baseUrl.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          to={`/projects/${id}`}
          className="text-xs text-slate-500 hover:text-white"
        >
          ← {projectName}
        </Link>
        <h1 className="text-2xl font-bold text-white">Healthchecks / Estado</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configura los endpoints de estado de este proyecto.{" "}
          <Link to="/status/public" className="text-primary-400 hover:underline">
            Ver página pública →
          </Link>
        </p>
      </div>

      {/* Config */}
      <div className="mb-8 rounded-xl border border-dark-border bg-dark-surface p-5">
        <Input
          id="base-url"
          label="URL base"
          hint="Se antepone a las URLs relativas. Ej: https://api.miapp.com"
          placeholder="https://api.miapp.com"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4"
          />
          Mostrar en la página de estado pública
        </label>
        <div className="mt-4">
          <Button onClick={saveConfig} loading={savingCfg}>
            Guardar configuración
          </Button>
        </div>
      </div>

      {/* Healthchecks */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">
          Endpoints ({checks.length})
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={addDefaults}
          loading={addingDefaults}
          title="Añade el set estándar de healthchecks (/api/healthz/...)"
        >
          + Set por defecto
        </Button>
      </div>
      <div className="mb-4 flex flex-col gap-2">
        {checks.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-dark-border bg-dark-surface p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                    c.status === "up"
                      ? "bg-green-500"
                      : c.status === "down"
                        ? "bg-red-500"
                        : "bg-slate-500"
                  }`}
                />
                <span className="truncate text-sm font-medium text-white">
                  {c.name}
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-500">
                {effectiveUrl(c.url)}
              </div>
            </div>
            <button
              onClick={() => deleteCheck(c.id)}
              className="flex-shrink-0 text-xs text-slate-500 hover:text-red-400"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      {/* Add */}
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-dark-border p-4 sm:flex-row sm:items-end">
        <Input
          id="hc-name"
          label="Nombre"
          placeholder="Database Tests"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Input
          id="hc-url"
          label="URL o ruta"
          placeholder="/api/healthz/database"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
        />
        <Button
          onClick={addCheck}
          loading={adding}
          disabled={!newName.trim() || !newUrl.trim()}
        >
          Añadir
        </Button>
      </div>
    </section>
  );
}

export default HealthcheckConfigPage;
