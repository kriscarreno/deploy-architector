/**
 * @file useToast.js
 * @description Wrapper sobre react-hot-toast para toasts consistentes.
 */
import toast from "react-hot-toast";

/**
 * @returns {{
 *   toastSuccess: (msg: string) => void,
 *   toastError:   (msg: string) => void,
 *   toastInfo:    (msg: string) => void,
 *   toastLoading: (msg: string) => string,
 *   toastDismiss: (id?: string) => void,
 * }}
 */
function useToast() {
  const toastSuccess = (msg) => toast.success(msg, { duration: 4000 });

  const toastError = (msg) => toast.error(msg, { duration: 6000 });

  const toastInfo = (msg) => toast(msg, { icon: "ℹ️", duration: 4000 });

  const toastLoading = (msg) => toast.loading(msg);

  const toastDismiss = (id) => (id ? toast.dismiss(id) : toast.dismiss());

  return { toastSuccess, toastError, toastInfo, toastLoading, toastDismiss };
}

export default useToast;
