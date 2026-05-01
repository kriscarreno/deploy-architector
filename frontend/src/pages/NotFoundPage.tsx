import { Link } from "react-router-dom";

/**
 * Página 404 – ruta no encontrada.
 */
function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4 bg-dark-bg">
      <p className="text-8xl font-black text-primary-600">404</p>
      <h1 className="text-2xl font-bold text-white">Página no encontrada</h1>
      <p className="text-slate-400">
        La ruta que buscas no existe o fue movida.
      </p>
      <Link to="/dashboard" className="btn-secondary">
        Volver al dashboard
      </Link>
    </div>
  );
}

export default NotFoundPage;
