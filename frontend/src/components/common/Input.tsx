import { forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id?: string;
  error?: string;
  hint?: string;
  className?: string;
  required?: boolean;
  type?: string;
}

/**
 * Input de formulario con etiqueta, error y descripción integrados.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, error, hint, className, required, type = "text", ...props },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && (
            <span className="ml-1 text-red-400" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        required={required}
        className={clsx(
          "form-input",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className,
        )}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
