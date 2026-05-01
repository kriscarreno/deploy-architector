/**
 * @file useToast.ts
 * @description Wrapper sobre react-hot-toast para toasts consistentes.
 * Las funciones se memorizan con useCallback para que sean referencias
 * estables entre renders y no disparen efectos en bucle.
 */
import { useCallback } from "react";
import toast from "react-hot-toast";

function useToast() {
  const toastSuccess = useCallback(
    (msg: string) => toast.success(msg, { duration: 4000 }),
    [],
  );

  const toastError = useCallback(
    (msg: string) => toast.error(msg, { duration: 6000 }),
    [],
  );

  const toastInfo = useCallback(
    (msg: string) => toast(msg, { icon: "ℹ️", duration: 4000 }),
    [],
  );

  const toastLoading = useCallback((msg: string) => toast.loading(msg), []);

  const toastDismiss = useCallback(
    (id?: string) => (id ? toast.dismiss(id) : toast.dismiss()),
    [],
  );

  return { toastSuccess, toastError, toastInfo, toastLoading, toastDismiss };
}

export default useToast;
