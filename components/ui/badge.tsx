import * as React from "react";

export function Badge({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={`inline-flex items-center rounded-full bg-slate-200 px-2 py-1 text-xs ${className}`} {...props} />;
}
