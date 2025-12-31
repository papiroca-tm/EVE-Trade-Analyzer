
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


// Custom shape for the candlestick
const Candle = (props: any) => {
  const { x, y, width, height, low, high, open, close } = props;
  const isBullish = close >= open;
  const fill = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
  const stroke = fill;

  const wickY1 = y + height * (high - Math.max(open, close)) / (high - low);
  const wickY2 = y + height * (high - Math.min(open, close)) / (high - low);
  
  const bodyHeight = Math.max(1, height * Math.abs(open-close) / (high-low));
  
  return (
    <g>
      {/* Wick */}
      <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + height} stroke={stroke} strokeWidth={1} />
      {/* Body */}
      <rect x={x} y={isBullish ? wickY2 : wickY1} width={width} height={bodyHeight} fill={fill} />
    </g>
  );
};


export function CandlestickChartPanel({ history, timeHorizonDays }: { history: MarketHistoryItem[], timeHorizonDays: number }) {
  const {data, yDomain} = useMemo(() => {
    // Generate random data for display purposes
    const randomData = [];
    let lastClose = 4;
    for (let i = 0; i < 90; i++) {
        const open = Number((lastClose + (Math.random() - 0.5) * 0.2).toFixed(2));
        const close = Number((open + (Math.random() - 0.5) * 0.5).toFixed(2));
        const high = Number((Math.max(open, close) + Math.random() * 0.3).toFixed(2));
        const low = Number((Math.min(open, close) - Math.random() * 0.3).toFixed(2));
        lastClose = close;
        
        if (low > 3 && high < 5) {
             randomData.push({
                date: `День ${i + 1}`,
                open: open,
                high: high,
                low: low,
                close: close,
                body: [low, high]
            });
        }
    }

    const prices = randomData.flatMap(d => [d.low, d.high]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1;
    
    return {
        data: randomData,
        yDomain: [Math.max(0, minPrice - padding), maxPrice + padding]
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
                    const { payload } = props;
                    if (name === 'body' && Array.isArray(value)) {
                       return [
                        `Open: ${Number(payload.open).toFixed(2)}`,
                        `High: ${Number(payload.high).toFixed(2)}`,
                        `Low: ${Number(payload.low).toFixed(2)}`,
                        `Close: ${Number(payload.close).toFixed(2)}`,
                       ]
                    }
                    return value;
                 }}
                 labelFormatter={(label) => `Дата: ${label}`}
              />
              <Bar dataKey="body" shape={<Candle />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
