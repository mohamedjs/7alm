"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-text-muted mb-2">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={`w-full neu-input rounded-xl px-4 py-3 transition-all ${error ? "ring-2 ring-danger" : ""} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error && id ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={id ? `${id}-error` : undefined} className="mt-1 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
