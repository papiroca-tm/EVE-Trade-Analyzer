
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';

// Function to generate random but realistic stock data
const generateCandlestickData = (count: number) => {
  let lastClose = 100;
  const data = [];
  for (let i = 0; i < count; i++) {
    const open = lastClose + (Math.random() - 0.5) * 5;
    const close = open + (Math.random() - 0.5) * 8;
    const high = Math.max(open, close) + Math.random() * 4;
    const low = Math.min(open, close) - Math.random() * 4;
    const date = new Date();
    date.setDate(date.getDate() + i - count);
    data.push({
      date: date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });
    lastClose = close;
  }
  return data;
};

// Custom shape for the candlestick
const Candle = (props: any) => {
  const { x, y, width, height, low, high, open, close } = props;
  const isGrowing = open < close;
  const color = isGrowing ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
  
  // This logic is tricky. Recharts gives us the `y` and `height` for the main bar value.
  // We need to draw the wick based on high/low and the body based on open/close.
  // For this random data, `open` is the primary value for the bar.
  // The y prop corresponds to the top of the bar for the `open` value.
  
  // The body of the candle
  const bodyHeight = Math.abs(y - (y - open + close));
  const bodyY = isGrowing ? (y - open + close) : y;
  
  // The wick of the candle
  const wickHighY = y - open + high;
  const wickLowY = y - open + low;

  return (
    <g>
      {/* Wick */}
      <line x1={x + width / 2} y1={wickLowY} x2={x + width / 2} y2={wickHighY} stroke={color} strokeWidth="1" />
      {/* Body */}
      <rect x={x} y={bodyY} width={width} height={bodyHeight} fill={color} />
    </g>
  );
};


export function CandlestickChartPanel({ history }: { history: MarketHistoryItem[] }) {
  const {data, yDomain} = useMemo(() => {
    // For now, we are still using the random data as requested.
    // The real `history` data is available but not yet used.
    const chartData = generateCandlestickData(90);
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
            <CandlestickChart className="h-6 w-6 text-primary" />
            <CardTitle>Классический свечной график (Пример)</CardTitle>
        </div>
        <CardDescription>
            Пример классического японского свечного графика со случайными данными.
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
                tickFormatter={(value) => typeof value === 'number' ? value.toFixed(0) : ''}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              <Bar dataKey="open" shape={<Candle />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
