import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import useProjectStore from "../store/projectStore";
import useDeploy, { JOB_STATUS } from "../hooks/useDeploy";
import useToast from "../hooks/useToast";
import { getErrorMessage } from "../utils/errorHandler";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import Table from "../components/common/Table";
import Spinner from "../components/common/Spinner";
import Badge, { statusVariant } from "../components/common/Badge";
import { branchRules, orderRules } from "../utils/validators";
import projectService from "../services/projectService";

// Shared repo form fields
function RepoFormFields({ register, errors }) {
  return (
    <>
      <Input
        id="git-url"
        label="URL del repositorio (git)"
        required
        placeholder="https://github.com/org/repo.git"
        error={errors.git_url?.message}
        {...register("git_url", {
          required: "La URL es obligatoria",
          pattern: {
            value: /^https?:\/\/.+/,
            message: "Debe ser una URL válida",
          },
        })}
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
    </>
  );
}

// Modal: añadir repositorio
function AddRepoModal({ isOpen, onClose, onSubmit }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      main_branch: "main",
      production_branch: "production",
      order: 1,
    },
  });

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
        <RepoFormFields register={register} errors={errors} />
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
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    if (repo) {
      reset({
        git_url: repo.github_url,
        main_branch: repo.main_branch,
        production_branch: repo.prod_branch,
        order: repo.order_index,
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
        <RepoFormFields register={register} errors={errors} />
      </form>
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

// Project Detail Page
function ProjectDetailPage() {
  const { id } = useParams();
  const [addRepoOpen, setAddRepoOpen] = useState(false);
  const [editRepo, setEditRepo] = useState(null);
  const { toastSuccess, toastError } = useToast();
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

  const checkDiff = async () => {
    setDiffLoading(true);
    setDiffs(null);
    try {
      const result = await projectService.getDiff(id);
      setDiffs(result);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setDiffLoading(false);
    }
  };

  useEffect(() => {
    fetchProject(id);
    return clearSelectedProject;
  }, [id, fetchProject, clearSelectedProject]);

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
      key: "actions",
      label: "",
      width: "88px",
      render: (_, row) => (
        <div className="flex items-center gap-1">
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

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-slate-400">{project.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setAddRepoOpen(true)}>
            + Añadir repo
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

      <div className="card">
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
      <div className="mt-6 card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Cambios pendientes
          </h2>
          <Button
            variant="ghost"
            onClick={checkDiff}
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

      <AddRepoModal
        isOpen={addRepoOpen}
        onClose={() => setAddRepoOpen(false)}
        onSubmit={handleAddRepo}
      />
      <EditRepoModal
        isOpen={Boolean(editRepo)}
        onClose={() => setEditRepo(null)}
        onSubmit={handleEditRepo}
        repo={editRepo}
      />
    </section>
  );
}

export default ProjectDetailPage;
