/**
 * @file usePolling.js
 * @description Hook genérico para hacer polling a una función async.
 * @example
 *   const { data, stop } = usePolling(() => deployService.getJobStatus(jobId), {
 *     interval: 2000,
 *     enabled: isDeploying,
 *     onSuccess: (data) => { if (data.status === 'success') stop() },
 *   })
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface UsePollingOptions {
  interval?: number;
  enabled?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (err: unknown) => void;
}

function usePolling(
  fn: () => Promise<unknown>,
  {
    interval = 2000,
    enabled = true,
    onSuccess,
    onError,
  }: UsePollingOptions = {},
) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const result = await fn();
      if (!mountedRef.current) return;
      setData(result);
      setError(null);
      onSuccess?.(result);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err);
      onError?.(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fn, onSuccess, onError]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }

    // Ejecutar inmediatamente, luego cada `interval` ms
    poll();
    timerRef.current = setInterval(poll, interval);

    return stop;
  }, [enabled, interval, poll, stop]);

  return { data, error, loading, stop };
}

export default usePolling;
