import useAuth from "../hooks/useAuth";
import Button from "../components/common/Button";

/**
 * Página de login.
 * Muestra el botón "Continuar con GitHub" que redirige al backend OAuth.
 */
function LoginPage() {
  const { loginWithGitHub, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dark-bg px-4">
      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-dark-border bg-dark-surface p-8 shadow-2xl">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-primary-500"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M13 2.05V4.1c3.95.49 7 3.85 7 7.9s-3.05 7.41-7 7.9v2.05c5.05-.5 9-4.76 9-9.95S18.05 2.55 13 2.05zM11 2.05C5.95 2.55 2 6.81 2 12s3.95 9.45 9 9.95V19.9C6.05 19.41 4 16.05 4 12S6.05 4.59 11 4.1V2.05zM12 6l-5 6h4v6l5-6h-4z" />
          </svg>
          <h1 className="text-2xl font-bold text-white">Deploy Orchestrator</h1>
          <p className="text-sm text-slate-400">
            Gestiona y despliega tus proyectos con un solo clic
          </p>
        </div>

        {/* Botón GitHub */}
        <Button
          variant="secondary"
          className="w-full gap-3 justify-center py-3"
          onClick={loginWithGitHub}
          loading={loading}
          aria-label="Iniciar sesión con GitHub"
        >
          {/* GitHub icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continuar con GitHub
        </Button>

        <p className="mt-6 text-center text-xs text-slate-500">
          Al iniciar sesión aceptas las condiciones de uso del servicio.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
