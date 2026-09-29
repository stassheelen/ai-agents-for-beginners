import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & { variant?: "default" | "outline" | "muted" | "success" | "warning" | "danger" }) {
  const styles = {
    default: "bg-foreground text-background",
    outline: "border border-foreground/20 text-foreground",
    muted: "bg-muted text-foreground",
    success: "bg-[#e7f1e8] text-[#1f5a2b]",
    warning: "bg-[#fbf1dc] text-[#7a5212]",
    danger: "bg-[#fbe6e4] text-[#9b1c13]",
  }[variant];
  return <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]", styles, className)} {...props} />;
}

export function Separator({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="separator" className={cn("h-px w-full bg-border", className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse bg-muted", className)} {...props} />;
}

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("border border-border bg-white", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center justify-between gap-4 border-b border-border px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-semibold", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}
export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("border-b border-border bg-soft text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground", className)} {...props} />;
}
export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b border-border last:border-0 hover:bg-soft/70", className)} {...props} />;
}
export function TH({ className, ...props }: React.ComponentProps<"th">) {
  return <th className={cn("h-10 whitespace-nowrap px-3 font-medium", className)} {...props} />;
}
export function TD({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-3 align-middle", className)} {...props} />;
}

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-20 text-center", className)}>
      <p className="font-display text-xl">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
