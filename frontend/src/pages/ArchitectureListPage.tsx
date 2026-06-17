/**
 * @file ArchitectureListPage.tsx
 * @description Lista de diagramas de arquitectura. Permite crear uno nuevo
 * (opcionalmente asignado a un equipo), importar desde JSON y abrir el editor.
 */
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useDiagrams from "../hooks/useDiagrams";
import useTeams from "../hooks/useTeams";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import Spinner from "../components/common/Spinner";
import useToast from "../hooks/useToast";

function ArchitectureListPage() {
  const navigate = useNavigate();
  const { diagrams, loading, createDiagram, deleteDiagram, importDiagram } =
    useDiagrams();
  const { teams } = useTeams();
  const { toastError } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const teamName = (tid: number | null) =>
    tid ? teams.find((t) => t.id === tid)?.name ?? "Equipo" : null;

  const submitCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const d = await createDiagram({
        name: name.trim(),
        description: description.trim() || null,
        teamId: teamId === "" ? null : Number(teamId),
      });
      setModalOpen(false);
      setName("");
      setDescription("");
      setTeamId("");
      navigate(`/architecture/${d.id}`);
    } catch {
      /* toast handled in hook */
    } finally {
      setCreating(false);
    }
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const d = await importDiagram(json);
      navigate(`/architecture/${d.id}`);
    } catch (err) {
      toastError(
        err instanceof SyntaxError
          ? "El archivo no es un JSON válido"
          : "No se pudo importar el diagrama",
      );
    }
  };

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Arquitectura</h1>
          <p className="mt-1 text-sm text-slate-400">
            Diagramas 3D de tus proyectos y servicios externos
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportFile}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Importar JSON
          </Button>
          <Button onClick={() => setModalOpen(true)}>+ Nuevo diagrama</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="xl" />
        </div>
      ) : diagrams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-dark-border py-20 text-center">
          <p className="mb-4 text-slate-400">No tienes diagramas todavía.</p>
          <Button onClick={() => setModalOpen(true)}>
            Crear mi primer diagrama
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {diagrams.map((d) => (
            <article
              key={d.id}
              className="card flex flex-col justify-between"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/architecture/${d.id}`)}
                onKeyDown={(e) =>
                  e.key === "Enter" && navigate(`/architecture/${d.id}`)
                }
                className="cursor-pointer"
              >
                <h2 className="text-base font-semibold text-white">{d.name}</h2>
                {d.description && (
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                    {d.description}
                  </p>
                )}
                {teamName(d.team_id) && (
                  <span className="mt-2 inline-block rounded bg-primary-600/20 px-2 py-0.5 text-xs text-primary-300">
                    {teamName(d.team_id)}
                  </span>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => deleteDiagram(d.id)}
                  className="text-xs text-slate-500 hover:text-red-400"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo diagrama"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitCreate}
              loading={creating}
              disabled={!name.trim()}
            >
              Crear
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="diagram-name"
            label="Nombre"
            required
            placeholder="Arquitectura prod"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="diagram-desc"
            label="Descripción"
            placeholder="Opcional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="w-full">
            <label htmlFor="diagram-team" className="form-label">
              Equipo (opcional)
            </label>
            <select
              id="diagram-team"
              className="form-input"
              value={teamId}
              onChange={(e) =>
                setTeamId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Solo yo</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default ArchitectureListPage;
