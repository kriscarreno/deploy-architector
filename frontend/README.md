# Deploy Orchestrator – Frontend

SPA construida con **Vite + React 18 + TailwindCSS + Zustand**.

## Requisitos previos

- Node.js ≥ 18
- Backend corriendo en `http://localhost:3001`

## Instalación

```bash
npm install
```

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto (ya incluye `.env.example`):

```env
VITE_API_URL=http://localhost:3001
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

## Build de producción

```bash
npm run build
npm run preview   # previsualizar build
```

## Estructura de carpetas

```
src/
  assets/          → imágenes, fuentes
  components/
    common/        → Button, Modal, Spinner, Input, Table, Badge
    layout/        → Header, Sidebar, MainLayout
  pages/           → LoginPage, DashboardPage, ProjectDetailPage, HistoryPage
  hooks/           → useAuth, useDeploy, useProjects, useToast, usePolling
  services/        → apiClient, authService, projectService, deployService
  store/           → authStore, projectStore (Zustand)
  utils/           → formatDate, errorHandler, validators
  routes/          → Router, PrivateRoute
  styles/          → globals.css
  App.jsx
  main.jsx
```

## Tests

```bash
npm run test
```

Los tests se ubican en carpetas `__tests__/` junto a cada módulo. Usa **Vitest**.

## Autenticación

El login redirige al backend `/auth/github`, que devuelve una cookie de sesión.
El frontend detecta el estado de auth al cargar con `GET /api/auth/me`.

## Notas de seguridad

- `axios` configurado con `withCredentials: true` para enviar cookies.
- Interceptor global para errores `401` → redirige a `/login`.
- Variables de entorno no se incluyen en el repositorio (`.gitignore`).
