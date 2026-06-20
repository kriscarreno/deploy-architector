import { useState, useEffect, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import useProjects from "../hooks/useProjects";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import Spinner from "../components/common/Spinner";
import { projectNameRules } from "../utils/validators";
import type { Project } from "../types";

interface CreateProjectForm {
  name: string;
  description?: string;
}

// ── Tarjeta de proyecto ───────────────────────────────────────────────────
const ProjectCard = memo(function ProjectCard({
  project,
  onClick,
  onEdit,
  onDelete,
}: {
  project: Project;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="card cursor-pointer transition-all hover:border-primary-600 hover:shadow-primary-900/20 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary-500"
      aria-label={`Abrir proyecto ${project.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-white">
            {project.name}
          </h2>
          {project.description && (
            <p className="mt-1 text-sm text-slate-400 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        {/* Action buttons — stop propagation so card click doesn't trigger */}
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            title="Editar proyecto"
            className="rounded p-1.5 text-slate-500 transition-colors hover:bg-dark-border hover:text-white"
            aria-label="Editar proyecto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Eliminar proyecto"
            className="rounded p-1.5 text-slate-500 transition-colors hover:bg-red-900/40 hover:text-red-400"
            aria-label="Eliminar proyecto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
          </svg>
          {project.repo_count ?? project.repos?.length ?? 0} repos
        </span>
        {project.created_at && (
          <span>
            Creado {new Date(project.created_at).toLocaleDateString("es-ES")}
          </span>
        )}
      </div>

      {/* Acciones rápidas — no propagar para no abrir el detalle dos veces */}
      <div
        className="mt-3 flex flex-wrap gap-1.5 border-t border-dark-border pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        {[
          { to: `/projects/${project.id}`, label: "Detalle" },
          { to: `/projects/${project.id}/status`, label: "Estado" },
          { to: `/projects/${project.id}/healthchecks`, label: "Healthchecks" },
        ].map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="rounded-md bg-dark-bg px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-dark-border hover:text-white"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </article>
  );
});

// ── Modal editar proyecto ─────────────────────────────────────────────────
function EditProjectModal({
  isOpen,
  onClose,
  onSubmit,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectForm) => Promise<unknown>;
  project: Project | null;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectForm>();

  useEffect(() => {
    if (isOpen && project) {
      reset({ name: project.name, description: project.description ?? "" });
    }
  }, [isOpen, project, reset]);

  const submit = async (data: CreateProjectForm) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar proyecto"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-project-form" loading={isSubmitting}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form
        id="edit-project-form"
        onSubmit={handleSubmit(submit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          id="edit-project-name"
          label="Nombre"
          required
          placeholder="mi-proyecto"
          error={errors.name?.message as string | undefined}
          {...register("name", projectNameRules)}
        />
        <Input
          id="edit-project-description"
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

// ── Modal confirmar eliminación ───────────────────────────────────────────
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  project: Project | null;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Eliminar proyecto"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={loading}>
            Eliminar
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-300">
        ¿Estás seguro de que quieres eliminar el proyecto{" "}
        <span className="font-semibold text-white">{project?.name}</span>? Esta
        acción no se puede deshacer.
      </p>
    </Modal>
  );
}

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

// ── Projects Page ─────────────────────────────────────────────────────────
function ProjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject: doDelete,
  } = useProjects();
  const navigate = useNavigate();

  const handleEdit = async (data: CreateProjectForm) => {
    if (!editProject) return;
    await updateProject(String(editProject.id), data);
  };

  const handleDelete = async () => {
    if (!deleteProject) return;
    await doDelete(String(deleteProject.id));
  };

  const filtered = search.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : projects;

  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Proyectos</h1>
          <p className="mt-1 text-sm text-slate-400">
            {projects.length} proyecto{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          aria-label="Crear nuevo proyecto"
        >
          + Nuevo proyecto
        </Button>
      </div>

      {/* Buscador */}
      {projects.length > 0 && (
        <div className="mb-5">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proyecto…"
            className="w-full max-w-xs rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-dark-border py-20 text-center">
          {search ? (
            <p className="text-slate-400">
              Sin resultados para &ldquo;{search}&rdquo;
            </p>
          ) : (
            <>
              <p className="mb-4 text-slate-400">
                No tienes proyectos todavía.
              </p>
              <Button onClick={() => setModalOpen(true)}>
                Crear mi primer proyecto
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(`/projects/${p.id}`)}
              onEdit={(e) => {
                e.stopPropagation();
                setEditProject(p);
              }}
              onDelete={(e) => {
                e.stopPropagation();
                setDeleteProject(p);
              }}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createProject}
      />
      <EditProjectModal
        isOpen={Boolean(editProject)}
        onClose={() => setEditProject(null)}
        onSubmit={handleEdit}
        project={editProject}
      />
      <DeleteConfirmModal
        isOpen={Boolean(deleteProject)}
        onClose={() => setDeleteProject(null)}
        onConfirm={handleDelete}
        project={deleteProject}
      />
    </section>
  );
}

export default ProjectsPage;
