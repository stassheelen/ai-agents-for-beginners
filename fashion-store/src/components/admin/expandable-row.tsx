"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Table row that toggles a full-width details row below it. Links and buttons inside keep their own behaviour. */
export function ExpandableRow({ colSpan, children, details }: { colSpan: number; children: React.ReactNode; details: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const toggle = (e: React.SyntheticEvent) => {
    if ((e.target as HTMLElement).closest("a,button")) return;
    setOpen((v) => !v);
  };
  return (
    <>
      <tr
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className={cn("cursor-pointer border-b border-border hover:bg-soft/70 focus-visible:bg-soft/70 focus-visible:outline-none", open && "border-b-0 bg-soft/70")}
      >
        <td className="w-8 py-3 pl-3 align-middle">
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </td>
        {children}
      </tr>
      {open && (
        <tr className="border-b border-border bg-soft/70">
          <td colSpan={colSpan + 1} className="px-3 pb-4 pt-0">
            {details}
          </td>
        </tr>
      )}
    </>
  );
}
