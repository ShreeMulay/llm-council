import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-lg font-bold transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-lg shadow-purple-300/50 hover:brightness-110',
        secondary: 'bg-secondary text-secondary-foreground shadow-lg shadow-pink-300/50 hover:brightness-110',
        accent: 'bg-accent text-accent-foreground shadow-lg shadow-cyan-300/50 hover:brightness-110',
        success: 'bg-success text-white shadow-lg shadow-green-300/50 hover:brightness-110',
        outline: 'border-2 border-border bg-white/80 hover:bg-white',
        ghost: 'hover:bg-white/20',
        destructive: 'bg-destructive text-white hover:brightness-110',
      },
      size: {
        default: 'h-14 px-6 py-3',
        sm: 'h-11 px-4 py-2 text-base',
        lg: 'h-16 px-8 py-4 text-xl',
        xl: 'h-20 px-10 py-5 text-2xl',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
