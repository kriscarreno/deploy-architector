/**
 * @file useDeploy.ts
 * @description Hook que gestiona el ciclo de vida de un despliegue.
 * Usa Server-Sent Events (SSE) para recibir logs en tiempo real sin polling.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import deployService from "../services/deployService";
import useToast from "./useToast";
import { getErrorMessage } from "../utils/errorHandler";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const JOB_STATUS = {
  IDLE: "idle",
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
};

function useDeploy(projectId) {
  const [status, setStatus] = useState(JOB_STATUS.IDLE);
  const [jobId, setJobId] = useState<string | null>(null);
  const [streamLines, setStreamLines] = useState<string[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const { toastSuccess, toastError } = useToast();

  const isDeploying =
    status === JOB_STATUS.PENDING || status === JOB_STATUS.RUNNING;

  /**
   * Abre una conexión SSE en cuanto hay jobId.
   * El servidor hace stream de cada línea de log y cierra con un evento
   * `done` cuando el deploy termina.
   */
  useEffect(() => {
    if (!jobId) return;

    setStreamLines([]);

    const es = new EventSource(`${API_URL}/api/jobs/${jobId}/stream`, {
      withCredentials: true,
    });
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type: string;
          line?: string;
          status?: string;
        };
        if (payload.type === "log" && payload.line) {
          setStreamLines((prev) => [...prev, payload.line!]);
        } else if (payload.type === "done") {
          if (payload.status === "success") {
            setStatus(JOB_STATUS.SUCCESS);
            toastSuccess("¡Despliegue completado con éxito!");
          } else {
            setStatus(JOB_STATUS.FAILED);
            toastError("El despliegue falló. Revisa los logs.");
          }
          es.close();
          esRef.current = null;
        }
      } catch (_) {}
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [jobId, toastSuccess, toastError]);

  /** Lanza el despliegue. El SSE se abre automáticamente al recibir el jobId. */
  const deploy = useCallback(async () => {
    if (isDeploying) return;
    setStatus(JOB_STATUS.PENDING);
    setStreamLines([]);
    try {
      const { jobId: id } = await deployService.trigger(projectId);
      setJobId(id);
      setStatus(JOB_STATUS.RUNNING);
    } catch (err) {
      setStatus(JOB_STATUS.FAILED);
      toastError(getErrorMessage(err));
    }
  }, [projectId, isDeploying, toastError]);

  /** Cierra la conexión SSE y resetea el estado. */
  const reset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setStatus(JOB_STATUS.IDLE);
    setJobId(null);
    setStreamLines([]);
  }, []);

  return { deploy, status, streamLines, isDeploying, reset };
}

export default useDeploy;
