
'use client';
import type { MarketHistoryItem, Recommendation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useMemo } from 'react';


export function MarketHistoryPanel({ 
    history,
    timeHorizonDays,
    recommendations,
}: { 
    history: MarketHistoryItem[],
    timeHorizonDays: number,
    recommendations: Recommendation[]
}) {
    
  const recommendationLines = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return null;
    const rec = recommendations[0];
    const avgBuyPrice = (rec.buyPriceRange.min + rec.buyPriceRange.max) / 2;
    const avgSellPrice = (rec.sellPriceRange.min + rec.sellPriceRange.max) / 2;

    return {
      buy: avgBuyPrice,
      sell: avgSellPrice,
    };
  }, [recommendations]);

  const { chartData, yDomainPrice } = useMemo(() => {
    const chronologicalHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const dataForHorizon = chronologicalHistory.slice(-timeHorizonDays);

    const calculateSMA = (data: MarketHistoryItem[], period: number) => {
        return data.map((_item, index, arr) => {
            if (index < period - 1) return null;
            
            const slice = arr.slice(index - period + 1, index + 1);
            if (slice.length < period) return null;

            const sum = slice.reduce((acc, val) => acc + val.average, 0);
            return sum / period;
        });
    };
    
    // Рассчитываем SMA на основе полных данных, но будем использовать только для нужного горизонта
    const sma7 = calculateSMA(chronologicalHistory, 7);
    const sma30 = calculateSMA(chronologicalHistory, 30);


    const fullChartData = chronologicalHistory.map((item, index) => ({
      date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      fullDate: new Date(item.date).toLocaleDateString('ru-RU'),
      'Цена': item.average,
      'Объем': item.volume,
      'SMA 7': sma7[index],
      'SMA 30': sma30[index],
    }));

    const chartData = fullChartData.slice(-timeHorizonDays);

    const allPriceValues = chartData.flatMap(d => [d['Цена'], d['SMA 7'], d['SMA 30']]).filter(v => v != null) as number[];

    let domain: [number | string, number | string] = ['auto', 'auto'];
    if (allPriceValues.length > 0) {
      const minPrice = Math.min(...allPriceValues);
      const maxPrice = Math.max(...allPriceValues);
      const range = maxPrice - minPrice;
      const padding = range * 0.1;

      domain = [
        Math.max(0, Math.floor(minPrice - padding)),
        Math.ceil(maxPrice + padding)
      ];
    }
    
    return { chartData, yDomainPrice: domain };

  }, [history, timeHorizonDays]);
  
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
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
            
            {data.Цена && <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Цена
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--primary))' }}>
                {data.Цена.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ISK
              </span>
            </div>}
            {data.Объем && <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Объем
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--accent))' }}>
                {data.Объем.toLocaleString('ru-RU')}
              </span>
            </div>}
            {data['SMA 7'] && <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                SMA 7
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--chart-4))' }}>
                {data['SMA 7'].toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
              </span>
            </div>}
            {data['SMA 30'] && <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                SMA 30
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--chart-5))' }}>
                {data['SMA 30'].toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
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
                    <XAxis dataKey="date" hide/>
                    <YAxis yAxisId="0" domain={yDomainPrice} tick={false} axisLine={false} width={0} />
                    
                    <Line 
                        yAxisId="0"
                        type="monotone" 
                        dataKey="Цена" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2} 
                        dot={false}
                    />
                    <Line 
                        yAxisId="0"
                        type="monotone" 
                        dataKey="SMA 7" 
                        stroke="hsl(var(--chart-4))" 
                        strokeWidth={1.5} 
                        strokeDasharray="3 3"
                        dot={false}
                        connectNulls
                    />
                    <Line 
                        yAxisId="0"
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
                    <XAxis dataKey="date" />
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Bar dataKey="Объем" fill="hsl(var(--accent))" fillOpacity={0.4} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
