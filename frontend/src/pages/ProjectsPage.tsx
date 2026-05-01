import { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
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
}: {
  project: Project;
  onClick: () => void;
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
      <div className="flex items-start justify-between">
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="ml-3 h-5 w-5 flex-shrink-0 text-slate-600"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
        </svg>
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
    </article>
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

// ── Projects Page ─────────────────────────────────────────────────────────
function ProjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { projects, loading, createProject } = useProjects();
  const navigate = useNavigate();

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
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createProject}
      />
    </section>
  );
}

export default ProjectsPage;
