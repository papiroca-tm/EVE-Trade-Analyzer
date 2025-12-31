'use client';
import type { MarketHistoryItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, BarChart, Bar } from 'recharts';
import { useMemo } from 'react';

// Helper function for linear regression
function calculateTrendLine(data: { index: number; price: number }[]) {
    const n = data.length;
    if (n < 2) return [];

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const point of data) {
        sumX += point.index;
        sumY += point.price;
        sumXY += point.index * point.price;
        sumX2 += point.index * point.index;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map(point => ({
        ...point,
        trend: slope * point.index + intercept,
    }));
}


export function MarketHistoryPanel({ 
    history,
}: { 
    history: MarketHistoryItem[],
}) {
    
  const chartData = useMemo(() => {
    const baseData = history.map((item, index) => ({
      date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      fullDate: new Date(item.date).toLocaleDateString('ru-RU'),
      Цена: item.average,
      Объем: item.volume,
      index: index, // for trend calculation
    })).reverse();
    
    const priceData = baseData.map(d => ({ index: d.index, price: d.Цена }));
    const trendData = calculateTrendLine(priceData);

    return baseData.map((d, i) => ({
        ...d,
        trend: trendData[i]?.trend
    }));

  }, [history]);
  
  const yDomainPrice = useMemo(() => {
      if (chartData.length === 0) return [0, 0];
      const prices = chartData.map(p => p.Цена);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const padding = (max - min) * 0.1;
      return [min - padding, max + padding];
  }, [chartData])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pricePayload = payload.find(p => p.dataKey === 'Цена');
      const volumePayload = payload.find(p => p.dataKey === 'Объем');
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
            {pricePayload && <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Цена
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--primary))' }}>
                {pricePayload.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ISK
              </span>
            </div>}
            {volumePayload && <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Объем
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--accent))' }}>
                {volumePayload.value.toLocaleString('ru-RU')}
              </span>
            </div>}
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
            Цена и объем торгов за последние {history.length} дней. Линия тренда показывает общее направление цены.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="70%">
                <LineChart 
                    data={chartData} 
                    syncId="marketData"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    yAxisId="left"
                    domain={yDomainPrice}
                >
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Цена" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} yAxisId="left" />
                    <Line type="monotone" dataKey="trend" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="5 5" dot={false} yAxisId="left" />
                </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="30%">
                <BarChart 
                    data={chartData}
                    syncId="marketData"
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Объем" fill="hsl(var(--accent))" fillOpacity={0.4} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
