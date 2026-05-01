import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import useAuth from "../../hooks/useAuth";
import Button from "../common/Button";

/**
 * Header principal de la aplicación.
 */
const Header = memo(function Header({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-dark-border bg-dark-surface/90 px-4 backdrop-blur-sm"
    >
      {/* Izquierda: logo + hamburger en mobile */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          aria-label="Abrir menú"
          className="rounded-lg p-2 text-slate-400 hover:bg-dark-bg md:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-sm font-bold text-white hover:text-primary-400 transition-colors"
        >
          {/* Ícono de cohete inline */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-primary-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M13 2.05V4.1c3.95.49 7 3.85 7 7.9s-3.05 7.41-7 7.9v2.05c5.05-.5 9-4.76 9-9.95S18.05 2.55 13 2.05zM11 2.05C5.95 2.55 2 6.81 2 12s3.95 9.45 9 9.95V19.9C6.05 19.41 4 16.05 4 12S6.05 4.59 11 4.1V2.05zM12 6l-5 6h4v6l5-6h-4z" />
          </svg>
          Deploy Orchestrator
        </Link>
      </div>

      {/* Derecha: avatar + logout */}
      {user && (
        <div className="flex items-center gap-3">
          <img
            src={user.avatar_url}
            alt={`Avatar de ${user.login}`}
            className="h-8 w-8 rounded-full border border-dark-border"
          />
          <span className="hidden text-sm text-slate-300 sm:block">
            {user.login}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Salir
          </Button>
        </div>
      )}
    </header>
  );
});

Header.propTypes = {
  onMenuToggle: PropTypes.func,
};

export default Header;
