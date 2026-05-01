/**
 * @file authService.js
 * @description Servicios de autenticación con GitHub OAuth.
 */
import apiClient from "./apiClient";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const authService = {
  /**
   * Redirige al flujo OAuth de GitHub en el backend.
   * El backend maneja el callback y establece la cookie de sesión.
   */
  loginWithGitHub() {
    window.location.href = `${BASE_URL}/auth/github`;
  },

  /**
   * Obtiene el usuario autenticado actual.
   * @returns {Promise<{id: string, login: string, avatar_url: string}>}
   */
  getMe() {
    // Backend devuelve { data: user }, axios envuelve en r.data → r.data.data es el usuario
    return apiClient.get("/auth/me").then((r) => r.data.data);
  },

  /**
   * Cierra la sesión en el backend.
   * @returns {Promise<void>}
   */
  logout() {
    return apiClient.post("/auth/logout").then((r) => r.data);
  },
};

export default authService;
