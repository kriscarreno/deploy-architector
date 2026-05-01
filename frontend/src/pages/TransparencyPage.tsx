/**
 * TransparencyPage.tsx
 *
 * Página informativa que explica con total transparencia qué datos accede
 * la aplicación, qué permisos solicita y exactamente qué hace con cada
 * repositorio durante un despliegue.
 */

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="card space-y-4">
    <h2 className="text-lg font-semibold text-white">{title}</h2>
    {children}
  </section>
);

const Item = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-dark-border text-primary-400">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-0.5 text-sm text-slate-400">{description}</p>
    </div>
  </div>
);

const StepBadge = ({ n }: { n: number }) => (
  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
    {n}
  </span>
);

export default function TransparencyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* ── Encabezado ───────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">
          Transparencia &amp; Permisos
        </h1>
        <p className="text-sm text-slate-400">
          Todo lo que esta aplicación accede y hace con tus repositorios,
          explicado sin tecnicismos.
        </p>
      </div>

      {/* ── Qué accede la app ─────────────────────────────────────────────── */}
      <Section title="¿Qué datos accede la aplicación?">
        <p className="text-sm text-slate-400">
          La app se conecta a tu cuenta de GitHub mediante OAuth. Al iniciar
          sesión, GitHub te muestra exactamente los permisos que se solicitan y
          puedes revocarlos en cualquier momento desde tu configuración de
          GitHub.
        </p>

        <div className="space-y-3 pt-1">
          <Item
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            }
            title="Perfil público de GitHub"
            description="Tu nombre, avatar y nombre de usuario para mostrarlos en la interfaz. No se comparte con terceros."
          />
          <Item
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z" />
              </svg>
            }
            title="Correo electrónico"
            description="El email primario de tu cuenta GitHub, usado únicamente para identificarte en el sistema."
          />
          <Item
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
              </svg>
            }
            title="Acceso de lectura y escritura a repositorios"
            description="Necesario para clonar el código fuente y hacer push de la rama production al desplegar. Sólo se accede a los repos que tú añadas explícitamente a un proyecto."
          />
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-800/50 bg-yellow-900/10 px-3 py-2.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          <p className="text-xs text-yellow-200/80">
            Tu token de acceso de GitHub se almacena cifrado en la base de datos
            y <strong>nunca se expone</strong> en la interfaz ni en los logs. Se
            usa exclusivamente para autenticar las operaciones git en el
            servidor.
          </p>
        </div>
      </Section>

      {/* ── Qué hace con los repos ────────────────────────────────────────── */}
      <Section title="¿Qué hace la app con tus repositorios?">
        <p className="text-sm text-slate-400">
          Cuando disparas un despliegue, el servidor ejecuta una secuencia
          automatizada y reproducible sobre cada repositorio del proyecto, en el
          orden que hayas definido.
        </p>

        <ol className="space-y-3 pt-1">
          {[
            {
              title: "Clonar o actualizar el repositorio",
              desc: "Si el repo nunca fue descargado, se clona en el servidor. Si ya existe, se ejecuta un fetch de todas las ramas remotas para tener la versión más reciente.",
            },
            {
              title: "Hacer checkout de la rama main",
              desc: "Se sitúa en la rama principal (main) y se asegura que está al día con el remoto.",
            },
            {
              title: "Hacer checkout de la rama production",
              desc: "Se pasa a la rama production (se crea si no existe) y se actualiza desde el remoto.",
            },
            {
              title: "Merge de main → production",
              desc: "Se fusiona main en production. Si hay conflictos, el deploy se marca como 'conflict' y se aborta sin hacer push, dejando el remoto intacto.",
            },
            {
              title: "Push a origin/production",
              desc: "Solo si el merge fue limpio, se sube la rama production al remoto de GitHub. Este es el único cambio que la app escribe en tu repositorio.",
            },
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <StepBadge n={i + 1} />
              <div>
                <p className="text-sm font-medium text-white">{step.title}</p>
                <p className="mt-0.5 text-sm text-slate-400">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Qué NO hace ───────────────────────────────────────────────────── */}
      <Section title="¿Qué NO hace la aplicación?">
        <div className="space-y-3">
          {[
            "No lee, copia ni analiza el contenido de tu código fuente.",
            "No modifica ramas distintas a production.",
            "No crea ni elimina repositorios ni ramas.",
            "No comparte tus tokens ni datos con servicios externos.",
            "No accede a repositorios que no hayas añadido explícitamente al proyecto.",
            "No ejecuta scripts ni comandos dentro del repositorio (sólo operaciones git).",
          ].map((text) => (
            <div key={text} className="flex items-start gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <p className="text-sm text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Dónde se almacena ─────────────────────────────────────────────── */}
      <Section title="¿Dónde y cómo se almacena la información?">
        <div className="space-y-3">
          <Item
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20 6H4V4h16v2zm-2 10H6v-2h12v2zm2-6H4V8h16v2z" />
              </svg>
            }
            title="Base de datos PostgreSQL"
            description="Proyectos, repositorios, historial de despliegues y tu perfil. Alojada en la misma infraestructura que el servidor, sin salida a terceros."
          />
          <Item
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
            }
            title="Token de GitHub cifrado"
            description="Tu access token se guarda en la base de datos y nunca se devuelve al cliente ni aparece en logs. Se usa únicamente en el servidor durante las operaciones git."
          />
          <Item
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
              </svg>
            }
            title="Clones locales en el servidor"
            description="Los repositorios se clonan en un directorio local del servidor para ejecutar las operaciones git. Este directorio no es accesible públicamente."
          />
          <Item
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
              </svg>
            }
            title="Sesión en Redis"
            description="Tu sesión activa se guarda en Redis con un TTL limitado. Al cerrar sesión, la sesión se elimina del servidor inmediatamente."
          />
        </div>
      </Section>

      {/* ── Cómo revocar ─────────────────────────────────────────────────── */}
      <Section title="¿Cómo revocar el acceso?">
        <p className="text-sm text-slate-400">
          Puedes revocar el acceso de esta aplicación a tu cuenta de GitHub en
          cualquier momento:
        </p>
        <ol className="mt-3 space-y-2 text-sm text-slate-300">
          <li className="flex items-start gap-2">
            <StepBadge n={1} />
            <span>
              Ve a{" "}
              <a
                href="https://github.com/settings/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 underline underline-offset-2 hover:text-primary-300"
              >
                github.com/settings/applications
              </a>
              .
            </span>
          </li>
          <li className="flex items-start gap-2">
            <StepBadge n={2} />
            <span>
              Busca esta aplicación en la pestaña{" "}
              <strong className="text-white">Authorized OAuth Apps</strong>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <StepBadge n={3} />
            <span>
              Haz clic en <strong className="text-white">Revoke</strong>. El
              token quedará invalidado de inmediato y la app no podrá acceder a
              tus repositorios.
            </span>
          </li>
        </ol>
      </Section>
    </div>
  );
}
