    import React from "react";
import { cn } from "../../lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-medium " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600",
  outline:
    "border border-white/10 bg-transparent hover:bg-white/5 text-white focus:ring-white/40",
  ghost: "bg-transparent hover:bg-white/5 text-white focus:ring-white/40",
  destructive:
    "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600",
  secondary:
    "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 focus:ring-zinc-600",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export function Button({
  className,
  variant = "default",
  size = "md",
  asChild,
  ...props
}) {
  const Comp = asChild ? "span" : "button";
  return (
    <Comp
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
