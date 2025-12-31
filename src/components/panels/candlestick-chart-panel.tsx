
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


// Custom shape for the candlestick wick
const Candle = (props: any) => {
  const { x, width, low, high, yAxis } = props;
  
  if (!yAxis || typeof yAxis.scale !== 'function' || high === undefined || low === undefined) {
    return null;
  }

  const wickHighY = yAxis.scale(high);
  const wickLowY = yAxis.scale(low);
  const color = 'hsl(var(--foreground) / 0.5)';

  return (
    <g>
      {/* Wick */}
      <line x1={x + width / 2} y1={wickLowY} x2={x + width / 2} y2={wickHighY} stroke={color} strokeWidth="1" />
    </g>
  );
};


export function CandlestickChartPanel({ history }: { history: MarketHistoryItem[] }) {
  const {data, yDomain} = useMemo(() => {
    
    const chartData = history.map((histItem) => {
        return {
            date: new Date(histItem.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            high: histItem.highest,
            low: histItem.lowest,
        }
    });

    const prices = history.flatMap(d => [d.lowest, d.highest]);
    if (prices.length === 0) {
        return { data: [], yDomain: [0, 100] };
    }
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1;
    return {
        data: chartData,
        yDomain: [minPrice - padding, maxPrice + padding]
    };
  }, [history]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <CandlestickChart className="h-6 w-6 text-primary" />
            <CardTitle>Диапазон цен (Low-High)</CardTitle>
        </div>
        <CardDescription>
            Вертикальные линии показывают полный диапазон цен (от min до max) за каждый день.
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
              <Bar dataKey="low" shape={<Candle />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
