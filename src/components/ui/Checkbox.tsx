"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className = "", ...props }, ref) => {
    return (
      <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer">
        <input
          id={id}
          ref={ref}
          type="checkbox"
          className={`rounded accent-brand-500 w-4 h-4 ${className}`}
          {...props}
        />
        <span className="text-sm font-medium text-text-muted">{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
export default Checkbox;
