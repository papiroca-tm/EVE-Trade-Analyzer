'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, Bar } from 'recharts';
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
    
    const padding = (maxVal - minVal) * 0.1;
    const yDomain: [number, number] = [
      Math.max(0, minVal - padding),
      maxVal + padding
    ];
    
    const chartData = slicedHistory.map(item => {
        return {
            date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            low: item.lowest,
            high: item.highest,
            // Добавляем диапазон для тени свечи
            range: [item.lowest, item.highest]
        };
    });

    return { chartData, yDomain };
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Мы ищем данные в payload, но исключаем 'range', так как он не должен отображаться
        const dataPoints = payload.filter(p => p.dataKey !== 'range');
        if (dataPoints.length === 0) return null;
        
        const dataPoint = dataPoints[0].payload;
        if (!dataPoint) return null;

        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                <p className="font-bold text-muted-foreground">{label}</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                    <span className="text-muted-foreground">High:</span><span className="font-mono text-right">{dataPoint.high?.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
                    <span className="text-muted-foreground">Low:</span><span className="font-mono text-right">{dataPoint.low?.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
                </div>
            </div>
        );
    }
    return null;
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
                        <AreaChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                            <XAxis dataKey="date" hide={true} />
                            <YAxis 
                                orientation="right"
                                domain={yDomain} 
                                hide={true}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            
                            {/* Линия для теней (фитилей) */}
                            <Bar dataKey="range" fill="hsl(var(--foreground))" barSize={1} />
                            
                            <Area 
                                type="linear" 
                                dataKey="high" 
                                stroke="hsl(var(--destructive))"
                                fill="transparent"
                                strokeWidth={1.5} 
                                dot={false} 
                            />
                            <Area 
                                type="linear" 
                                dataKey="low" 
                                stroke="hsl(142 76% 36%)"
                                fill="transparent"
                                strokeWidth={1.5} 
                                dot={false} 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
