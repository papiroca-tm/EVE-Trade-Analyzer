
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


// Custom shape for the candlestick. THIS CODE SHOULD NOT BE MODIFIED.
const Candle = (props: any) => {
  const { x, y, width, height, low, high, open, close, yAxis } = props;
  
  const isBullish = close >= open;
  const fill = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
  const stroke = fill;

  if (!yAxis) {
    // Render nothing if yAxis is not available to prevent crashes
    return null;
  }
  
  const yValueToCoordinate = (value: number) => {
    // This function maps a data value (like a price) to its SVG y-coordinate.
    return yAxis.scale(value);
  };
  
  const highY = yValueToCoordinate(high);
  const lowY = yValueToCoordinate(low);
  const openY = yValueToCoordinate(open);
  const closeY = yValueToCoordinate(close);

  const bodyHeight = Math.max(1, Math.abs(openY - closeY));
  const bodyY = Math.min(openY, closeY);

  return (
    <g>
      {/* Wick */}
      <line x1={x + width / 2} y1={highY} x2={x + width / 2} y2={lowY} stroke={stroke} strokeWidth={1} />
      {/* Body */}
      <rect x={x} y={bodyY} width={width} height={bodyHeight} fill={fill} />
    </g>
  );
};


/**
 * Transforms historical EVE Online market data into a OHLC format for candlestick chart.
 * - Wicks (shadows) represent the highest and lowest price of the day.
 * - Body represents the change in average price from the previous day to the current day.
 * @param history - An array of market history items, sorted chronologically.
 * @returns An array of data points formatted for a candlestick chart.
 */
function transformHistoryForCandlestick(history: MarketHistoryItem[]) {
  if (history.length < 2) {
    return [];
  }

  const candlestickData = [];
  // Start from the second day to have a "previous day" for the 'open' price
  for (let i = 1; i < history.length; i++) {
    const currentDay = history[i];
    const previousDay = history[i - 1];

    candlestickData.push({
      date: new Date(currentDay.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      fullDate: new Date(currentDay.date).toLocaleDateString('ru-RU'),
      open: previousDay.average,
      close: currentDay.average,
      high: currentDay.highest,
      low: currentDay.lowest,
    });
  }

  return candlestickData;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
             <div className="flex flex-col space-y-0 col-span-2">
                <span className="text-[0.65rem] uppercase text-muted-foreground">
                    Дата
                </span>
                <span className="font-bold text-muted-foreground">
                    {data.fullDate}
                </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.65rem] uppercase text-muted-foreground">
                МАКС.
              </span>
              <span className="font-bold">
                {data.high.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
              </span>
            </div>
             <div className="flex flex-col">
              <span className="text-[0.65rem] uppercase text-muted-foreground">
                МИН.
              </span>
              <span className="font-bold">
                {data.low.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
              </span>
            </div>
             <div className="flex flex-col">
              <span className="text-[0.65rem] uppercase text-muted-foreground">
                ОТКР. (ср. цена пред. дня)
              </span>
              <span className="font-bold">
                {data.open.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.65rem] uppercase text-muted-foreground">
                ЗАКР. (ср. цена тек. дня)
              </span>
              <span className="font-bold">
                {data.close.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      );
    }
  
    return null;
};


export function CandlestickChartPanel({ history, timeHorizonDays }: { history: MarketHistoryItem[], timeHorizonDays: number }) {
  
  const { data, yDomain } = useMemo(() => {
    const fullChartData = transformHistoryForCandlestick(history);
    const chartData = fullChartData.slice(-timeHorizonDays);
    
    let domain: [number, number] = [0, 0];
    if (chartData.length > 0) {
        const min = Math.min(...chartData.map(d => d.low));
        const max = Math.max(...chartData.map(d => d.high));
        const padding = (max - min) * 0.1;
        domain = [Math.max(0, min - padding), max + padding];
    }

    return { data: chartData, yDomain: domain };
  }, [history, timeHorizonDays]);


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <CandlestickChartIcon className="h-5 w-5 text-primary" />
            <CardTitle>График цен (свечи)</CardTitle>
        </div>
        <CardDescription>
            Тени свечей показывают мин./макс. цену дня. Тело свечи показывает изменение средней цены по отношению к предыдущему дню.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 5, right: 20, left: 5, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <YAxis 
                yAxisId="right"
                orientation="right" 
                domain={yDomain} 
                tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString('ru-RU', {notation: 'compact'}) : ''}
                tickLine={false}
                axisLine={false}
                width={80}
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                 cursor={{ fill: 'hsl(var(--muted) / 0.3)'}}
                 content={<CustomTooltip />}
              />
              <Bar yAxisId="right" dataKey="close" shape={(props) => <Candle {...props} />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
