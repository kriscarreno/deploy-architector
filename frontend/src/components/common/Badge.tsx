import clsx from "clsx";

const variantMap = {
  green: "badge-green",
  yellow: "badge-yellow",
  red: "badge-red",
  blue: "badge-blue",
  gray: "badge-gray",
};

type BadgeVariant = "green" | "yellow" | "red" | "blue" | "gray";

/** Mapa de estado de job → color */
export const statusVariant: Record<string, BadgeVariant> = {
  success: "green",
  running: "blue",
  pending: "yellow",
  failed: "red",
  idle: "gray",
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

/**
 * Badge de estado o etiqueta genérica.
 */
function Badge({ label, variant = "gray", className }: BadgeProps) {
  return <span className={clsx(variantMap[variant], className)}>{label}</span>;
}

export default Badge;
