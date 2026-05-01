import clsx from "clsx";
import PropTypes from "prop-types";

const variantMap = {
  green: "badge-green",
  yellow: "badge-yellow",
  red: "badge-red",
  blue: "badge-blue",
  gray: "badge-gray",
};

/** Mapa de estado de job → color */
export const statusVariant = {
  success: "green",
  running: "blue",
  pending: "yellow",
  failed: "red",
  idle: "gray",
};

/**
 * Badge de estado o etiqueta genérica.
 */
function Badge({ label, variant = "gray", className }) {
  return <span className={clsx(variantMap[variant], className)}>{label}</span>;
}

Badge.propTypes = {
  label: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(["green", "yellow", "red", "blue", "gray"]),
  className: PropTypes.string,
};

export default Badge;
