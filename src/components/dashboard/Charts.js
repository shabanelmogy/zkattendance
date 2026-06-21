'use client';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="value" style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
}

export function AttendanceTrendChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="present" name="Present" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="present" name="Present" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
