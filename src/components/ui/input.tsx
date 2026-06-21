import * as React from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:opacity-50";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseField, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(baseField, "min-h-28 resize-y rounded-2xl", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(baseField, "cursor-pointer pr-8", className)} {...props} />;
}

/** Campo con etiqueta y mensaje de error opcional. */
export function Field({
  label,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-expense">{error}</p>}
    </div>
  );
}
