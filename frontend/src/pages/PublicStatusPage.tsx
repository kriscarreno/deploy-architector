/**
 * @file PublicStatusPage.tsx
 * @description Página de estado PÚBLICA (sin login). Muestra, por proyecto,
 * todos los healthchecks configurados como públicos con su estado up/down,
 * latencia y código HTTP. Se refresca por polling.
 */
import usePolling from "../hooks/usePolling";
import statusService from "../services/statusService";
import type { PublicStatusProject, HealthStatus } from "../types";

const DOT: Record<HealthStatus, string> = {
  up: "bg-green-500",
  down: "bg-red-500",
  unknown: "bg-slate-500",
};

function relTime(iso: string | null): string {
  if (!iso) return "sin comprobar";
  const d = new Date(iso.includes("Z") ? iso : iso + "Z");
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (Number.isNaN(secs)) return "";
  if (secs < 60) return `hace ${secs}s`;
  if (secs < 3600) return `hace ${Math.floor(secs / 60)}m`;
  return `hace ${Math.floor(secs / 3600)}h`;
}

function PublicStatusPage() {
  const { data, loading } = usePolling(() => statusService.getPublicStatus(), {
    interval: 20_000,
  });
  const projects = (data as PublicStatusProject[] | null) ?? [];

  const allChecks = projects.flatMap((p) => p.checks);
  const anyDown = allChecks.some((c) => c.status === "down");
  const anyChecks = allChecks.length > 0;

  return (
    <div className="min-h-screen bg-dark-bg px-4 py-10 text-slate-200">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white">Estado del servicio</h1>
          <p className="mt-1 text-sm text-slate-400">
            Estado en tiempo real de los servicios monitorizados
          </p>
        </header>

        {/* Banner global */}
        {anyChecks && (
          <div
            className={`mb-8 flex items-center gap-3 rounded-xl border p-4 ${
              anyDown
                ? "border-red-500/40 bg-red-500/10"
                : "border-green-500/40 bg-green-500/10"
            }`}
          >
            <span
              className={`h-3 w-3 rounded-full ${anyDown ? "bg-red-500" : "bg-green-500"}`}
            />
            <span className="font-medium text-white">
              {anyDown
                ? "Incidencias detectadas en algunos servicios"
                : "Todos los sistemas operativos"}
            </span>
          </div>
        )}

        {loading && projects.length === 0 ? (
          <p className="text-slate-500">Cargando estado…</p>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-dark-border py-16 text-center text-slate-500">
            No hay servicios públicos configurados todavía.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {projects.map((p) => (
              <section
                key={p.projectId}
                className="rounded-xl border border-dark-border bg-dark-surface"
              >
                <h2 className="border-b border-dark-border px-5 py-3 text-base font-semibold text-white">
                  {p.projectName}
                </h2>
                <ul className="divide-y divide-dark-border">
                  {p.checks.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${DOT[c.status] ?? DOT.unknown}`}
                        />
                        <span className="text-sm text-slate-200">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {c.latencyMs != null && c.status === "up" && (
                          <span>{c.latencyMs} ms</span>
                        )}
                        {c.statusCode != null && (
                          <span>HTTP {c.statusCode}</span>
                        )}
                        <span
                          className={
                            c.status === "up"
                              ? "text-green-400"
                              : c.status === "down"
                                ? "text-red-400"
                                : "text-slate-500"
                          }
                        >
                          {c.status === "up"
                            ? "Operativo"
                            : c.status === "down"
                              ? "Caído"
                              : "—"}
                        </span>
                        <span>{relTime(c.lastCheckedAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <footer className="mt-10 text-center text-xs text-slate-600">
          Se actualiza automáticamente cada 20 s.
        </footer>
      </div>
    </div>
  );
}

export default PublicStatusPage;
