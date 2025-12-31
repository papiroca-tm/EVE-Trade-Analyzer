
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
    // Generate random data for display purposes
    const randomData = [];
    let lastClose = 4;
    for (let i = 0; i < 30; i++) {
        const open = lastClose + (Math.random() - 0.5) * 0.2;
        const close = open + (Math.random() - 0.5) * 0.5;
        const high = Math.max(open, close) + Math.random() * 0.3;
        const low = Math.min(open, close) - Math.random() * 0.3;
        lastClose = close;
        
        randomData.push({
            date: `День ${i + 1}`,
            open: Number(open.toFixed(2)),
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            close: Number(close.toFixed(2)),
            body: [Number(open.toFixed(2)), Number(close.toFixed(2))]
        });
    }

    const prices = randomData.flatMap(d => [d.low, d.high]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1;
    
    return {
        data: randomData,
        yDomain: [minPrice - padding, maxPrice + padding]
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <CandlestickChartIcon className="h-6 w-6 text-primary" />
            <CardTitle>График цен (Свечи)</CardTitle>
        </div>
        <CardDescription>
            Дневной диапазон цен. Тело свечи представляет объем торгов за день. (В режиме отладки на случайных данных)
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
