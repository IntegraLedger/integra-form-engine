import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TopAreasBarProps {
  data: { name: string; parcels: number }[];
}

export function TopAreasBar({ data }: TopAreasBarProps) {
  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
          <XAxis
            type="number"
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11, fill: 'var(--color-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            formatter={(value) => [Number(value).toLocaleString(), 'Parcels']}
          />
          <Bar
            dataKey="parcels"
            radius={[0, 4, 4, 0]}
            fill="url(#reBarGradient)"
            maxBarSize={24}
          />
          <defs>
            <linearGradient id="reBarGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="oklch(55% 0.18 250)" />
              <stop offset="100%" stopColor="oklch(75% 0.14 195)" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
