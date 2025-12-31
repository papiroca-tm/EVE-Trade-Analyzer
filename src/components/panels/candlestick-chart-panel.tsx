
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
  const { x, y, width, height, low, high, open, close } = props;
  const isBullish = close >= open;
  
  const bodyHeight = Math.abs(y - props.yAxis.getScreenY(open));

  const fill = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
  const stroke = fill;

  return (
    <g>
      {/* Wick */}
      <line x1={x + width / 2} y1={props.yAxis.getScreenY(low)} x2={x + width / 2} y2={props.yAxis.getScreenY(high)} stroke={stroke} strokeWidth={1} />
      {/* Body */}
      <rect x={x} y={isBullish ? y : y - bodyHeight} width={width} height={bodyHeight} fill={fill} />
    </g>
  );
};


export function CandlestickChartPanel({ history }: { history: MarketHistoryItem[] }) {
  const {data, yDomain} = useMemo(() => {
    
    const randomData = generateRandomCandlestickData(90);

    const chartData = randomData.map((item, index) => {
        return {
            date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            ...item,
            // recharts <Bar> will use the higher value of the range for positioning (y prop).
            // For bullish (green) candles, close is higher. For bearish (red), open is higher.
            body: [item.open, item.close]
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
              <Bar dataKey="body" shape={<Candle />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
