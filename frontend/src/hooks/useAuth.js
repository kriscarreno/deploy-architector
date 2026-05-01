/**
 * @file useAuth.js
 * @description Hook de autenticación. Expone el usuario y acciones de auth.
 * Escucha el evento 'auth:unauthorized' del interceptor de Axios.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

/**
 * @returns {{
 *   user: object|null,
 *   loading: boolean,
 *   hydrated: boolean,
 *   isAuthenticated: boolean,
 *   loginWithGitHub: () => void,
 *   logout: () => Promise<void>,
 *   checkAuth: () => Promise<void>,
 * }}
 */
function useAuth() {
  const { user, loading, hydrated, checkAuth, loginWithGitHub, logout } =
    useAuthStore();
  const navigate = useNavigate();

  // Escucha el evento disparado por el interceptor Axios ante un 401
  useEffect(() => {
    const handleUnauthorized = () => {
      useAuthStore.getState().logout();
      navigate("/login", { replace: true });
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [navigate]);

  return {
    user,
    loading,
    hydrated,
    isAuthenticated: Boolean(user),
    loginWithGitHub,
    logout,
    checkAuth,
  };
}

export default useAuth;
