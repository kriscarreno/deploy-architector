/**
 * @file useHealthSummary.js
 * @description Carga el resumen de estado de healthchecks por proyecto y lo
 * expone como un mapa { projectId: status } (solo proyectos con healthchecks).
 */
import { useEffect, useState } from "react";
import statusService from "../services/statusService";
import type { HealthStatus } from "../types";

function useHealthSummary(): Record<number, HealthStatus> {
  const [map, setMap] = useState<Record<number, HealthStatus>>({});

  useEffect(() => {
    let cancelled = false;
    statusService
      .getSummary()
      .then((rows) => {
        if (cancelled) return;
        const next: Record<number, HealthStatus> = {};
        for (const r of rows) {
          if (r.total > 0) next[r.projectId] = r.status;
        }
        setMap(next);
      })
      .catch(() => {
        /* silent — status dots are non-critical */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}

export default useHealthSummary;
