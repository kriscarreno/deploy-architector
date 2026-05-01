import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import useProjectStore from "../store/projectStore";
import projectService from "../services/projectService";
import deployService from "../services/deployService";
import Spinner from "../components/common/Spinner";
import Badge, { statusVariant } from "../components/common/Badge";
import Button from "../components/common/Button";
import { getErrorMessage } from "../utils/errorHandler";
import { timeAgo } from "../utils/formatDate";
import useToast from "../hooks/useToast";
import type { DeployJob, Project } from "../types";

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

// ── Sub-components ────────────────────────────────────────────────────────

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

function UrlRow({ label, status }: { label: string; status: UrlStatus }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-10 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <StatusDot up={status.url ? status.up : null} />
      {status.url ? (
        <a
          href={status.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate font-mono text-xs text-primary-300 hover:underline"
        >
          {status.url}
        </a>
      ) : (
        <span className="text-xs italic text-slate-600">Sin URL</span>
      )}
      {status.url && status.statusCode !== null && (
        <span
          className={`ml-auto shrink-0 text-xs font-mono ${status.up ? "text-green-500" : "text-red-400"}`}
        >
          {status.statusCode} · {status.latencyMs}ms
        </span>
      )}
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  lastDeploy: DeployJob | null;
  urlStatuses: RepoStatus[] | null;
  checking: boolean;
  onCheck: (id: number) => void;
}

function ProjectCard({
  project,
  lastDeploy,
  urlStatuses,
  checking,
  onCheck,
}: ProjectCardProps) {
  const hasUrls = urlStatuses
    ? urlStatuses.some((r) => r.main.url || r.prod.url)
    : false;

  const overallUp =
    urlStatuses && hasUrls
      ? urlStatuses
          .flatMap((r) => [r.main, r.prod])
          .filter((u) => u.url !== null)
          .every((u) => u.up)
      : null;

  return (
    <div
      className={`card border transition-colors ${
        overallUp === true
          ? "border-green-800/40"
          : overallUp === false
            ? "border-red-800/40"
            : "border-dark-border"
      }`}
    >
      {/* Card header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {overallUp !== null ? (
            <StatusDot up={overallUp} />
          ) : (
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-700" />
          )}
          <div className="min-w-0">
            <Link
              to={`/projects/${project.id}`}
              className="font-semibold text-white hover:text-primary-400 transition-colors"
            >
              {project.name}
            </Link>
            {project.description && (
              <p className="mt-0.5 text-xs text-slate-500 truncate">
                {project.description}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-dark-surface px-2 py-0.5 text-xs text-slate-500">
            {project.repo_count ?? 0} repo
            {(project.repo_count ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>

        <Button
          variant="ghost"
          onClick={() => onCheck(project.id)}
          loading={checking}
          disabled={checking}
          className="shrink-0 text-xs py-1 px-3"
        >
          {checking
            ? "Verificando…"
            : urlStatuses
              ? "Actualizar"
              : "Verificar URLs"}
        </Button>
      </div>

      {/* Last deploy */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-xs text-slate-500">Último deploy:</span>
        {lastDeploy ? (
          <>
            <Badge
              label={lastDeploy.status}
              variant={statusVariant[lastDeploy.status] ?? "gray"}
            />
            <span className="text-xs text-slate-400">
              {timeAgo(lastDeploy.created_at)}
            </span>
            {lastDeploy.username && (
              <span className="text-xs text-slate-500">
                por{" "}
                <span className="text-slate-300">{lastDeploy.username}</span>
              </span>
            )}
            <Link
              to={`/projects/${project.id}/status`}
              className="ml-auto text-xs text-primary-400 hover:underline shrink-0"
            >
              Ver estado →
            </Link>
          </>
        ) : (
          <span className="text-xs italic text-slate-600">Sin deploys aún</span>
        )}
      </div>

      {/* URL statuses */}
      {checking && !urlStatuses && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500" />
          Verificando URLs…
        </div>
      )}

      {urlStatuses && (
        <div className="flex flex-col gap-3">
          {urlStatuses.map((repo) => (
            <div
              key={repo.repoId}
              className="rounded-lg border border-dark-border bg-dark-bg p-3"
            >
              <p className="mb-2 text-xs font-semibold text-slate-400">
                {repo.name}
              </p>
              <div className="flex flex-col gap-1.5">
                <UrlRow label="main" status={repo.main} />
                <UrlRow label="prod" status={repo.prod} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!urlStatuses && !checking && (project.repo_count ?? 0) === 0 && (
        <p className="text-xs italic text-slate-600">
          Sin repositorios configurados.
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function GlobalStatusPage() {
  const { projects, loading, fetchProjects } = useProjectStore();
  const [history, setHistory] = useState<DeployJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [urlStatuses, setUrlStatuses] = useState<Record<number, RepoStatus[]>>(
    {},
  );
  const [checking, setChecking] = useState<Record<number, boolean>>({});
  const [checkingAll, setCheckingAll] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const { toastError } = useToast();

  // Load projects + history on mount
  useEffect(() => {
    fetchProjects();
    deployService
      .getGlobalHistory()
      .then((data) => {
        setHistory(data);
        setHistoryLoading(false);
      })
      .catch(() => setHistoryLoading(false));
  }, [fetchProjects]);

  // Last deploy per project (first match since history is sorted newest-first)
  const lastDeployByProject: Record<number, DeployJob> = {};
  for (const entry of history) {
    if (!(entry.project_id in lastDeployByProject)) {
      lastDeployByProject[entry.project_id] = entry;
    }
  }

  const checkProject = useCallback(
    async (projectId: number) => {
      setChecking((prev) => ({ ...prev, [projectId]: true }));
      try {
        const data = await projectService.getStatus(projectId);
        setUrlStatuses((prev) => ({ ...prev, [projectId]: data }));
      } catch (err) {
        toastError(getErrorMessage(err));
      } finally {
        setChecking((prev) => ({ ...prev, [projectId]: false }));
      }
    },
    [toastError],
  );

  const checkAll = useCallback(async () => {
    if (projects.length === 0) return;
    setCheckingAll(true);
    await Promise.all(projects.map((p) => checkProject(p.id)));
    setLastChecked(new Date());
    setCheckingAll(false);
  }, [projects, checkProject]);

  const isAllChecking = checkingAll || Object.values(checking).some(Boolean);

  const totalProjects = projects.length;
  const checkedCount = Object.keys(urlStatuses).length;
  const upCount = Object.values(urlStatuses).filter((statuses) => {
    const relevant = statuses
      .flatMap((r) => [r.main, r.prod])
      .filter((u) => u.url);
    return relevant.length > 0 && relevant.every((u) => u.up);
  }).length;
  const downCount = Object.values(urlStatuses).filter((statuses) => {
    const relevant = statuses
      .flatMap((r) => [r.main, r.prod])
      .filter((u) => u.url);
    return relevant.length > 0 && relevant.some((u) => !u.up);
  }).length;

  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Estado general</h1>
          <p className="mt-1 text-sm text-slate-400">
            Estado de despliegue de todos tus proyectos
          </p>
          {lastChecked && (
            <p className="mt-0.5 text-xs text-slate-600">
              Última verificación completa: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          onClick={checkAll}
          loading={checkingAll}
          disabled={isAllChecking || loading || totalProjects === 0}
        >
          {checkingAll ? "Verificando todo…" : "Verificar todo"}
        </Button>
      </div>

      {/* Summary bar */}
      {checkedCount > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-full bg-dark-surface px-4 py-2 text-sm">
            <span className="text-slate-400">
              {checkedCount}/{totalProjects} verificados
            </span>
          </div>
          {upCount > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-green-900/30 px-4 py-2 text-sm text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              {upCount} online
            </div>
          )}
          {downCount > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-red-900/30 px-4 py-2 text-sm text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {downCount} con problemas
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {(loading || historyLoading) && (
        <div className="flex justify-center py-20">
          <Spinner size="xl" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !historyLoading && projects.length === 0 && (
        <div className="card py-16 text-center text-slate-500">
          No tienes proyectos aún.{" "}
          <Link to="/projects" className="text-primary-400 hover:underline">
            Crear un proyecto
          </Link>
        </div>
      )}

      {/* Project cards */}
      {!loading && !historyLoading && projects.length > 0 && (
        <div className="flex flex-col gap-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              lastDeploy={lastDeployByProject[project.id] ?? null}
              urlStatuses={urlStatuses[project.id] ?? null}
              checking={!!checking[project.id]}
              onCheck={checkProject}
            />
          ))}
        </div>
      )}
    </section>
  );
}
