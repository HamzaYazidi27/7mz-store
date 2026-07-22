"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  containerClassName?: string;
}

/**
 * Text input with floating chrome: soft surface fill, focus ring in primary,
 * inline error state with danger accenting.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightSlot, className, containerClassName, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-[13px] font-medium text-fg-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-tertiary [&>svg]:size-[18px]">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={cn(
            "h-12 w-full rounded-btn border bg-surface-2 px-4 text-[15px] text-fg outline-none transition-[border-color,box-shadow] duration-200",
            "placeholder:text-fg-tertiary",
            leftIcon && "pl-10",
            rightSlot && "pr-12",
            error
              ? "border-danger/60 focus:border-danger focus:ring-2 focus:ring-danger/15"
              : "border-border focus:border-primary/60 focus:ring-2 focus:ring-primary/15",
            className,
          )}
          {...props}
        />
        {rightSlot && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </div>
      {(error || hint) && (
        <p className={cn("mt-1.5 text-[13px]", error ? "text-danger" : "text-fg-tertiary")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, containerClassName, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-[13px] font-medium text-fg-secondary"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={cn(
          "min-h-28 w-full resize-none rounded-btn border bg-surface-2 p-4 text-[15px] text-fg outline-none transition-[border-color,box-shadow] duration-200",
          "placeholder:text-fg-tertiary",
          error
            ? "border-danger/60 focus:border-danger focus:ring-2 focus:ring-danger/15"
            : "border-border focus:border-primary/60 focus:ring-2 focus:ring-primary/15",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
});
