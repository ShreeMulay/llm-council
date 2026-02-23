import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-4 w-full overflow-hidden rounded-full bg-white/30', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn('h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500', indicatorClassName)}
      style={{ width: `${value || 0}%` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = 'Progress';

export { Progress };
