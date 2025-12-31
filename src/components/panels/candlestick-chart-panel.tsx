
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';

// Function to generate random but realistic stock data
const generateRandomCandlestickData = (count: number) => {
  const data = [];
  let lastClose = Math.random() * 2 + 3; // Start between 3 and 5

  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (count - i));
    
    const open = lastClose;
    const close = open + (Math.random() - 0.5) * 0.5;
    const high = Math.max(open, close) + Math.random() * 0.3;
    const low = Math.min(open, close) - Math.random() * 0.3;
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Number(open.toFixed(4)),
      close: Number(close.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
    });
    
    lastClose = close;
  }
  return data;
};


// Custom shape for the candlestick
const Candle = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, high, low, close } = payload;
  const isBullish = close >= open;

  const fill = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
  const stroke = fill;

  // This helper function maps a price value to a Y coordinate within the bar's space.
  // It uses the payload's high/low and the chart's y/height props to do the mapping.
  const yValueToCoordinate = (value: number) => {
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

  return (
    <g>
      {/* Wick */}
      <line x1={x + width / 2} y1={highY} x2={x + width / 2} y2={lowY} stroke={stroke} strokeWidth={1} />
      {/* Body */}
      <rect x={x} y={bodyY} width={width} height={bodyHeight} fill={fill} />
    </g>
  );
};


export function CandlestickChartPanel({ history }: { history: MarketHistoryItem[] }) {
  const {data, yDomain} = useMemo(() => {
    
    const randomData = generateRandomCandlestickData(90);

    const chartData = randomData.map((item) => {
        return {
            date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            ...item,
            // For recharts <Bar>, the dataKey determines the 'y' prop for the shape.
            // We need to provide a range for the bar to occupy space.
            // Here, we'll use [low, high] so the bar's shape can access the full range.
            range: [item.low, item.high]
        }
    });

    const prices = chartData.flatMap(d => [d.low, d.high]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1;
    
    return {
        data: chartData,
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
            Дневной диапазон цен (open, high, low, close).
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
              <Bar dataKey="range" shape={<Candle />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
