import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover',
        secondary: 'border border-border bg-surface text-foreground hover:bg-surface-strong',
        ghost: 'text-muted-foreground hover:bg-surface hover:text-foreground',
        danger: 'bg-danger/12 text-danger hover:bg-danger/18',
      },
      size: {
        sm: 'min-h-9 rounded-lg px-3 text-xs',
        md: 'min-h-11 px-4',
        lg: 'min-h-12 rounded-2xl px-5',
        icon: 'size-11 min-h-11 shrink-0 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = 'button', ...props },
  ref,
) {
  return <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} type={type} {...props} />;
});

export { buttonVariants };
