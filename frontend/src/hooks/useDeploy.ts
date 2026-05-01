/**
 * @file useDeploy.ts
 * @description Hook que gestiona el ciclo de vida de un despliegue.
 * Sin polling automático: el estado se actualiza manualmente con checkStatus().
 */
import { useState, useCallback } from "react";
import type { DeployJob } from "../types";
import deployService from "../services/deployService";
import useToast from "./useToast";
import { getErrorMessage } from "../utils/errorHandler";

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
  const [jobData, setJobData] = useState<DeployJob | null>(null);
  const [checking, setChecking] = useState(false);
  const { toastSuccess, toastError } = useToast();

  const isDeploying =
    status === JOB_STATUS.PENDING || status === JOB_STATUS.RUNNING;

  /** Lanza el despliegue y guarda el jobId resultante. */
  const deploy = useCallback(async () => {
    if (isDeploying) return;
    setStatus(JOB_STATUS.PENDING);
    setJobData(null);
    try {
      const { jobId: id } = await deployService.trigger(projectId);
      setJobId(id);
      setStatus(JOB_STATUS.RUNNING);
    } catch (err) {
      setStatus(JOB_STATUS.FAILED);
      toastError(getErrorMessage(err));
    }
  }, [projectId, isDeploying, toastError]);

  /** Consulta el estado del job una sola vez (acción manual). */
  const checkStatus = useCallback(async () => {
    if (!jobId || checking) return;
    setChecking(true);
    try {
      const data = (await deployService.getJobStatus(jobId)) as DeployJob;
      setJobData(data);
      if (data.status === "success") {
        setStatus(JOB_STATUS.SUCCESS);
        toastSuccess("¡Despliegue completado con éxito!");
      } else if (data.status === "failed") {
        setStatus(JOB_STATUS.FAILED);
        toastError("El despliegue falló. Revisa los logs.");
      } else {
        setStatus(data.status);
      }
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }, [jobId, checking, toastSuccess, toastError]);

  /** Descarta el panel de estado. */
  const reset = useCallback(() => {
    setStatus(JOB_STATUS.IDLE);
    setJobId(null);
    setJobData(null);
  }, []);

  return { deploy, status, jobData, isDeploying, checking, checkStatus, reset };
}

export default useDeploy;
