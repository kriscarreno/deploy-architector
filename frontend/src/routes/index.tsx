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
const ProjectsPage = lazy(() => import("../pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("../pages/ProjectDetailPage"));
const HistoryPage = lazy(() => import("../pages/HistoryPage"));
const ArchitectureListPage = lazy(
  () => import("../pages/ArchitectureListPage"),
);
const ArchitectureGraphPage = lazy(
  () => import("../pages/ArchitectureGraphPage"),
);
const TeamsPage = lazy(() => import("../pages/TeamsPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const TransparencyPage = lazy(() => import("../pages/TransparencyPage"));
const StatusPage = lazy(() => import("../pages/StatusPage"));
const GlobalStatusPage = lazy(() => import("../pages/GlobalStatusPage"));
const HealthcheckConfigPage = lazy(
  () => import("../pages/HealthcheckConfigPage"),
);
const PublicStatusPage = lazy(() => import("../pages/PublicStatusPage"));

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
  // Página de estado PÚBLICA (sin sesión)
  {
    path: "/status/public",
    element: (
      <Suspense fallback={<PageFallback />}>
        <PublicStatusPage />
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
        path: "/projects",
        element: (
          <Suspense fallback={<PageFallback />}>
            <ProjectsPage />
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
        path: "/projects/:id/status",
        element: (
          <Suspense fallback={<PageFallback />}>
            <StatusPage />
          </Suspense>
        ),
      },
      {
        path: "/projects/:id/healthchecks",
        element: (
          <Suspense fallback={<PageFallback />}>
            <HealthcheckConfigPage />
          </Suspense>
        ),
      },
      {
        path: "/status",
        element: (
          <Suspense fallback={<PageFallback />}>
            <GlobalStatusPage />
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
      {
        path: "/transparency",
        element: (
          <Suspense fallback={<PageFallback />}>
            <TransparencyPage />
          </Suspense>
        ),
      },
      {
        path: "/architecture",
        element: (
          <Suspense fallback={<PageFallback />}>
            <ArchitectureListPage />
          </Suspense>
        ),
      },
      {
        path: "/architecture/:id",
        element: (
          <Suspense fallback={<PageFallback />}>
            <ArchitectureGraphPage />
          </Suspense>
        ),
      },
      {
        path: "/teams",
        element: (
          <Suspense fallback={<PageFallback />}>
            <TeamsPage />
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
