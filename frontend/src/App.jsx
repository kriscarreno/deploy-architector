import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import AppRouter from "./routes";
import useAuthStore from "./store/authStore";

/**
 * Componente raíz de la aplicación.
 * Verifica la sesión al montar y renderiza el router.
 */
function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  // Verificar sesión activa al iniciar la app
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#f1f5f9",
            border: "1px solid #334155",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
          },
          success: {
            iconTheme: { primary: "#22c55e", secondary: "#1e293b" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#1e293b" },
          },
        }}
      />
    </>
  );
}

export default App;
