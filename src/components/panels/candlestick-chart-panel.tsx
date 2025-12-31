
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


// Custom shape for the candlestick
const Candle = (props: any) => {
  const { x, y, width, height, payload } = props;
  
  if (!payload || payload.open === undefined) {
    return null;
  }
  
  const { open, high, low, close } = payload;
  const isBullish = close >= open;

  // This helper function maps a price value to a Y coordinate within the bar's space.
  const yValueToCoordinate = (value: number) => {
    // The payload contains the full range of data for this point.
    // The y and height props are for the entire bar space given by recharts.
    // We can create a ratio and map it.
    const domainRange = payload.high - payload.low;
    // Handle case where high and low are the same to avoid division by zero
    if (domainRange === 0) {
      return y + height / 2;
    }
    const valueRatio = (value - payload.low) / domainRange;
    // The Y-axis is inverted in SVG (0 is at the top), so we subtract from the bottom.
    return y + (1 - valueRatio) * height;
  };
  
  const highY = yValueToCoordinate(high);
  const lowY = yValueToCoordinate(low);
  const openY = yValueToCoordinate(open);
  const closeY = yValueToCoordinate(close);

  const bodyY = Math.min(openY, closeY);
  const bodyHeight = Math.max(1, Math.abs(openY - closeY)); // Ensure body is at least 1px to be visible
  
  const fill = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
  const stroke = fill;

  return (
    <g>
      {/* Wick */}
      <line x1={x + width / 2} y1={highY} x2={x + width / 2} y2={lowY} stroke={stroke} strokeWidth={1} />
      {/* Body */}
      <rect x={x} y={bodyY} width={width} height={bodyHeight} fill={fill} />
    </g>
  );
};


export function CandlestickChartPanel({ history, timeHorizonDays }: { history: MarketHistoryItem[], timeHorizonDays: number }) {
  const {data, yDomain} = useMemo(() => {
     if (!history || history.length === 0) {
      return { data: [], yDomain: [0, 10] };
    }
    
    const dataForHorizon = history.slice(-timeHorizonDays);

    const volumes = dataForHorizon.map(h => h.volume);
    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes);
    const volumeRange = maxVolume - minVolume;

    const chartData = dataForHorizon.map((item, index) => {
        const { lowest, highest, volume, average } = item;

        const volumePercentage = volumeRange > 0 ? (volume - minVolume) / volumeRange : 0;
        const priceRange = highest - lowest;
        const bodySize = priceRange * volumePercentage;
        
        const midPoint = (highest + lowest) / 2;
        const open = midPoint - bodySize / 2;
        const close = midPoint + bodySize / 2;

        const isBullish = index > 0 ? average > dataForHorizon[index-1].average : true;
        
        return {
            date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            open: Number(isBullish ? open : close).toFixed(4),
            close: Number(isBullish ? close : open).toFixed(4),
            high: Number(highest.toFixed(4)),
            low: Number(lowest.toFixed(4)),
            body: [open, close] // dataKey for the Bar
        }
    });

    const prices = chartData.flatMap(d => [d.low, d.high]);
    const minPrice = Math.min(...prices.map(p => Number(p)));
    const maxPrice = Math.max(...prices.map(p => Number(p)));
    const padding = (maxPrice - minPrice) * 0.1;
    
    return {
        data: chartData,
        yDomain: [minPrice - padding, maxPrice + padding]
    };
  }, [history, timeHorizonDays]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <CandlestickChartIcon className="h-6 w-6 text-primary" />
            <CardTitle>График цен (Свечи)</CardTitle>
        </div>
        <CardDescription>
            Дневной диапазон цен. Тело свечи представляет объем торгов за день.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis 
                orientation="right" 
                domain={yDomain} 
                tickFormatter={(value) => typeof value === 'number' ? value.toFixed(2) : ''}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              <Bar dataKey="body" shape={<Candle />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
