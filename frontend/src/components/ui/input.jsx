import React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-2xl bg-zinc-900/60 border border-white/10 " +
          "px-3 text-sm text-zinc-100 placeholder:text-zinc-400 " +
          "focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent",
        className
      )}
      {...props}
    />
  );
});
