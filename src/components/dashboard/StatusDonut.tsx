import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface StatusDonutProps {
  data: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  active: '#34d399',
  completed: '#34d399',
  running: '#60a5fa',
  pending: '#fbbf24',
  failed: '#f87171',
  disabled: '#9ca3af',
};

export function StatusDonut({ data }: StatusDonutProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="relative" style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            dataKey="count"
            nameKey="status"
            strokeWidth={2}
            stroke="var(--color-card)"
          >
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? '#9ca3af'}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            formatter={(value) => [String(value), '']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold">{total}</span>
        <span className="text-xs text-muted-foreground">sources</span>
      </div>
    </div>
  );
}
