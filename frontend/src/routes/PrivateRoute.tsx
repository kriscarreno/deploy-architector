import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";
import MainLayout from "../components/layout/MainLayout";
import Spinner from "../components/common/Spinner";

/**
 * Ruta privada: redirige a /login si no hay sesión.
 * Muestra spinner mientras se hidrata el store desde sessionStorage.
 */
function PrivateRoute() {
  const { user, hydrated, loading } = useAuthStore();

  // Mientras verificamos la sesión inicial
  if (!hydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-bg">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

export default PrivateRoute;
