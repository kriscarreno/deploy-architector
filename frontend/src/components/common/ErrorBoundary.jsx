import PropTypes from "prop-types";

/**
 * Error Boundary de clase para capturar errores en el árbol de componentes.
 * Muestra un fallback en lugar de romper toda la UI.
 */
import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Aquí se podría enviar a un servicio de monitoreo (Sentry, etc.)
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback(this.state.error);
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-red-800 bg-red-900/20 p-8 text-center">
          <p className="text-lg font-semibold text-red-300">Algo salió mal</p>
          <p className="text-sm text-slate-400">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-secondary text-sm"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func,
};

export default ErrorBoundary;
