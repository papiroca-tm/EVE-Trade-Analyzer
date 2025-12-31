'use client';
import type { MarketHistoryItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, BarChart, Bar, YAxis } from 'recharts';
import { useMemo } from 'react';


export function MarketHistoryPanel({ 
    history,
}: { 
    history: MarketHistoryItem[],
}) {
    
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    const data = history.map((item, index) => ({
      date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      fullDate: new Date(item.date).toLocaleDateString('ru-RU'),
      Цена: item.average,
      Объем: item.volume,
      index: history.length - 1 - index, // For trend calculation, index starts from 0 for oldest date
    })).reverse();

    if (data.length < 2) return data;

    // Linear regression for trend line
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = data.length;
    data.forEach(p => {
        sumX += p.index;
        sumY += p.Цена;
        sumXY += p.index * p.Цена;
        sumX2 += p.index * p.index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map(p => ({
        ...p,
        'Линия тренда': slope * p.index + intercept,
    }));
  }, [history]);

  const yDomainPrice = useMemo(() => {
      if (!chartData || chartData.length === 0) return [0, 0];
      const prices = chartData.map(p => p.Цена);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = max - min;
      
      // Ensure padding is not zero if all prices are the same
      const padding = range === 0 ? max * 0.1 : range * 0.1;
      
      return [min - padding, max + padding];
  }, [chartData]);
  
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
                    <Tooltip content={<CustomTooltip />} />
                    <YAxis domain={yDomainPrice} hide />
                    <Line 
                        type="monotone" 
                        dataKey="Цена" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2} 
                        dot={false}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="Линия тренда" 
                        stroke="hsl(var(--foreground))" 
                        strokeWidth={1} 
                        strokeDasharray="5 5"
                        dot={false}
                    />
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
