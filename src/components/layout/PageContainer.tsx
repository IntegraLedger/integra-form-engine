import { cn } from '@/lib/utils';

const tierClasses = {
  full: 'max-w-7xl',
  landing: 'max-w-6xl',
  docs: 'max-w-5xl',
  forms: 'max-w-4xl',
  auth: 'max-w-md',
} as const;

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  tier?: keyof typeof tierClasses;
}

export function PageContainer({
  tier = 'full',
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto px-4 sm:px-6 lg:px-8 py-12',
        tierClasses[tier],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
