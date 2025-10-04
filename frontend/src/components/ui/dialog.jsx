import React from "react";
import { cn } from "../../lib/utils";

export function Dialog({ open, onOpenChange, children }) {
  React.useEffect(() => {
    function onEsc(e) {
      if (e.key === "Escape") onOpenChange?.(false);
    }
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50"
      aria-modal="true"
      role="dialog"
      onClick={() => onOpenChange?.(false)}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="absolute inset-0 grid place-items-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ className, ...props }) {
  return (
    <div
      className={cn(
        "w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-xl",
        className
      )}
      {...props}
    />
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-4", className)} {...props} />;
}
export function DialogTitle({ className, ...props }) {
  return <h3 className={cn("text-lg font-semibold", className)} {...props} />;
}
export function DialogDescription({ className, ...props }) {
  return (
    <p className={cn("text-sm text-zinc-400", className)} {...props} />
  );
}
export function DialogFooter({ className, ...props }) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />;
}
