'use client';
import type { MarketHistoryItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Bar, ComposedChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export function MarketHistoryPanel({ 
    history,
    averagePrice,
    totalVolume
}: { 
    history: MarketHistoryItem[],
    averagePrice: number,
    totalVolume: number,
}) {
    
  const chartData = history.map(item => ({
    date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
    price: item.average,
    volume: item.volume,
  })).reverse();
  
  const chartConfig = {
    price: {
      label: 'Цена',
      color: 'hsl(var(--primary))',
    },
    volume: {
      label: 'Объем',
      color: 'hsl(var(--accent))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <CardTitle>Динамика рынка</CardTitle>
        </div>
        <CardDescription>
            Средняя цена и объем торгов за последние {history.length} дней.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
            <ResponsiveContainer>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                     <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value}
                        />
                    <YAxis
                        dataKey="price"
                        yAxisId="left"
                        orientation="left"
                        stroke="hsl(var(--primary))"
                        tickFormatter={(value) => `₽${(value / 1000).toFixed(1)}k`}
                        domain={['dataMin - 100', 'dataMax + 100']}
                    />
                    <YAxis
                        dataKey="volume"
                        yAxisId="right"
                        orientation="right"
                        stroke="hsl(var(--accent))"
                        tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                     />
                    <Tooltip
                        cursor={true}
                        content={
                            <ChartTooltipContent
                                labelFormatter={(label) => label}
                                formatter={(value, name) => (
                                    <span>
                                        {name === 'price'
                                        ? `${Number(value).toLocaleString('ru-RU', {minimumFractionDigits: 2})} ISK`
                                        : `${Number(value).toLocaleString('ru-RU')} шт.`}
                                    </span>
                                )}
                                itemStyle={{ color: 'inherit' }}
                            />
                        }
                    />
                    <Line type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={2} dot={false} yAxisId="left" name="Цена"/>
                    <Bar dataKey="volume" fill="var(--color-volume)" yAxisId="right" name="Объем" fillOpacity={0.3} />
                </ComposedChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
