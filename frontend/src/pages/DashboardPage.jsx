import { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import useProjects from "../hooks/useProjects";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import Spinner from "../components/common/Spinner";
import { projectNameRules } from "../utils/validators";

/** ── Tarjeta de proyecto ──────────────────────────────────────────────── */
const ProjectCard = memo(function ProjectCard({ project, onClick }) {
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
        <div>
          <h2 className="text-base font-semibold text-white">{project.name}</h2>
          {project.description && (
            <p className="mt-1 text-sm text-slate-400 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        {/* Ícono arrow */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 flex-shrink-0 text-slate-600"
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
          {project.repos?.length ?? 0} repos
        </span>
        {project.createdAt && (
          <span>
            Creado {new Date(project.createdAt).toLocaleDateString("es-ES")}
          </span>
        )}
      </div>
    </article>
  );
});

/** ── Modal crear proyecto ─────────────────────────────────────────────── */
function CreateProjectModal({ isOpen, onClose, onSubmit }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const submit = async (data) => {
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
          error={errors.name?.message}
          {...register("name", projectNameRules)}
        />
        <Input
          id="project-description"
          label="Descripción"
          placeholder="Descripción opcional"
          error={errors.description?.message}
          {...register("description", {
            maxLength: { value: 200, message: "Máximo 200 caracteres" },
          })}
        />
      </form>
    </Modal>
  );
}

/** ── Dashboard Page ──────────────────────────────────────────────────── */
function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { projects, loading, createProject } = useProjects();
  const navigate = useNavigate();

  return (
    <section>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
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

      {/* Grid de proyectos */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="xl" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-dark-border py-20 text-center">
          <p className="mb-4 text-slate-400">No tienes proyectos todavía.</p>
          <Button onClick={() => setModalOpen(true)}>
            Crear mi primer proyecto
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(`/projects/${p.id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createProject}
      />
    </section>
  );
}

export default DashboardPage;
