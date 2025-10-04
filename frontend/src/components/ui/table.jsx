    import React from "react";
import { cn } from "../../lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn(
          "w-full text-left text-sm text-zinc-200 min-w-[640px]",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader(props) {
  return <thead {...props} />;
}

export function TableBody(props) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn(
        "border-b border-white/5 hover:bg-white/[0.03] transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return <td className={cn("px-4 py-3", className)} {...props} />;
}
