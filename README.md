# Deploy Orchestrator

Monorepo con dos apps:

- `backend/` — Express + SQLite + Redis + Bull
- `frontend/` — Vite + React 18 + TailwindCSS

## Desarrollo local

```bash
# Backend
cd backend && npm install && npm run dev

# Worker (proceso separado)
cd backend && npm run dev:worker

# Frontend
cd frontend && npm install && npm run dev
```

## Despliegue

Los workflows de GitHub Actions están en `.github/workflows/`:

- `deploy-backend.yml` — se activa al hacer push a `production` con cambios en `backend/`
- `deploy-frontend.yml` — se activa al hacer push a `production` con cambios en `frontend/`
# deploy-architector
