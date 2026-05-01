/**
 * @file useDeploy.js
 * @description Hook que gestiona el ciclo de vida de un despliegue:
 * trigger → polling → logs → estado final.
 */
import { useState, useCallback, useRef } from "react";
import type { DeployJob } from "../types";
import deployService from "../services/deployService";
import usePolling from "./usePolling";
import useToast from "./useToast";

import { getErrorMessage } from "../utils/errorHandler";
export const JOB_STATUS = {
  IDLE: "idle",
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
};

/**
 * @param {string} projectId
 * @returns {{
 *   deploy: () => Promise<void>,
 *   status: string,
 *   jobData: object|null,
 *   isDeploying: boolean,
 *   stopPolling: () => void,
 * }}
 */
function useDeploy(projectId) {
  const [status, setStatus] = useState(JOB_STATUS.IDLE);
  const [jobId, setJobId] = useState(null);
  const [jobData, setJobData] = useState(null);
  const { toastSuccess, toastError } = useToast();
  const stopRef = useRef(null);

  const isDeploying =
    status === JOB_STATUS.PENDING || status === JOB_STATUS.RUNNING;

  // Función pasada a usePolling – se memoriza para evitar re-renders
  const fetchJob = useCallback(() => {
    if (!jobId) return Promise.reject(new Error("No jobId"));
    return deployService.getJobStatus(jobId);
  }, [jobId]);

  const { stop } = usePolling(fetchJob, {
    enabled: isDeploying && Boolean(jobId),
    interval: 2000,
    onSuccess: (rawData) => {
      const data = rawData as DeployJob;
      setJobData(data);
      if (data.status === "success") {
        setStatus(JOB_STATUS.SUCCESS);
        toastSuccess("¡Despliegue completado con éxito!");
        stop();
      } else if (data.status === "failed") {
        setStatus(JOB_STATUS.FAILED);
        toastError("El despliegue falló. Revisa los logs.");
        stop();
      } else {
        setStatus(data.status);
      }
    },
    onError: (err) => {
      setStatus(JOB_STATUS.FAILED);
      toastError(getErrorMessage(err));
    },
  });

  // Guardar referencia a stop para poder usarla en deploy()
  stopRef.current = stop;

  /**
   * Inicia el despliegue.
   */
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

  const stopPolling = useCallback(() => {
    stopRef.current?.();
    setStatus(JOB_STATUS.IDLE);
    setJobId(null);
    setJobData(null);
  }, []);

  return { deploy, status, jobData, isDeploying, stopPolling };
}

export default useDeploy;
