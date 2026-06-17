/**
 * @file TeamsPage.tsx
 * @description Gestión de equipos: crear, invitar miembros por username de
 * GitHub, cambiar de quién depende el acceso a los diagramas compartidos.
 */
import { useEffect, useState } from "react";
import useTeams from "../hooks/useTeams";
import teamService from "../services/teamService";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Spinner from "../components/common/Spinner";
import useToast from "../hooks/useToast";
import { getErrorMessage } from "../utils/errorHandler";
import type { Team, TeamMember } from "../types";

function TeamsPage() {
  const { teams, loading, createTeam, deleteTeam, addMember, removeMember } =
    useTeams();
  const { toastError } = useToast();

  const [newTeam, setNewTeam] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Team | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);

  // Auto-select first team
  useEffect(() => {
    if (selectedId == null && teams.length > 0) setSelectedId(teams[0].id);
  }, [teams, selectedId]);

  // Load selected team detail (members)
  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    teamService
      .getById(selectedId)
      .then((t) => !cancelled && setDetail(t))
      .catch((err) => !cancelled && toastError(getErrorMessage(err)))
      .finally(() => !cancelled && setDetailLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedId, toastError]);

  const handleCreate = async () => {
    if (!newTeam.trim()) return;
    setCreating(true);
    try {
      const t = await createTeam(newTeam.trim());
      setNewTeam("");
      setSelectedId(t.id);
    } catch {
      /* handled */
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async () => {
    if (!username.trim() || selectedId == null) return;
    setAdding(true);
    try {
      const members = await addMember(selectedId, username.trim(), "member");
      setDetail((prev) => (prev ? { ...prev, members } : prev));
      setUsername("");
    } catch {
      /* handled */
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (selectedId == null) return;
    await removeMember(selectedId, member.id);
    setDetail((prev) =>
      prev
        ? { ...prev, members: prev.members?.filter((m) => m.id !== member.id) }
        : prev,
    );
  };

  const handleDeleteTeam = async (team: Team) => {
    await deleteTeam(team.id);
    if (selectedId === team.id) setSelectedId(null);
  };

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Equipos</h1>
        <p className="mt-1 text-sm text-slate-400">
          Comparte diagramas de arquitectura con tu equipo
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        {/* Lista de equipos */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              id="new-team"
              placeholder="Nombre del equipo"
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} loading={creating} disabled={!newTeam.trim()}>
              Crear
            </Button>
          </div>

          {loading ? (
            <Spinner />
          ) : teams.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no tienes equipos.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {teams.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === t.id
                        ? "bg-primary-600/20 text-primary-300"
                        : "text-slate-300 hover:bg-dark-surface"
                    }`}
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detalle del equipo */}
        <div className="rounded-xl border border-dark-border bg-dark-surface p-5">
          {detailLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : !detail ? (
            <p className="text-slate-500">Selecciona un equipo para gestionarlo.</p>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {detail.name}
                </h2>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteTeam(detail)}
                >
                  Eliminar equipo
                </Button>
              </div>

              {/* Añadir miembro */}
              <div className="mb-5 flex gap-2">
                <Input
                  id="add-member"
                  placeholder="Username de GitHub"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                  hint="El usuario debe haber iniciado sesión al menos una vez."
                />
                <Button
                  onClick={handleAddMember}
                  loading={adding}
                  disabled={!username.trim()}
                >
                  Invitar
                </Button>
              </div>

              {/* Miembros */}
              <ul className="flex flex-col divide-y divide-dark-border">
                {detail.members?.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      {m.avatar_url && (
                        <img
                          src={m.avatar_url}
                          alt=""
                          className="h-7 w-7 rounded-full"
                        />
                      )}
                      <span className="text-sm text-white">{m.username}</span>
                      <span className="text-xs text-slate-500">{m.role}</span>
                    </div>
                    {m.role !== "owner" && (
                      <button
                        onClick={() => handleRemoveMember(m)}
                        className="text-xs text-slate-500 hover:text-red-400"
                      >
                        Quitar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default TeamsPage;
