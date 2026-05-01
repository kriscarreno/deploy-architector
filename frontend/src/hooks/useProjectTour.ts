import { useEffect } from "react";
import { driver } from "driver.js";

const STORAGE_KEY = "project_tour_seen";

const STEPS = [
  {
    element: "#tour-project-header",
    popover: {
      title: "Detalle del proyecto",
      description:
        "Aqui ves el nombre y descripcion del proyecto. Usa el boton <strong>+ Anadir repo</strong> para anadir repositorios y <strong>Desplegar ahora</strong> para lanzar un despliegue.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-repo-table",
    popover: {
      title: "Repositorios",
      description:
        "Cada fila es un repositorio Git. El orden determina la secuencia de despliegue. La columna <strong>Sincronizacion</strong> muestra si <em>main</em> y <em>production</em> estan al dia.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-diff-section",
    popover: {
      title: "Cambios pendientes",
      description:
        "Pulsa <strong>Ver cambios</strong> para comparar las ramas <em>main</em> y <em>production</em> de cada repo. Veras exactamente que commits se desplegaran.",
      side: "top" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-cron-section",
    popover: {
      title: "Despliegue programado",
      description:
        "Activa el interruptor para configurar despliegues automaticos periodicos. Elige una frecuencia predefinida o escribe tu propia expresion cron.",
      side: "top" as const,
      align: "start" as const,
    },
  },
];

export function useProjectTour() {
  const startTour = () => {
    const mainEl = document.getElementById("main-content");
    if (mainEl) mainEl.scrollTop = 0;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0,0,0,0.65)",
      stagePadding: 8,
      stageRadius: 10,
      popoverClass: "driverjs-dark-theme",
      nextBtnText: "Siguiente ->",
      prevBtnText: "<- Anterior",
      doneBtnText: "Entendido",
      smoothScroll: true,
      onHighlightStarted: (element) => {
        if (element && mainEl) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
      onDestroyStarted: () => {
        localStorage.setItem(STORAGE_KEY, "1");
        driverObj.destroy();
      },
      steps: STEPS,
    });
    driverObj.drive();
  };

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(startTour, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { startTour };
}
