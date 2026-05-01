/**
 * @file validators.js
 * @description Reglas de validación para react-hook-form.
 */

/** Reglas para el campo "nombre de proyecto". */
export const projectNameRules = {
  required: "El nombre es obligatorio",
  minLength: { value: 2, message: "Mínimo 2 caracteres" },
  maxLength: { value: 80, message: "Máximo 80 caracteres" },
  pattern: {
    value: /^[a-zA-Z0-9 _\-().]+$/,
    message: "Solo letras, números, espacios y - _ ( ) .",
  },
};

/** Reglas para el campo "git_url". */
export const gitUrlRules = {
  required: "La URL del repositorio es obligatoria",
  pattern: {
    value: /^(https?:\/\/|git@)[^\s]+\.git$/,
    message: "Debe ser una URL de repositorio git válida (terminar en .git)",
  },
};

/** Reglas para nombres de rama. */
export const branchRules = {
  required: "La rama es obligatoria",
  minLength: { value: 1, message: "Mínimo 1 carácter" },
  maxLength: { value: 100, message: "Máximo 100 caracteres" },
  pattern: {
    value: /^[a-zA-Z0-9/_\-.]+$/,
    message: "Nombre de rama inválido",
  },
};

/** Reglas para el campo "orden". */
export const orderRules = {
  required: "El orden es obligatorio",
  min: { value: 1, message: "Mínimo 1" },
  max: { value: 999, message: "Máximo 999" },
};
