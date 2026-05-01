/**
 * @file authStore.js
 * @description Estado global de autenticación usando Zustand.
 * Persiste el usuario en sessionStorage para sobrevivir recargas.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import authService from "../services/authService";

/**
 * @typedef {Object} AuthState
 * @property {object|null} user       - Usuario autenticado
 * @property {boolean}     loading    - Cargando estado inicial
 * @property {boolean}     hydrated   - Store ya sincronizado con sesión
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      hydrated: false,

      /**
       * Verifica si hay una sesión activa en el backend.
       * Se llama al inicializar la app.
       */
      checkAuth: async () => {
        set({ loading: true });
        try {
          const user = await authService.getMe();
          set({ user, loading: false, hydrated: true });
        } catch {
          set({ user: null, loading: false, hydrated: true });
        }
      },

      /**
       * Inicia el flujo OAuth de GitHub.
       */
      loginWithGitHub: () => {
        authService.loginWithGitHub();
      },

      /**
       * Cierra la sesión.
       */
      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Continuar aunque falle el backend
        } finally {
          set({ user: null });
        }
      },

      /** Setea el usuario directamente (p.ej. tras callback OAuth). */
      setUser: (user) => set({ user }),

      /** ¿Está autenticado? */
      isAuthenticated: () => Boolean(get().user),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

export default useAuthStore;
