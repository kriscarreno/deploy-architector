/**
 * @file apiClient.js
 * @description Axios instance centralizada con interceptors.
 * Añade credenciales (cookies) automáticamente en cada petición.
 * Intercepta errores 401 para redirigir al login.
 */
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Enviar cookie de sesión en cada petición
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

// ── Request interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// ── Response interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // No disparar el evento para el endpoint de logout (evita bucle infinito)
      const url: string = error.config?.url ?? "";
      if (!url.endsWith("/auth/logout")) {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
