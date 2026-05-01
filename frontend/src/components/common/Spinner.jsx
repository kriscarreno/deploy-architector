import clsx from "clsx";
import PropTypes from "prop-types";

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-7 w-7 border-2",
  lg: "h-12 w-12 border-4",
  xl: "h-16 w-16 border-4",
};

/**
 * Spinner de carga animado.
 */
function Spinner({ size = "md", className }) {
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

Spinner.propTypes = {
  size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
  className: PropTypes.string,
};

export default Spinner;
