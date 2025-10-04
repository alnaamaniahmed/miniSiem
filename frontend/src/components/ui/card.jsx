import React from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur " +
          "shadow-lg shadow-black/40",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div className={cn("p-5 sm:p-6 border-b border-white/5", className)} {...props} />
  );
}
export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-lg font-semibold", className)} {...props} />;
}
export function CardDescription({ className, ...props }) {
  return (
    <p className={cn("text-sm text-zinc-400", className)} {...props} />
  );
}
export function CardContent({ className, ...props }) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}
export function CardFooter({ className, ...props }) {
  return (
    <div className={cn("p-5 sm:p-6 pt-0 border-t border-white/5", className)} {...props} />
  );
}
