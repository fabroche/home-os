import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground",
        brand: "bg-primary/10 text-primary",
        income: "bg-[color-mix(in_oklab,var(--income)_15%,transparent)] text-income",
        expense: "bg-[color-mix(in_oklab,var(--expense)_15%,transparent)] text-expense",
        debt: "bg-[color-mix(in_oklab,var(--debt)_18%,transparent)] text-debt",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
