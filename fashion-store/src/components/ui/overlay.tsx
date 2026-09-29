"use client";

import * as React from "react";
import { Dialog as D, Accordion as A, Checkbox as C, Switch as S, DropdownMenu as M, Tabs as T } from "radix-ui";
import { X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Dialog / Sheet ───
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;
export const DialogTitle = ({ className, ...p }: React.ComponentProps<typeof D.Title>) => <D.Title className={cn("font-display text-lg", className)} {...p} />;
export const DialogDescription = ({ className, ...p }: React.ComponentProps<typeof D.Description>) => <D.Description className={cn("text-sm text-muted-foreground", className)} {...p} />;

export function DialogContent({ className, children, hideClose, ...props }: React.ComponentProps<typeof D.Content> & { hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-white p-6 data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <D.Close className="absolute right-4 top-4 p-1 opacity-70 transition-opacity hover:opacity-100" aria-label="Close">
            <X className="size-5" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

export function SheetContent({
  side = "right",
  className,
  children,
  hideClose,
  ...props
}: React.ComponentProps<typeof D.Content> & { side?: "right" | "left" | "bottom"; hideClose?: boolean }) {
  const sideCls = {
    right: "inset-y-0 right-0 h-full w-full sm:max-w-md data-[state=open]:animate-slide-in-right",
    left: "inset-y-0 left-0 h-full w-[88%] max-w-sm data-[state=open]:animate-slide-in-left",
    bottom: "inset-x-0 bottom-0 max-h-[92vh] w-full data-[state=open]:animate-slide-in-bottom",
  }[side];
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-fade-in" />
      <D.Content className={cn("fixed z-50 flex flex-col bg-white outline-none", sideCls, className)} {...props}>
        {children}
        {!hideClose && (
          <D.Close className="absolute right-4 top-4 p-1 opacity-70 transition-opacity hover:opacity-100" aria-label="Close">
            <X className="size-5" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

// ─── Accordion ───
export const Accordion = A.Root;
export function AccordionItem({ className, ...p }: React.ComponentProps<typeof A.Item>) {
  return <A.Item className={cn("border-b border-border", className)} {...p} />;
}
export function AccordionTrigger({ className, children, ...p }: React.ComponentProps<typeof A.Trigger>) {
  return (
    <A.Header className="flex">
      <A.Trigger
        className={cn("group flex flex-1 items-center justify-between py-4 text-left text-xs font-medium uppercase tracking-[0.12em]", className)}
        {...p}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </A.Trigger>
    </A.Header>
  );
}
export function AccordionContent({ className, children, ...p }: React.ComponentProps<typeof A.Content>) {
  return (
    <A.Content className="overflow-hidden text-sm" {...p}>
      <div className={cn("pb-5 leading-relaxed text-muted-foreground", className)}>{children}</div>
    </A.Content>
  );
}

// ─── Checkbox / Switch ───
export function Checkbox({ className, ...p }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "flex size-4 shrink-0 items-center justify-center border border-input bg-white data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-white",
        className,
      )}
      {...p}
    >
      <C.Indicator>
        <Check className="size-3" strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  );
}

export function Switch({ className, ...p }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-input transition-colors data-[state=checked]:bg-foreground",
        className,
      )}
      {...p}
    >
      <S.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[18px]" />
    </S.Root>
  );
}

// ─── Dropdown ───
export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export function DropdownMenuContent({ className, align = "end", ...p }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-44 border border-border bg-white p-1 shadow-[0_8px_30px_rgba(0,0,0,0.08)] data-[state=open]:animate-fade-in", className)}
        {...p}
      />
    </M.Portal>
  );
}
export function DropdownMenuItem({ className, ...p }: React.ComponentProps<typeof M.Item>) {
  return (
    <M.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 [&_svg]:size-4",
        className,
      )}
      {...p}
    />
  );
}
export const DropdownMenuSeparator = () => <M.Separator className="my-1 h-px bg-border" />;

// ─── Tabs ───
export const Tabs = T.Root;
export function TabsList({ className, ...p }: React.ComponentProps<typeof T.List>) {
  return <T.List className={cn("flex gap-6 border-b border-border", className)} {...p} />;
}
export function TabsTrigger({ className, ...p }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "-mb-px border-b-2 border-transparent pb-3 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground",
        className,
      )}
      {...p}
    />
  );
}
export const TabsContent = T.Content;
