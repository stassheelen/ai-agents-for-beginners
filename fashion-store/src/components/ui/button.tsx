import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-medium uppercase tracking-[0.12em] transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        accent: "bg-accent text-accent-foreground hover:opacity-90",
        outline: "border border-foreground bg-transparent hover:bg-foreground hover:text-background",
        secondary: "bg-muted text-foreground hover:bg-[#ebe9e4]",
        ghost: "hover:bg-muted",
        link: "underline-offset-4 hover:underline normal-case tracking-normal text-sm",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        white: "bg-white text-black hover:bg-white/85",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4",
        lg: "h-13 px-8",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
