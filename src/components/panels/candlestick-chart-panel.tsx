'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Bar, Line, Area } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


/**
 * Преобразует исторические данные.
 * @param history - Массив исторических данных.
 * @returns - Массив данных для графика.
 */
const transformHistoryData = (history: MarketHistoryItem[]) => {
    if (!history) return { chartData: [], yDomain: [0, 1] };

    const slicedHistory = history.slice(-90);
    if (slicedHistory.length === 0) return { chartData: [], yDomain: [0, 1] };

    const allValues = slicedHistory.flatMap(item => [item.lowest, item.highest]);
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    
    // Добавляем 10% отступ
    const padding = (maxVal - minVal) * 0.1;
    const yDomain: [number, number] = [
      Math.max(0, minVal - padding),
      maxVal + padding
    ];
    
    const chartData = slicedHistory.map((item, index) => {
        let priceChangeColor = 'hsl(var(--muted-foreground))'; // Серый по умолчанию для первой точки
        if (index > 0) {
            const prevAverage = slicedHistory[index - 1].average;
            if (item.average > prevAverage) {
                priceChangeColor = 'hsl(142 76% 36%)'; // Зеленый
            } else if (item.average < prevAverage) {
                priceChangeColor = 'hsl(var(--destructive))'; // Красный
            }
        }

        return {
            date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            low: item.lowest,
            high: item.highest,
            average: item.average,
            range: [item.lowest, item.highest],
            priceChangeColor: priceChangeColor,
        };
    });

    return { chartData, yDomain };
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Find a payload that has the core data, e.g., from the Bar or one of the Lines
        const dataPayload = payload.find(p => p.payload.low !== undefined && p.payload.high !== undefined && p.payload.average !== undefined);
        if (!dataPayload || !dataPayload.payload) return null;

        const { low, high, average } = dataPayload.payload;

        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                <p className="font-bold text-muted-foreground">{label}</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                    <span className="text-muted-foreground">High:</span><span className="font-mono text-right">{high?.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
                    <span className="text-muted-foreground">Low:</span><span className="font-mono text-right">{low?.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
                    <span className="text-muted-foreground">Average:</span><span className="font-mono text-right">{average?.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
                </div>
            </div>
        );
    }
    return null;
};

// @ts-ignore
const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (!payload || !payload.priceChangeColor) return null;

  return (
    <circle cx={cx} cy={cy} r={2} fill={payload.priceChangeColor} stroke="none" />
  );
};


export function CandlestickChartPanel({ history }: { history: MarketHistoryItem[] }) {
    const { chartData, yDomain } = useMemo(() => transformHistoryData(history), [history]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <CandlestickChartIcon className="h-5 w-5 text-primary" />
                    <CardTitle>График Мин/Макс цены</CardTitle>
                </div>
                <CardDescription>
                   Динамика дневного диапазона цен за последние 90 дней.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[24rem] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={false} />
                            <YAxis 
                                orientation="right"
                                domain={yDomain} 
                                axisLine={false}
                                tickLine={false}
                                tick={false}
                                width={0}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            
                             <Area
                                type="monotone"
                                dataKey="high"
                                fill="hsl(var(--destructive) / 0.2)"
                                stroke="none"
                                baseValue={yDomain[1]} 
                            />
                             <Area
                                type="monotone"
                                dataKey="low"
                                fill="hsl(142 76% 36% / 0.2)"
                                stroke="none"
                                baseValue={yDomain[0]} 
                            />
                            
                            <Bar dataKey="range" fill="hsl(0 0% 98%)" barSize={1} />
                            
                            <Line 
                                type="linear" 
                                dataKey="high"
                                stroke="hsl(var(--destructive))"
                                strokeWidth={1.5} 
                                dot={false} 
                            />
                            <Line 
                                type="linear" 
                                dataKey="low" 
                                stroke="hsl(142 76% 36%)"
                                strokeWidth={1.5} 
                                dot={false} 
                            />
                             <Line 
                                type="linear" 
                                dataKey="average"
                                stroke="none"
                                dot={<CustomDot />}
                                activeDot={{ r: 4 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
