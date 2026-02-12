import { cn } from '@/lib/utils';

interface GradientTextProps {
  children: React.ReactNode;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
  balance?: boolean;
  className?: string;
}

export function GradientText({
  children,
  as: Tag = 'span',
  balance = false,
  className,
}: GradientTextProps) {
  return (
    <Tag className={cn('text-gradient', balance && 'text-balance', className)}>
      {children}
    </Tag>
  );
}
