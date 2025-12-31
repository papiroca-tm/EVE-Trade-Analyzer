
'use client';
import type { MarketHistoryItem, Recommendation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, ReferenceLine } from 'recharts';
import { useMemo } from 'react';

const Candlestick = (props: any) => {
    const { x, y, width, height, low, high, average, previousAverage } = props;
  
    // Check if necessary props are available
    if (x === undefined || y === undefined || width === undefined || height === undefined || low === undefined || high === undefined || average === undefined) {
      return null;
    }
  
    const isBullish = previousAverage !== undefined ? average > previousAverage : true;
    const color = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
    
    // Y-coordinates are calculated from the top of the container.
    // Recharts gives us the 'y' and 'height' for the 'average' value.
    // We need to calculate the positions for high and low wicks based on the 'average' y-coordinate.
    
    const yRatio = height / average;

    const highWickY = y - ((high - average) * yRatio);
    const lowWickY = y + ((average - low) * yRatio);
    
    // Body can be a small range around the average
    const bodyRange = Math.abs(high - low) * 0.2; // Let body be 20% of the day's range
    const bodyTop = y - (bodyRange/2 * yRatio);
    const bodyBottom = y + (bodyRange/2 * yRatio);
    const bodyHeight = bodyBottom - bodyTop;


    return (
      <g stroke={color} fill={color} strokeWidth={1}>
        {/* Wick */}
        <line x1={x + width / 2} y1={highWickY} x2={x + width / 2} y2={lowWickY} />
        {/* Body */}
        <rect x={x} y={bodyTop} width={width} height={Math.max(1, bodyHeight)} />
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

    let domain: [number | string, number | string] = ['auto', 'auto'];
    if (allPriceValues.length > 0) {
      const minPrice = Math.min(...allPriceValues);
      const maxPrice = Math.max(...allPriceValues);
      const range = maxPrice - minPrice;
      const padding = range * 0.1;

      domain = [
        Math.max(0, Math.floor((minPrice - padding) * 0.98)),
        Math.ceil((maxPrice + padding) * 1.02)
      ];
    }
    
    return { chartData: dataForHorizon, yDomainPrice: domain };

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
        <div className="h-[36rem] w-full">
            <ResponsiveContainer width="100%" height="45%">
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
            <ResponsiveContainer width="100%" height="30%">
                <ComposedChart
                  data={chartData}
                  syncId="marketData"
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                  <XAxis dataKey="date" hide={true} />
                  <YAxis 
                    yAxisId="left" 
                    domain={yDomainPrice}
                    hide={true} 
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
                    <Tooltip content={<CustomTooltip />} />
                    <XAxis dataKey="date" hide={true} tickLine={false} axisLine={false} />
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Bar dataKey="Объем" fill="hsl(var(--accent))" fillOpacity={0.4} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

    