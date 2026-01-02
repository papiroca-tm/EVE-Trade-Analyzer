
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


// Custom shape for the candlestick. THIS CODE SHOULD NOT BE MODIFIED.
const Candle = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;

  if (low === undefined || high === undefined || open === undefined || close === undefined || !payload) {
    return null;
  }
  
  const yDomain = [low, high];
  const domainRange = yDomain[1] - yDomain[0];
  
  const yValueToCoordinate = (value: number) => {
    if (domainRange === 0) {
        return y + height / 2;
    }
    const valueRatio = (value - yDomain[0]) / domainRange;
    return y + (1 - valueRatio) * height;
  };

  const highY = yValueToCoordinate(high);
  const lowY = yValueToCoordinate(low);
  const openY = yValueToCoordinate(open);
  const closeY = yValueToCoordinate(close);
  
  const isBullish = close >= open;
  const fill = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
  const stroke = fill;

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
 * Transforms historical EVE Online market data into a OHLC format.
 * - Wicks represent the highest/lowest price of the day.
 * - Body represents the change in average price from the previous day to the current day.
 * @param history - An array of market history items, sorted chronologically.
 * @returns An array of data points formatted for a candlestick chart.
 */
function transformHistoryForCandlestick(history: MarketHistoryItem[]) {
  if (!history || history.length < 2) return [];

  const transformedData = history.map((currentItem, index) => {
    const previousDay = index > 0 ? history[index - 1] : currentItem;

    const open_t = previousDay.average;
    const close_t = currentItem.average;
    const high_t = currentItem.highest;
    const low_t = currentItem.lowest;
    
    return {
      date: new Date(currentItem.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      open: open_t,
      high: high_t,
      low: low_t,
      close: close_t,
      average: currentItem.average,
      volume: currentItem.volume,
    };
  });

  return transformedData.slice(1);
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
                    {label}
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
                СРЕДНЯЯ
              </span>
              <span className="font-bold">
                {data.average.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
              </span>
            </div>
             <div className="flex flex-col">
              <span className="text-[0.65rem] uppercase text-muted-foreground">
                ОБЪЕМ
              </span>
              <span className="font-bold">
                {data.volume.toLocaleString('ru-RU')}
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
    if (!history || history.length === 0) {
      return { data: [], yDomain: [0, 0] };
    }

    const dataForHorizon = history.slice(-timeHorizonDays);
    const chartData = transformHistoryForCandlestick(dataForHorizon);

    if (chartData.length === 0) {
      return { data: [], yDomain: [0, 0] };
    }
    
    const prices = chartData.flatMap(d => [d.low, d.high]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1;
    
    return {
        data: chartData,
        yDomain: [Math.max(0, minPrice - padding), maxPrice + padding]
    };
  }, [history, timeHorizonDays]);


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <CandlestickChartIcon className="h-5 w-5 text-primary" />
            <CardTitle>График цен (свечи)</CardTitle>
        </div>
        <CardDescription>
            Тело свечи показывает изменение средней цены от прошлого дня к текущему. Тени (фитили) — дневной диапазон (min/max).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} hide={true} />
              <YAxis 
                hide={true}
                orientation="right" 
                domain={yDomain} 
                tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : ''}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip 
                 cursor={{ fill: 'hsl(var(--muted) / 0.3)'}}
                 content={<CustomTooltip />}
              />
              <Bar dataKey="close" shape={<Candle />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
