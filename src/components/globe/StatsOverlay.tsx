import { formatNumber } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsOverlayProps {
  totalParcels?: number;
  totalSources?: number;
  countryCount?: number;
  isLoading?: boolean;
}

export function StatsOverlay({ totalParcels, totalSources, countryCount, isLoading }: StatsOverlayProps) {
  const stats = [
    { label: 'Total Parcels', value: totalParcels },
    { label: 'Active Sources', value: totalSources },
    { label: 'Countries', value: countryCount },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          {isLoading ? (
            <Skeleton className="h-8 w-24 mx-auto mb-1" />
          ) : (
            <p className="text-2xl md:text-3xl font-bold text-gradient">
              {formatNumber(stat.value ?? 0)}
            </p>
          )}
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
