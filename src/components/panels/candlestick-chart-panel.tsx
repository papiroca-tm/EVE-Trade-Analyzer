'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


// Custom shape for the candlestick. THIS CODE SHOULD NOT BE MODIFIED.
const Candle = (props: any) => {
  const { x, y, width, height, low, high, open, close, payload } = props;

  if (low === undefined || high === undefined || open === undefined || close === undefined || !payload) {
    return null;
  }

  // This function maps a price value to a Y coordinate within the component's bounding box.
  const yValueToCoordinate = (value: number) => {
    // The range of the wick
    const yDomain = [payload.low, payload.high];
    const domainRange = yDomain[1] - yDomain[0];
    
    // Avoid division by zero if high and low are the same
    if (domainRange === 0) {
        return y + height / 2;
    }

    // Calculate the ratio of the value within the domain
    const valueRatio = (value - yDomain[0]) / domainRange;
    
    // Convert the ratio to the SVG coordinate space (inverted Y-axis)
    // The `y` and `height` props are given by recharts for the Bar component.
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
    // We need the previous day to calculate the 'open' of the body.
    // For the first day, we can't form a body, so we can either skip it or make a neutral candle.
    // Let's make the first candle neutral, using its own average as open and close.
    const previousDay = index > 0 ? history[index - 1] : currentItem;

    const open_t = previousDay.average;
    const close_t = currentItem.average;
    const high_t = currentItem.highest;
    const low_t = currentItem.lowest;

    // The body can go outside the wick if avg prices change drastically.
    // The wick is defined by high/low, so the full range for the candle is min(low, open, close) to max(high, open, close).
    const absoluteLow = Math.min(low_t, open_t, close_t);
    const absoluteHigh = Math.max(high_t, open_t, close_t);
    
    return {
      date: new Date(currentItem.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      open: open_t,
      high: high_t,
      low: low_t,
      close: close_t,
      // Pass original values for tooltip
      average: currentItem.average,
      volume: currentItem.volume,
      // The `body` dataKey is what recharts uses for y/height. It must span the full wick range.
      body: [absoluteLow, absoluteHigh] 
    };
  });

  // Remove the first item as it doesn't have a previous day to compare for a meaningful body.
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
    
    const prices = chartData.flatMap(d => d.body);
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
              <Bar dataKey="body" shape={<Candle />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
