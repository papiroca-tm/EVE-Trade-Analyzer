
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';

// Custom shape for the candlestick
const Candle = (props: any) => {
  const { x, y, width, height, payload, yAxis } = props;
  
  if (!yAxis || typeof yAxis.scale !== 'function' || !payload) {
    return null;
  }

  const { high, low, open, close, color } = payload;
  
  const wickHighY = yAxis.scale(high);
  const wickLowY = yAxis.scale(low);
  
  const bodyTopY = yAxis.scale(Math.max(open, close));
  const bodyBottomY = yAxis.scale(Math.min(open, close));
  const bodyHeight = Math.max(1, Math.abs(bodyTopY - bodyBottomY));
  
  const fillColor = color;
  const strokeColor = color;

  return (
    <g>
      {/* Wick */}
      <line x1={x + width / 2} y1={wickLowY} x2={x + width / 2} y2={wickHighY} stroke={strokeColor} strokeWidth="1" />
      {/* Body */}
      <rect x={x} y={bodyTopY} width={width} height={bodyHeight} fill={fillColor} />
    </g>
  );
};


export function CandlestickChartPanel({ history }: { history: MarketHistoryItem[] }) {
  const {data, yDomain} = useMemo(() => {
    if (!history || history.length === 0) {
      return { data: [], yDomain: [0, 100]};
    }
    
    // Find min/max volume for the whole period
    const volumes = history.map(h => h.volume);
    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes);
    const volumeRange = maxVolume - minVolume;

    const chartData = history.map((histItem, index) => {
        const { highest, lowest, average, volume } = histItem;
        
        const volumePercentage = volumeRange > 0 ? (volume - minVolume) / volumeRange : 1;
        const dayPriceRange = highest - lowest;
        const bodySize = dayPriceRange * volumePercentage;

        const prevAverage = index > 0 ? history[index-1].average : average;
        const color = average >= prevAverage ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';

        let open, close;
        
        // Center the body around the average price
        open = average - bodySize / 2;
        close = average + bodySize / 2;

        return {
            date: new Date(histItem.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            high: Number(highest.toFixed(4)),
            low: Number(lowest.toFixed(4)),
            open: Number(open.toFixed(4)),
            close: Number(close.toFixed(4)),
            color: color,
            body: [Number(open.toFixed(4)), Number(close.toFixed(4))],
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
            <CandlestickChartIcon className="h-6 w-6 text-primary" />
            <CardTitle>График цен (Свечи)</CardTitle>
        </div>
        <CardDescription>
            Дневной диапазон цен. Тело свечи представляет объем торгов.
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
