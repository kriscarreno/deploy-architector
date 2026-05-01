import { forwardRef } from "react";
import clsx from "clsx";
import Spinner from "./Spinner";

const variants = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-dark-surface transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "",
  lg: "px-6 py-3 text-base",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  className?: string;
}

/**
 * Botón reutilizable con variantes, tamaños y estado de carga.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    className,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={clsx(variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
