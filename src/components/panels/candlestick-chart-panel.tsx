
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


// Custom shape for the candlestick
const Candle = (props: any) => {
  const { x, y, width, height, payload } = props;
  
  if (!payload || payload.open === undefined || height < 0) {
    return null;
  }
  
  // This helper function maps a price value to a Y coordinate within the chart's space.
  const yValueToCoordinate = (value: number) => {
      const priceRange = payload.high - payload.low;
      if (priceRange === 0) {
          return y + height / 2;
      }
      const valueAsPercentage = (value - payload.low) / priceRange;
      return y + (1 - valueAsPercentage) * height;
  };
  
  const highY = yValueToCoordinate(payload.high);
  const lowY = yValueToCoordinate(payload.low);
  const openY = yValueToCoordinate(payload.open);
  const closeY = yValueToCoordinate(payload.close);

  const isBullish = payload.close >= payload.open;

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
        
        const open = average - bodySize / 2;
        const close = average + bodySize / 2;

        const isBullish = index > 0 ? average > dataForHorizon[index-1].average : true;
        
        return {
            date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            open: Number(isBullish ? open : close),
            close: Number(isBullish ? close : open),
            high: Number(highest),
            low: Number(lowest),
            body: [isBullish ? open : close, isBullish ? close : open]
        }
    });

    const prices = chartData.flatMap(d => [d.low, d.high]).filter(p => p !== undefined && p !== null);
    if (prices.length === 0) {
      return { data: chartData, yDomain: [0, 10]};
    }
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
              <Tooltip 
                 formatter={(value, name, props) => {
                    if (name === 'body' && Array.isArray(value)) {
                       const { payload } = props;
                       return [
                        `Open: ${Number(payload.open).toFixed(2)}`,
                        `High: ${Number(payload.high).toFixed(2)}`,
                        `Low: ${Number(payload.low).toFixed(2)}`,
                        `Close: ${Number(payload.close).toFixed(2)}`,
                       ]
                    }
                    return value;
                 }}
              />
              <Bar dataKey="body" shape={<Candle />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
