import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import Spinner from "../components/common/Spinner";

/**
 * Página de callback OAuth.
 * El backend redirige aquí tras autenticar con GitHub.
 * Llama a checkAuth() para hidratar el store con el usuario
 * y luego navega al dashboard.
 */
function AuthCallbackPage() {
  const navigate = useNavigate();
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth().then(() => {
      const { user } = useAuthStore.getState();
      if (user) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    });
  }, [checkAuth, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dark-bg">
      <Spinner size="xl" />
      <p className="text-sm text-slate-400">Autenticando con GitHub…</p>
    </div>
  );
}

export default AuthCallbackPage;
