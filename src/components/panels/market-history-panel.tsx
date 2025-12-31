'use client';
import type { MarketHistoryItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

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
  
  const chartConfig = {
    Цена: {
      label: 'Цена',
      color: 'hsl(var(--primary))',
    },
    Объем: {
      label: 'Объем',
      color: 'hsl(var(--accent))',
    },
  };
  
  const yDomainPrice = () => {
      const prices = chartData.map(p => p.Цена);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const padding = (max - min) * 0.1;
      return [min - padding, max + padding];
  }

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
        <ChartContainer config={chartConfig} className="h-80 w-full">
            <ResponsiveContainer>
                <div>
                    <ResponsiveContainer width="100%" height="70%">
                       <LineChart 
                            data={chartData} 
                            syncId="marketData"
                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <YAxis
                                dataKey="Цена"
                                stroke="hsl(var(--primary))"
                                tickFormatter={(value) => `₽${(value / 1000).toFixed(1)}k`}
                                domain={yDomainPrice()}
                                width={80}
                            />
                            <Tooltip
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(label, payload) => payload?.[0]?.payload.fullDate ?? label}
                                        formatter={(value, name) => (
                                            <div className='flex justify-between w-32'>
                                                <span>{name}</span>
                                                <span className='font-bold'>{name === 'Цена'
                                                ? `${Number(value).toLocaleString('ru-RU', {minimumFractionDigits: 2})} ISK`
                                                : `${Number(value).toLocaleString('ru-RU')} шт.`}</span>
                                            </div>
                                        )}
                                        itemStyle={{ color: 'inherit' }}
                                    />
                                }
                            />
                            <Line type="monotone" dataKey="Цена" stroke="var(--color-Цена)" strokeWidth={2} dot={false} />
                       </LineChart>
                    </ResponsiveContainer>
                    <ResponsiveContainer width="100%" height="30%">
                        <BarChart 
                            data={chartData} 
                            syncId="marketData"
                            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                        >
                             <CartesianGrid vertical={false} strokeDasharray="3 3" />
                             <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
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
                             <Tooltip
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(label, payload) => payload?.[0]?.payload.fullDate ?? label}
                                        formatter={(value, name) => (
                                            <div className='flex justify-between w-32'>
                                                <span>{name}</span>
                                                <span className='font-bold'>{name === 'Цена'
                                                ? `${Number(value).toLocaleString('ru-RU', {minimumFractionDigits: 2})} ISK`
                                                : `${Number(value).toLocaleString('ru-RU')} шт.`}</span>
                                            </div>
                                        )}
                                        itemStyle={{ color: 'inherit' }}
                                    />
                                }
                            />
                            <Bar dataKey="Объем" fill="var(--color-Объем)" fillOpacity={0.4} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
