import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import Spinner from "../components/common/Spinner";

// Lazy loading de páginas
const LoginPage = lazy(() => import("../pages/LoginPage"));
const AuthCallbackPage = lazy(() => import("../pages/AuthCallbackPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const ProjectDetailPage = lazy(() => import("../pages/ProjectDetailPage"));
const HistoryPage = lazy(() => import("../pages/HistoryPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

/** Fallback de suspense global */
const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-dark-bg">
    <Spinner size="xl" />
  </div>
);

const router = createBrowserRouter([
  // Ruta raíz → redirige al dashboard
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  // Rutas públicas
  {
    path: "/login",
    element: (
      <Suspense fallback={<PageFallback />}>
        <LoginPage />
      </Suspense>
    ),
  },
  // Callback OAuth – el backend redirige aquí tras autenticar
  {
    path: "/oauth/callback",
    element: (
      <Suspense fallback={<PageFallback />}>
        <AuthCallbackPage />
      </Suspense>
    ),
  },
  // Rutas privadas (requieren sesión)
  {
    element: <PrivateRoute />,
    children: [
      {
        path: "/dashboard",
        element: (
          <Suspense fallback={<PageFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: "/projects/:id",
        element: (
          <Suspense fallback={<PageFallback />}>
            <ProjectDetailPage />
          </Suspense>
        ),
      },
      {
        path: "/history",
        element: (
          <Suspense fallback={<PageFallback />}>
            <HistoryPage />
          </Suspense>
        ),
      },
    ],
  },
  // 404
  {
    path: "*",
    element: (
      <Suspense fallback={<PageFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);

/**
 * Componente raíz del router.
 */
function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
