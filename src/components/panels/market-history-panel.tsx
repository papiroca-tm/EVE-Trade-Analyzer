
'use client';
import type { MarketHistoryItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, BarChart, Bar, YAxis } from 'recharts';
import { useMemo } from 'react';


export function MarketHistoryPanel({ 
    history,
    timeHorizonDays,
}: { 
    history: MarketHistoryItem[],
    timeHorizonDays: number,
}) {
    
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    // Reverse once to get chronological order for calculations
    const chronologicalHistory = [...history].reverse();

    const calculateSMA = (data: MarketHistoryItem[], period: number) => {
        return data.map((_item, index, arr) => {
            if (index < period - 1) return null; // Not enough data for SMA
            const slice = arr.slice(index - period + 1, index + 1);
            const sum = slice.reduce((acc, val) => acc + val.average, 0);
            return sum / period;
        });
    };

    const sma7 = calculateSMA(chronologicalHistory, 7);
    const sma30 = calculateSMA(chronologicalHistory, 30);

    const fullChartData = chronologicalHistory.map((item, index) => ({
      date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      fullDate: new Date(item.date).toLocaleDateString('ru-RU'),
      Цена: item.average,
      Объем: item.volume,
      'SMA 7': sma7[index],
      'SMA 30': sma30[index],
    }));
    
    // Slice the data for display *after* calculations are done
    return fullChartData.slice(-timeHorizonDays);

  }, [history, timeHorizonDays]);

  const yDomainPrice = useMemo(() => {
      if (!chartData || chartData.length === 0) return [0, 0];
      const prices = chartData.map(p => p.Цена);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = max - min;
      
      const padding = range === 0 ? max * 0.1 : range * 0.1;
      
      return [min - padding, max + padding];
  }, [chartData]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pricePayload = payload.find(p => p.dataKey === 'Цена');
      const volumePayload = payload.find(p => p.dataKey === 'Объем');
      const sma7Payload = payload.find(p => p.dataKey === 'SMA 7');
      const sma30Payload = payload.find(p => p.dataKey === 'SMA 30');
      const data = payload[0].payload;

      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex flex-col space-y-1 col-span-2">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Дата
              </span>
              <span className="font-bold text-muted-foreground">
                {data.fullDate}
              </span>
            </div>
            
            {pricePayload && <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Цена
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--primary))' }}>
                {pricePayload.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ISK
              </span>
            </div>}
            {volumePayload && <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Объем
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--accent))' }}>
                {volumePayload.value.toLocaleString('ru-RU')}
              </span>
            </div>}
            {sma7Payload && sma7Payload.value && <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                SMA 7
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--chart-4))' }}>
                {sma7Payload.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
              </span>
            </div>}
            {sma30Payload && sma30Payload.value && <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                SMA 30
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--chart-5))' }}>
                {sma30Payload.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
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
            Цена, объем торгов и скользящие средние (SMA) за последние {chartData.length} дней.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
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
                        dataKey="SMA 7" 
                        stroke="hsl(var(--chart-4))" 
                        strokeWidth={1.5} 
                        strokeDasharray="3 3"
                        dot={false}
                        connectNulls
                    />
                    <Line 
                        type="monotone" 
                        dataKey="SMA 30" 
                        stroke="hsl(var(--chart-5))" 
                        strokeWidth={1.5} 
                        strokeDasharray="8 4"
                        dot={false}
                        connectNulls
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
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Bar dataKey="Объем" fill="hsl(var(--accent))" fillOpacity={0.4} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
