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
    to: "/projects",
    label: "Proyectos",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
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
