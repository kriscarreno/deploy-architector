import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import useProjectStore from "../store/projectStore";
import projectService from "../services/projectService";
import Spinner from "../components/common/Spinner";
import Button from "../components/common/Button";
import { getErrorMessage } from "../utils/errorHandler";
import useToast from "../hooks/useToast";

// ── Types ─────────────────────────────────────────────────────────────────

interface UrlStatus {
  url: string | null;
  up: boolean | null;
  latencyMs: number | null;
  statusCode: number | null;
}

interface RepoStatus {
  repoId: number;
  name: string;
  main: UrlStatus;
  prod: UrlStatus;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusDot({ up }: { up: boolean | null }) {
  if (up === null)
    return (
      <span
        className="inline-block h-2.5 w-2.5 rounded-full bg-slate-600"
        title="Sin URL configurada"
      />
    );
  return up ? (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_6px_1px_rgba(74,222,128,0.6)]"
      title="Online"
    />
  ) : (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_6px_1px_rgba(239,68,68,0.6)]"
      title="Offline"
    />
  );
}

function UrlCell({
  label,
  status,
  branch,
}: {
  label: string;
  status: UrlStatus;
  branch: string;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {status.url ? (
        <div className="flex items-center gap-2">
          <StatusDot up={status.up} />
          <a
            href={status.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-mono text-xs text-primary-300 hover:underline max-w-xs"
          >
            {status.url}
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <StatusDot up={null} />
          <span className="text-xs text-slate-600 italic">
            Sin URL ({branch})
          </span>
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {status.statusCode !== null && (
          <span className={status.up ? "text-green-500" : "text-red-400"}>
            HTTP {status.statusCode}
          </span>
        )}
        {status.latencyMs !== null && status.url && (
          <span>{status.latencyMs} ms</span>
        )}
        {status.up === false && status.statusCode === null && status.url && (
          <span className="text-red-400">Sin respuesta / timeout</span>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const {
    selectedProject: project,
    fetchProject,
    detailLoading,
  } = useProjectStore();
  const [statuses, setStatuses] = useState<RepoStatus[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const { toastError } = useToast();

  useEffect(() => {
    fetchProject(id);
  }, [id, fetchProject]);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const data = await projectService.getStatus(id!);
      setStatuses(data);
      setLastChecked(new Date());
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }, [id, toastError]);

  // Auto-check when project loads
  useEffect(() => {
    if (project && !statuses) check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const overallUp =
    statuses &&
    statuses.every((r) => {
      const urls = [r.main, r.prod].filter((u) => u.url !== null);
      return urls.length === 0 || urls.every((u) => u.up);
    });

  if (detailLoading || !project) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <section>
      {/* Breadcrumb */}
      <nav aria-label="Migas de pan" className="mb-1 text-xs text-slate-500">
        <Link to="/dashboard" className="hover:text-primary-400">
          Dashboard
        </Link>
        <span className="mx-1">/</span>
        <Link to={`/projects/${id}`} className="hover:text-primary-400">
          {project.name}
        </Link>
        <span className="mx-1">/</span>
        <span className="text-slate-300">Estado</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              Estado de despliegue
            </h1>
            {statuses && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                  overallUp === null || overallUp === undefined
                    ? "bg-slate-800 text-slate-400"
                    : overallUp
                      ? "bg-green-900/50 text-green-400"
                      : "bg-red-900/50 text-red-400"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${overallUp ? "bg-green-400" : "bg-red-500"}`}
                />
                {overallUp ? "Todos online" : "Hay servicios caídos"}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">{project.name}</p>
          {lastChecked && (
            <p className="mt-0.5 text-xs text-slate-600">
              Última verificación: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/projects/${id}/healthchecks`}
            className="rounded-lg border border-dark-border px-3 py-2 text-sm text-slate-300 hover:bg-dark-surface hover:text-white"
          >
            Configurar healthchecks
          </Link>
          <Button onClick={check} loading={checking} disabled={checking}>
            {checking ? "Verificando..." : "Verificar ahora"}
          </Button>
        </div>
      </div>

      {/* No repos */}
      {(project.repos?.length ?? 0) === 0 && (
        <div className="card text-center py-12 text-slate-500">
          Este proyecto no tiene repositorios.{" "}
          <Link
            to={`/projects/${id}`}
            className="text-primary-400 hover:underline"
          >
            Añadir repos
          </Link>
        </div>
      )}

      {/* Status cards */}
      {checking && !statuses && (
        <div className="flex justify-center py-16">
          <Spinner size="xl" />
        </div>
      )}

      {statuses && (
        <div className="flex flex-col gap-4">
          {statuses.map((r) => {
            const hasAnyUrl = r.main.url || r.prod.url;
            const allUp = [r.main, r.prod]
              .filter((u) => u.url)
              .every((u) => u.up);

            return (
              <div
                key={r.repoId}
                className={`card border ${
                  !hasAnyUrl
                    ? "border-dark-border"
                    : allUp
                      ? "border-green-800/40"
                      : "border-red-800/40"
                }`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <StatusDot up={hasAnyUrl ? (allUp ? true : false) : null} />
                  <span className="font-semibold text-white">{r.name}</span>
                  {!hasAnyUrl && (
                    <span className="text-xs text-slate-500 italic">
                      Sin URLs configuradas —{" "}
                      <Link
                        to={`/projects/${id}`}
                        className="text-primary-400 hover:underline"
                      >
                        configurar
                      </Link>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <UrlCell label="main" status={r.main} branch="main" />
                  <UrlCell
                    label="production"
                    status={r.prod}
                    branch="production"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Help hint */}
      <p className="mt-6 text-xs text-slate-600">
        Configura las URLs de despliegue editando cada repositorio desde{" "}
        <Link
          to={`/projects/${id}`}
          className="text-primary-400 hover:underline"
        >
          la página del proyecto
        </Link>
        . El ping se realiza desde el servidor.
      </p>
    </section>
  );
}
