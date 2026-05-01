import { useEffect, useState } from "react";
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
function DeployPanel({ status, jobData }) {
  if (status === JOB_STATUS.IDLE) return null;

  const logs = jobData?.logs ?? [];
  const progress = jobData?.progress ?? 0;

  return (
    <div className="mt-6 rounded-xl border border-dark-border bg-dark-bg p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">Estado del despliegue</h3>
        <Badge label={status} variant={statusVariant[status] ?? "gray"} />
      </div>

      <div
        className="mb-3 h-2 w-full overflow-hidden rounded-full bg-dark-border"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {jobData?.currentRepo && (
        <p className="mb-3 text-xs text-slate-400">
          Desplegando:{" "}
          <span className="font-mono text-primary-300">
            {jobData.currentRepo}
          </span>
        </p>
      )}

      {logs.length > 0 && (
        <div
          className="max-h-64 overflow-y-auto rounded-lg bg-black/60 p-3 font-mono text-xs text-green-300"
          aria-live="polite"
          aria-label="Logs del despliegue"
        >
          {logs.map((line, i) => (
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

  const { deploy, status, jobData, isDeploying } = useDeploy(id);

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

      <DeployPanel status={status} jobData={jobData} />

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
