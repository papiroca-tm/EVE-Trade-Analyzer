
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
 * Transforms historical EVE Online market data into a synthetic OHLC format for candlestick charts
 * according to the specified algorithm.
 * @param history - An array of market history items, sorted chronologically.
 * @returns An array of data points formatted for a candlestick chart.
 */
function transformHistoryForCandlestick(history: MarketHistoryItem[]) {
  if (!history || history.length === 0) return [];

  // Step 1: Preparation - Find V_max over the entire period.
  const V_max = history.reduce((max, item) => Math.max(max, item.volume), 0);
  if (V_max === 0) return []; // No volume, can't draw bodies.

  const transformedData = history.map((item, index) => {
    // Step 2: Process each day
    const high_t = item.highest;
    const low_t = item.lowest;
    const avg_t = item.average;
    const volume_t = item.volume;

    // --- ALGORITHM CORRECTION ---
    // 1. Determine the maximum possible body height centered on avg_t
    const max_body_height_t = 2 * Math.min(avg_t - low_t, high_t - avg_t);
    
    // Ensure max_body_height is non-negative
    const safe_max_body_height = Math.max(0, max_body_height_t);

    // 2. Use this corrected max height to scale the volume ratio
    const volume_ratio_t = V_max > 0 ? volume_t / V_max : 0;
    const body_height_t = volume_ratio_t * safe_max_body_height;

    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (index > 0) {
        const avg_t_minus_1 = history[index - 1].average;
        if (avg_t > avg_t_minus_1) {
            direction = 'bullish';
        } else if (avg_t < avg_t_minus_1) {
            direction = 'bearish';
        }
    }

    const center = avg_t;
    const half_body = body_height_t / 2;

    let open_t: number;
    let close_t: number;

    if (direction === 'bullish') {
        open_t = center - half_body;
        close_t = center + half_body;
    } else { // Bearish or Neutral
        open_t = center + half_body;
        close_t = center - half_body;
    }
    
    // Final assembly for the day
    return {
        date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
        open: open_t,
        high: high_t,
        low: low_t,
        close: close_t,
        // The `body` dataKey is what recharts uses to calculate y and height for the custom shape.
        // It needs to represent the full range of the wick (high to low).
        body: [low_t, high_t] 
    };
  });
  
  return transformedData;
}


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
            <CandlestickChartIcon className="h-6 w-6 text-primary" />
            <CardTitle>График цен (Синтетические свечи)</CardTitle>
        </div>
        <CardDescription>
            Дневной диапазон цен (фитиль), относительный объем (тело) и направление ср. цены (цвет).
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
                tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : ''}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip 
                 formatter={(value, name, props) => {
                    const { payload } = props;
                    if (name === 'body' && payload) {
                       return [
                        `Open: ${Number(payload.open).toLocaleString('ru-RU', {minimumFractionDigits: 2})}`,
                        `High: ${Number(payload.high).toLocaleString('ru-RU', {minimumFractionDigits: 2})}`,
                        `Low: ${Number(payload.low).toLocaleString('ru-RU', {minimumFractionDigits: 2})}`,
                        `Close: ${Number(payload.close).toLocaleString('ru-RU', {minimumFractionDigits: 2})}`,
                       ]
                    }
                    return null;
                 }}
                 labelFormatter={(label) => `Дата: ${label}`}
                 contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
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
