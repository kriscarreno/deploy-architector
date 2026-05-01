import clsx from "clsx";

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-7 w-7 border-2",
  lg: "h-12 w-12 border-4",
  xl: "h-16 w-16 border-4",
};

interface SpinnerProps {
  size?: keyof typeof sizeMap;
  className?: string;
}

/**
 * Spinner de carga animado.
 */
function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando…"
      className={clsx(
        "inline-block rounded-full border-slate-600 border-t-primary-500 animate-spin",
        sizeMap[size],
        className,
      )}
    />
  );
}

export default Spinner;
