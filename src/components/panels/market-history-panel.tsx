
'use client';
import type { MarketHistoryItem, Recommendation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, ReferenceLine } from 'recharts';
import { useMemo } from 'react';

const Candlestick = (props: any) => {
    const { x, y, width, height, low, high, average, previousAverage } = props;
  
    if ([x, y, width, height, low, high, average].some(val => val === undefined || val === null)) {
      return null;
    }
  
    const isBullish = previousAverage !== undefined ? average > previousAverage : true;
    const color = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
    
    // This is a simplified representation. A real candlestick would need access 
    // to the y-axis scale to properly position high and low wicks.
    // Recharts doesn't easily provide this to custom bar shapes.
    // So we'll represent the body as a small part of the bar's height.
    const bodyHeight = Math.max(2, height * 0.3);
    const bodyY = y + (height - bodyHeight) / 2;

    const wickY1 = y;
    const wickY2 = y + height;
    const wickX = x + width / 2;

    return (
      <g stroke={color} fill={color} strokeWidth={1}>
        {/* Wick */}
        <line x1={wickX} y1={wickY1} x2={wickX} y2={wickY2} />
        {/* Body */}
        <rect x={x} y={bodyY} width={width} height={bodyHeight} />
      </g>
    );
};


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
    
    const calculateSMA = (data: MarketHistoryItem[], period: number) => {
        return data.map((_item, index, arr) => {
            if (index < period - 1) return null;
            const slice = arr.slice(index - period + 1, index + 1);
            if (slice.length < period) return null;
            const sum = slice.reduce((acc, val) => acc + val.average, 0);
            return sum / period;
        });
    };
    const sma7 = calculateSMA(chronologicalHistory, 7);
    const sma30 = calculateSMA(chronologicalHistory, 30);

    const fullChartData = chronologicalHistory.map((item, index) => ({
      date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      fullDate: new Date(item.date).toLocaleDateString('ru-RU'),
      'Цена': item.average,
      'Объем': item.volume,
      'SMA 7': sma7[index],
      'SMA 30': sma30[index],
      low: item.lowest,
      high: item.highest,
      average: item.average,
      previousAverage: index > 0 ? chronologicalHistory[index-1].average : undefined,
    }));

    const dataForHorizon = fullChartData.slice(-timeHorizonDays);

    const allPriceValues = dataForHorizon.flatMap(d => [d.high, d.low, d['SMA 7'], d['SMA 30']]).filter(v => v != null) as number[];

    let priceDomain: [number | string, number | string] = ['auto', 'auto'];
    if (allPriceValues.length > 0) {
      const minPrice = Math.min(...allPriceValues);
      const maxPrice = Math.max(...allPriceValues);
      const range = maxPrice - minPrice;
      const padding = range * 0.1;

      priceDomain = [
        Math.max(0, Math.floor((minPrice - padding) * 0.98)),
        Math.ceil((maxPrice + padding) * 1.02)
      ];
    }
    
    return { chartData: dataForHorizon, yDomainPrice: priceDomain };

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
                Средняя
              </span>
              <span className="font-bold" style={{ color: 'hsl(var(--primary))' }}>
                {data.Цена.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ISK
              </span>
            </div>}
             {data.high && <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Макс.
              </span>
              <span className="font-bold">
                {data.high.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
              </span>
            </div>}
            {data.low && <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Мин.
              </span>
              <span className="font-bold">
                {data.low.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
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
            Средняя цена и объем торгов за последние {chartData.length} дней.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[48rem] w-full">
            <ResponsiveContainer width="100%" height="40%">
                <ComposedChart
                    data={chartData} 
                    syncId="marketData"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                    <Tooltip content={<CustomTooltip />} />
                    <XAxis dataKey="date" hide/>
                    <YAxis 
                        yAxisId="left" 
                        orientation="left"
                        domain={yDomainPrice} 
                        tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString('ru-RU') : ''}
                        tickLine={false}
                        axisLine={false}
                        hide={true}
                    />

                    {/* Average price line */}
                    <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="Цена" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2} 
                        dot={false}
                    />
                    <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="SMA 7" 
                        stroke="hsl(var(--chart-4))" 
                        strokeWidth={1.5} 
                        strokeDasharray="3 3"
                        dot={false}
                        connectNulls
                    />
                    <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="SMA 30" 
                        stroke="hsl(var(--chart-5))" 
                        strokeWidth={1.5} 
                        strokeDasharray="8 4"
                        dot={false}
                        connectNulls
                    />
                    {recommendationLines && (
                      <>
                        <ReferenceLine yAxisId="left" y={recommendationLines.buy} label={{ value: "Реком. покупка", position: 'insideTopLeft', fill: 'hsl(var(--chart-2))' }} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" />
                        <ReferenceLine yAxisId="left" y={recommendationLines.sell} label={{ value: "Реком. продажа", position: 'insideBottomLeft', fill: 'hsl(var(--destructive))' }} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                      </>
                    )}
                </ComposedChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="35%">
                <ComposedChart
                  data={chartData}
                  syncId="marketData"
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                  <XAxis dataKey="date" hide={true} />
                  <YAxis 
                    yAxisId="left"
                    orientation="right"
                    domain={yDomainPrice}
                    tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString('ru-RU') : ''}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    yAxisId="left"
                    dataKey="average"
                    shape={<Candlestick />}
                    barSize={10}
                  />
                </ComposedChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="25%">
                <BarChart 
                    data={chartData}
                    syncId="marketData"
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                    <Tooltip content={<CustomTooltip />} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Bar dataKey="Объем" fill="hsl(var(--accent))" fillOpacity={0.4} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
