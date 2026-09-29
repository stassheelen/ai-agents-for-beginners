"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/utils";

export function SalesChart({ data }: { data: { label: string; sales: number; orders: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#eeece8" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6f6c66" }} minTickGap={16} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 11, fill: "#6f6c66" }}
            tickFormatter={(v: number) => (v >= 100000 ? `${Math.round(v / 100000)}k` : String(Math.round(v / 100)))}
          />
          <Tooltip
            cursor={{ stroke: "#111", strokeWidth: 1 }}
            contentStyle={{ borderRadius: 0, border: "1px solid #e5e2dc", fontSize: 12 }}
            formatter={(value, name) => (name === "sales" ? [formatMoney(Number(value)), "Sales"] : [value, "Orders"])}
          />
          <Area isAnimationActive={false} type="monotone" dataKey="sales" stroke="#111111" strokeWidth={1.5} fill="#111111" fillOpacity={0.06} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
