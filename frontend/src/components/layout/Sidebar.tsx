import { memo } from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const NAV_LINKS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    ),
  },
  {
    to: "/architecture",
    label: "Arquitectura",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l9 5v10l-9 5-9-5V7l9-5zm0 2.18L5 8v8l7 3.82L19 16V8l-7-3.82zM12 8a2 2 0 110 4 2 2 0 010-4z" />
      </svg>
    ),
  },
  {
    to: "/teams",
    label: "Equipos",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
  },
  {
    to: "/history",
    label: "Historial",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M13 3a9 9 0 100 18A9 9 0 0013 3zm0 16a7 7 0 110-14 7 7 0 010 14zm.5-11H12v6l5.25 3.15.75-1.23-4.5-2.67V8z" />
      </svg>
    ),
  },
];

/**
 * Sidebar de navegación lateral.
 */
const Sidebar = memo(function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay en mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <nav
        role="navigation"
        aria-label="Navegación principal"
        className={clsx(
          "fixed left-0 top-14 z-20 h-[calc(100vh-3.5rem)] w-56 flex-shrink-0 border-r border-dark-border bg-dark-surface",
          "transform transition-transform duration-200",
          "md:translate-x-0 md:static md:h-auto md:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <ul className="flex flex-col gap-1 p-3">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-600/20 text-primary-400"
                      : "text-slate-400 hover:bg-dark-bg hover:text-white",
                  )
                }
              >
                {link.icon}
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
});

export default Sidebar;
