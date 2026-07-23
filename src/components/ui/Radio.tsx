"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, id, className = "", ...props }, ref) => {
    return (
      <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer">
        <input
          id={id}
          ref={ref}
          type="radio"
          className={`accent-brand-500 w-4 h-4 ${className}`}
          {...props}
        />
        <span className="text-sm font-medium text-text-muted">{label}</span>
      </label>
    );
  }
);

Radio.displayName = "Radio";
export default Radio;
