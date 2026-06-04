# Guía de despliegue en CapRover

Este proyecto se despliega automáticamente en CapRover mediante GitHub Actions al hacer push a la rama `production`.  
Hay dos workflows independientes: uno para el **backend** y otro para el **frontend**.

---

## Prerequisitos

- Instancia de CapRover corriendo y accesible (dominio propio o IP pública).
- CLI de CapRover instalada localmente (opcional, útil para setup inicial):
  ```bash
  npm install -g caprover
  ```
- Redis externo o desplegado como app en el mismo CapRover.

---

## 1. Crear las apps en CapRover

Desde el panel de CapRover (`https://captain.<tu-dominio>`), crea dos apps:

| App      | Nombre sugerido   | Tipo                            |
| -------- | ----------------- | ------------------------------- |
| Backend  | `deploy-backend`  | App estándar (tiene Dockerfile) |
| Frontend | `deploy-frontend` | App estándar (tiene Dockerfile) |

> El nombre exacto no importa; lo que pongas aquí es lo que irá en los secrets de GitHub.

---

## 2. Habilitar HTTPS en las apps

Una vez creadas, activa **Enable HTTPS** en cada app desde el panel de CapRover para obtener certificados Let's Encrypt automáticamente.

---

## 3. Obtener los App Tokens de CapRover

Dentro de cada app en el panel de CapRover:

1. Ve a la pestaña **Deployment**.
2. Expande la sección **Method 6 – Deploy via ImageName / Token**.
3. Haz clic en **Enable App Token** y copia el token generado.

Repite para el backend y el frontend.

---

## 4. Configurar los Secrets de GitHub

Ve a **Settings → Secrets and variables → Actions → Environments** en tu repositorio de GitHub y crea el entorno **`production`** con los siguientes secrets:

### Secrets comunes

| Secret            | Valor                                                    |
| ----------------- | -------------------------------------------------------- |
| `CAPROVER_SERVER` | URL de tu CapRover, ej. `https://captain.tu-dominio.com` |

### Backend

| Secret                   | Descripción                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| `APP_NAME_BACKEND`       | Nombre de la app en CapRover, ej. `deploy-backend`                           |
| `APP_TOKEN_BACKEND`      | Token obtenido en el paso 3                                                  |
| `SESSION_SECRET`         | String aleatorio largo para firmar sesiones                                  |
| `GH_OAUTH_CLIENT_ID`     | Client ID de tu GitHub OAuth App                                             |
| `GH_OAUTH_CLIENT_SECRET` | Client Secret de tu GitHub OAuth App                                         |
| `GH_OAUTH_CALLBACK_URL`  | URL de callback OAuth, ej. `https://api.tu-dominio.com/auth/github/callback` |
| `REDIS_HOST`             | Host de Redis                                                                |
| `REDIS_PORT`             | Puerto de Redis (por defecto `6379`)                                         |
| `REDIS_PASSWORD`         | Contraseña de Redis (vacío si no tiene)                                      |
| `FRONTEND_URL`           | URL pública del frontend, ej. `https://app.tu-dominio.com`                   |

### Frontend

| Secret               | Descripción                                               |
| -------------------- | --------------------------------------------------------- |
| `APP_NAME_FRONTEND`  | Nombre de la app en CapRover, ej. `deploy-frontend`       |
| `APP_TOKEN_FRONTEND` | Token obtenido en el paso 3                               |
| `VITE_API_URL`       | URL pública del backend, ej. `https://api.tu-dominio.com` |

---

## 5. Configurar la GitHub OAuth App

En **GitHub → Settings → Developer settings → OAuth Apps**, crea una nueva app con:

- **Homepage URL:** `https://app.tu-dominio.com`
- **Authorization callback URL:** `https://api.tu-dominio.com/auth/github/callback`

Copia el **Client ID** y genera un **Client Secret** para usarlos en los secrets del paso 4.

---

## 6. Desplegar

### Despliegue automático (recomendado)

Cualquier push a la rama `production` dispara el workflow correspondiente:

```bash
# Desplegar solo el backend (cambios en backend/)
git push origin main:production

# O con cambios específicos
git checkout production
git merge main
git push origin production
```

- Si el push incluye cambios en `backend/`, se ejecuta `deploy-backend.yml`.
- Si incluye cambios en `frontend/`, se ejecuta `deploy-frontend.yml`.
- Si hay cambios en ambos, **los dos workflows se ejecutan en paralelo**.

### Despliegue manual (workflow_dispatch)

Desde **GitHub → Actions**, selecciona el workflow que quieras y haz clic en **Run workflow** sobre la rama `production`. Útil para re-desplegar sin hacer commits.

---

## 7. Qué hacen los workflows

### `deploy-backend.yml`

1. Genera un `.env` en `backend/` con todos los secrets del entorno `production`.
2. Empaqueta el directorio `backend/` en un `deploy.tar` (excluyendo `node_modules`, `.git`, `frontend`).
3. Envía el tar a CapRover usando [`caprover/deploy-from-github@v1.1.2`](https://github.com/caprover/deploy-from-github).
4. CapRover construye la imagen con el `Dockerfile` del backend, que:
   - Compila TypeScript en la etapa `builder`.
   - Genera una imagen de producción mínima (Node 22 Alpine).
   - Arranca tanto el **servidor HTTP** (`server.js`) como el **worker de colas** (`deployWorker.js`) en el mismo contenedor.

### `deploy-frontend.yml`

1. Genera un `.env` en `frontend/` con `VITE_API_URL`.
2. Empaqueta el directorio `frontend/` en un `deploy.tar`.
3. Envía el tar a CapRover.
4. CapRover construye la imagen con el `Dockerfile` del frontend, que:
   - Compila el proyecto con Vite en la etapa `builder`.
   - Sirve los estáticos con **nginx** (con fallback SPA a `index.html`).

---

## 8. Volúmenes persistentes (SQLite y repos clonados)

El backend almacena la base de datos SQLite y los repositorios clonados en `./data/`. Para que estos datos **sobrevivan a los reinicios**, configura un volumen persistente en CapRover:

1. Ve a la app del backend en el panel de CapRover.
2. En la pestaña **App Configs**, añade un volumen:
   - **Path in App:** `/app/data`
   - **Label:** `deploy-backend-data` (o el nombre que prefieras)
3. Guarda y redespliega.

---

## 9. Verificar el despliegue

```bash
# Health check del backend
curl https://api.tu-dominio.com/health

# Acceder al frontend
open https://app.tu-dominio.com
```

Desde el panel de CapRover también puedes ver los logs en tiempo real de cada app en la pestaña **Logs**.
