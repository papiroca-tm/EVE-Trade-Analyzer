'use client';
import type { MarketHistoryItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function MarketHistoryPanel({ 
    history,
}: { 
    history: MarketHistoryItem[],
}) {
    
  const chartData = history.map(item => ({
    date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
    fullDate: new Date(item.date).toLocaleDateString('ru-RU'),
    Цена: item.average,
    Объем: item.volume,
  })).reverse();
  
  const yDomainPrice = () => {
      if (chartData.length === 0) return [0, 0];
      const prices = chartData.map(p => p.Цена);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const padding = (max - min) * 0.1;
      return [min - padding, max + padding];
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Дата
              </span>
              <span className="font-bold text-muted-foreground">
                {data.fullDate}
              </span>
            </div>
             <div className="flex flex-col space-y-1">
               <span className="text-[0.70rem] uppercase text-muted-foreground">
                &nbsp;
              </span>
                <span className="font-bold text-muted-foreground">
                &nbsp;
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Цена
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--primary))' }}>
                {data.Цена.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ISK
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Объем
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--accent))' }}>
                {data.Объем.toLocaleString('ru-RU')}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <CardTitle>Динамика рынка</CardTitle>
        </div>
        <CardDescription>
            Цена и объем торгов за последние {history.length} дней.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="70%">
                <LineChart 
                    data={chartData} 
                    syncId="marketData"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <YAxis
                        dataKey="Цена"
                        stroke="hsl(var(--primary))"
                        tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                        domain={yDomainPrice()}
                        width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Цена" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="30%">
                <BarChart 
                    data={chartData} 
                    syncId="marketData"
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={true}
                        tickMargin={8}
                        tickFormatter={(value) => value}
                    />
                    <YAxis
                        dataKey="Объем"
                        orientation="left"
                        stroke="hsl(var(--accent))"
                        tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                        width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Объем" fill="hsl(var(--accent))" fillOpacity={0.4} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
