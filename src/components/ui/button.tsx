import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        // Pill de marca con inversión al hover (como Awake)
        primary:
          "bg-primary text-primary-foreground border border-primary hover:bg-transparent hover:text-primary",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-foreground hover:text-background",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-accent",
        soft: "bg-accent text-accent-foreground hover:bg-accent/70",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-6",
        lg: "h-12 px-7 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type CommonProps = VariantProps<typeof buttonVariants> & {
  className?: string;
  /** Muestra la flecha animada (estilo Awake) al final. */
  arrow?: boolean;
  children?: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };
type ButtonAsLink = CommonProps &
  Omit<React.ComponentProps<typeof Link>, keyof CommonProps> & { href: string };

function Content({ arrow, children }: Pick<CommonProps, "arrow" | "children">) {
  return (
    <>
      {children}
      {arrow && (
        <ArrowUpRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      )}
    </>
  );
}

/** Botón pill de marca. Renderiza <Link> si recibe `href`, si no <button>. */
export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { className, variant, size, arrow, children, ...rest } = props;
  const classes = cn(buttonVariants({ variant, size }), className);

  if (rest.href != null) {
    const { href, ...linkRest } = rest as Omit<ButtonAsLink, keyof CommonProps>;
    return (
      <Link href={href} className={classes} {...linkRest}>
        <Content arrow={arrow}>{children}</Content>
      </Link>
    );
  }

  const buttonRest = rest as Omit<ButtonAsButton, keyof CommonProps | "href">;
  return (
    <button className={classes} {...buttonRest}>
      <Content arrow={arrow}>{children}</Content>
    </button>
  );
}

export { buttonVariants };
