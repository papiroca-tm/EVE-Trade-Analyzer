
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { Bar, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


/**
 * Преобразует исторические данные, оставляя только дату, макс. и мин. цену.
 * @param history - Массив исторических данных.
 * @returns - Массив данных для графика.
 */
const transformHistoryToCandlestickData = (history: MarketHistoryItem[]) => {
    if (!history) return [];
    return history.slice(-90).map(item => {
        return {
            date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            range: [item.lowest, item.highest], // Используем массив [min, max]
            low: item.lowest,
            high: item.highest,
        };
    });
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                <p className="font-bold text-muted-foreground">{label}</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                    <span className="text-muted-foreground">High:</span><span className="font-mono text-right">{data.high.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
                    <span className="text-muted-foreground">Low:</span><span className="font-mono text-right">{data.low.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
                </div>
            </div>
        );
    }
    return null;
};


export function CandlestickChartPanel({ history }: { history: MarketHistoryItem[] }) {
    const data = useMemo(() => transformHistoryToCandlestickData(history), [history]);

    const yDomain = useMemo(() => {
        if (!data || data.length === 0) return [0, 5];
        const allValues = data.flatMap(d => d.range);
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const padding = (max - min) * 0.1;
        return [min - padding, max + padding];
    }, [data]);


    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <CandlestickChartIcon className="h-5 w-5 text-primary" />
                    <CardTitle>График теней (Мин/Макс цена)</CardTitle>
                </div>
                <CardDescription>
                   Динамика дневного диапазона цен за последние 90 дней.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[24rem] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={data}
                            barCategoryGap="40%"
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
                            
                            {/* 
                                Используем "плавающий" Bar. 
                                Когда в dataKey передается массив, BarChart рисует столбец от первого значения до второго.
                                Чтобы сделать его похожим на тень, мы задаем очень маленький barSize.
                            */}
                            <Bar 
                                dataKey="range" 
                                fill="hsl(var(--foreground) / 0.8)" 
                                barSize={1} 
                            />
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

                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
