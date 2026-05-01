/**
 * useProjectTour
 *
 * Provides a Driver.js guided tour for the Project Detail page.
 * The tour is shown automatically the first time a user visits the page
 * (tracked via localStorage) and can be re-triggered with `startTour()`.
 */
import { useEffect } from "react";
import { driver } from "driver.js";

const STORAGE_KEY = "project_tour_seen";

const STEPS = [
  {
    element: "#tour-project-header",
    popover: {
      title: "Detalle del proyecto",
      description:
        "Aquí ves el nombre y descripción del proyecto. Usa el botón <strong>+ Añadir repo</strong> para añadir repositorios y <strong>Desplegar ahora</strong> para lanzar un despliegue.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-repo-table",
    popover: {
      title: "Repositorios",
      description:
        "Cada fila es un repositorio Git. El orden determina la secuencia de despliegue. La columna <strong>Sincronización</strong> muestra si <em>main</em> y <em>production</em> están al día.",
      side: "top" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-diff-section",
    popover: {
      title: "Cambios pendientes",
      description:
        "Pulsa <strong>Ver cambios</strong> para comparar las ramas <em>main</em> y <em>production</em> de cada repo. Verás exactamente qué commits se desplegarán.",
      side: "top" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-cron-section",
    popover: {
      title: "Despliegue programado",
      description:
        "Activa el interruptor para configurar despliegues automáticos periódicos. Elige una frecuencia predefinida o escribe tu propia expresión cron.",
      side: "top" as const,
      align: "start" as const,
    },
  },
];

export function useProjectTour() {
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0,0,0,0.6)",
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: "driverjs-dark-theme",
      nextBtnText: "Siguiente →",
      prevBtnText: "← Anterior",
      doneBtnText: "Entendido",
      onDestroyStarted: () => {
        localStorage.setItem(STORAGE_KEY, "1");
        driverObj.destroy();
      },
      steps: STEPS,
    });
    driverObj.drive();
  };

  // Auto-start on first visit
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Small delay so the page finishes rendering
    const t = setTimeout(startTour, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { startTour };
}
