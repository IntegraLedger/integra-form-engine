import { Database, Globe, Map, Activity } from 'lucide-react';
import { formatNumber } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardsProps {
  totalParcels?: number;
  totalSources?: number;
  countryCount?: number;
  sourcesByStatus?: { status: string; count: number }[];
  isLoading?: boolean;
}

export function StatCards({ totalParcels, totalSources, countryCount, sourcesByStatus, isLoading }: StatCardsProps) {
  const activeSources = sourcesByStatus?.find(s => s.status === 'active')?.count ?? 0;

  const cards = [
    { label: 'Total Parcels', value: totalParcels, icon: Database, color: 'text-cyan-500' },
    { label: 'Total Sources', value: totalSources, icon: Map, color: 'text-blue-500' },
    { label: 'Countries', value: countryCount, icon: Globe, color: 'text-green-500' },
    { label: 'Active Sources', value: activeSources, icon: Activity, color: 'text-purple-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="card-enhanced p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-24 mb-1" />
          ) : (
            <p className="text-2xl font-bold">{formatNumber(card.value ?? 0)}</p>
          )}
          <p className="text-xs text-muted-foreground">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
