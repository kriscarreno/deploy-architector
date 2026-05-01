import { useEffect, useRef, useState, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import useProjects from "../hooks/useProjects";
import useToast from "../hooks/useToast";
import deployService from "../services/deployService";
import configService from "../services/configService";
import { getErrorMessage } from "../utils/errorHandler";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import Spinner from "../components/common/Spinner";
import Badge, { statusVariant } from "../components/common/Badge";
import { projectNameRules } from "../utils/validators";
import { formatDate } from "../utils/formatDate";
import type { Project, DeployJob } from "../types";

interface CreateProjectForm {
  name: string;
  description?: string;
}

// ── Stat card ────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "green" | "red" | "yellow" | "blue" | "default";
  icon: React.ReactNode;
}

function StatCard({
  label,
  value,
  sub,
  accent = "default",
  icon,
}: StatCardProps) {
  const accentClass = {
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
    blue: "text-primary-400",
    default: "text-white",
  }[accent];

  return (
    <div className="card flex items-start gap-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-dark-border text-slate-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 uppercase tracking-wider">
          {label}
        </p>
        <p className={`mt-1 text-3xl font-bold ${accentClass}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// ── Recent deploy row ─────────────────────────────────────────────────────
const RecentDeployRow = memo(function RecentDeployRow({
  job,
}: {
  job: DeployJob;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-dark-border last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {job.project_name ?? "—"}
        </p>
        <p className="text-xs text-slate-500">
          {job.created_at ? formatDate(job.created_at) : "—"}
        </p>
      </div>
      <Badge label={job.status} variant={statusVariant[job.status] ?? "gray"} />
    </div>
  );
});

// ── Modal crear proyecto ──────────────────────────────────────────────────
function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectForm) => Promise<unknown>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectForm>();

  const submit = async (data: CreateProjectForm) => {
    await onSubmit(data);
    reset();
    onClose();
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nuevo proyecto"
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="create-project-form"
            loading={isSubmitting}
          >
            Crear proyecto
          </Button>
        </>
      }
    >
      <form
        id="create-project-form"
        onSubmit={handleSubmit(submit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          id="project-name"
          label="Nombre"
          required
          placeholder="mi-proyecto"
          error={errors.name?.message as string | undefined}
          {...register("name", projectNameRules)}
        />
        <Input
          id="project-description"
          label="Descripción"
          placeholder="Descripción opcional"
          error={errors.description?.message as string | undefined}
          {...register("description", {
            maxLength: { value: 200, message: "Máximo 200 caracteres" },
          })}
        />
      </form>
    </Modal>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────
function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [history, setHistory] = useState<DeployJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const {
    projects,
    loading: projectsLoading,
    createProject,
    refresh: refreshProjects,
  } = useProjects();
  const { toastError, toastSuccess } = useToast();
  const navigate = useNavigate();

  const handleExport = async () => {
    setExporting(true);
    try {
      await configService.downloadExport();
    } catch (err: unknown) {
      toastError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-imported if needed
    e.target.value = "";
    setImporting(true);
    try {
      const result = await configService.importFromFile(file);
      toastSuccess(
        `Importados ${result.imported} proyecto${result.imported !== 1 ? "s" : ""} correctamente.`,
      );
      await refreshProjects();
    } catch (err: unknown) {
      toastError(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    deployService
      .getGlobalHistory()
      .then((data: DeployJob[]) => {
        if (!cancelled) {
          setHistory(data);
          setHistoryLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toastError(getErrorMessage(err));
          setHistoryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toastError]);

  // ── Métricas calculadas ──────────────────────────────────────────────
  const totalProjects = projects.length;
  const totalRepos = projects.reduce((s, p) => s + (p.repo_count ?? 0), 0);

  const deploysSuccess = history.filter((j) => j.status === "success").length;
  const deploysFailed = history.filter(
    (j) => j.status === "failed" || j.status === "conflict",
  ).length;
  const deploysRunning = history.filter(
    (j) => j.status === "running" || j.status === "queued",
  ).length;
  const totalDeploys = history.length;

  const successRate =
    totalDeploys > 0 ? Math.round((deploysSuccess / totalDeploys) * 100) : null;

  const recentDeploys = history.slice(0, 8);

  // Últimos proyectos creados
  const recentProjects: Project[] = [...projects]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Resumen de actividad</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleExport}
            loading={exporting}
            title="Exportar configuración de proyectos"
          >
            Exportar
          </Button>
          <Button
            variant="secondary"
            onClick={() => importInputRef.current?.click()}
            loading={importing}
            title="Importar configuración desde un archivo JSON"
          >
            Importar
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="secondary" onClick={() => navigate("/projects")}>
            Ver proyectos
          </Button>
          <Button onClick={() => setModalOpen(true)}>+ Nuevo proyecto</Button>
        </div>
      </div>

      {/* Stats grid */}
      {projectsLoading || historyLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Proyectos"
              value={totalProjects}
              sub={`${totalRepos} repositorios en total`}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M3 3h8v8H3zm0 10h8v8H3zm10-10h8v8h-8zm0 10h8v8h-8z" />
                </svg>
              }
            />
            <StatCard
              label="Deploys exitosos"
              value={deploysSuccess}
              sub={
                successRate !== null
                  ? `${successRate}% tasa de éxito`
                  : "Sin deploys aún"
              }
              accent="green"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              }
            />
            <StatCard
              label="Deploys fallidos"
              value={deploysFailed}
              sub="incluye conflictos"
              accent={deploysFailed > 0 ? "red" : "default"}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              }
            />
            <StatCard
              label="En ejecución"
              value={deploysRunning}
              sub="queued o running"
              accent={deploysRunning > 0 ? "blue" : "default"}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                </svg>
              }
            />
          </div>

          {/* Tasa de éxito — barra visual */}
          {successRate !== null && (
            <div className="card">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">Tasa de éxito global</span>
                <span className="font-semibold text-white">{successRate}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-dark-border">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-700"
                  style={{ width: `${successRate}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {deploysSuccess} de {totalDeploys} deploys completados con éxito
              </p>
            </div>
          )}

          {/* Dos columnas: deploys recientes + proyectos recientes */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Deploys recientes */}
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Deploys recientes
                </h2>
                <Link
                  to="/history"
                  className="text-xs text-primary-400 hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              {recentDeploys.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Sin deploys todavía
                </p>
              ) : (
                recentDeploys.map((job) => (
                  <RecentDeployRow key={job.job_id} job={job} />
                ))
              )}
            </div>

            {/* Proyectos recientes */}
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Proyectos recientes
                </h2>
                <Link
                  to="/projects"
                  className="text-xs text-primary-400 hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              {recentProjects.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Sin proyectos todavía
                </p>
              ) : (
                recentProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex cursor-pointer items-center justify-between gap-3 border-b border-dark-border py-2.5 last:border-0 hover:text-primary-400 transition-colors"
                    onClick={() => navigate(`/projects/${p.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && navigate(`/projects/${p.id}`)
                    }
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.repo_count ?? 0} repos ·{" "}
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString("es-ES")
                          : "—"}
                      </p>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 flex-shrink-0 text-slate-600"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                    </svg>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createProject}
      />
    </section>
  );
}

export default DashboardPage;
