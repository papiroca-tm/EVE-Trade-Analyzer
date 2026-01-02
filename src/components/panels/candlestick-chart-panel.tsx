'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { Bar, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


/**
 * Преобразует исторические данные в формат для графика свечей.
 * Генерирует случайные данные в диапазоне от 3 до 5.
 * @param history - Массив исторических данных (используется для определения количества свечей).
 * @returns - Массив данных, готовый для графика свечей.
 */
const transformHistoryToCandlestickData = (history: MarketHistoryItem[]) => {
    return history.map(item => {
        const open = Math.random() * 2 + 3; // 3.0 to 5.0
        const close = Math.random() * 2 + 3; // 3.0 to 5.0
        const high = Math.max(open, close) + Math.random() * 0.2; // Add a bit for the wick
        const low = Math.min(open, close) - Math.random() * 0.2; // Subtract a bit for the wick

        return {
            date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            // ohlc is an array [open, high, low, close]
            ohlc: [open, high, low, close],
        };
    });
};

// Кастомный компонент для отрисовки одной свечи
const CandleShape = (props: any) => {
    const { x, width, ohlc, yAxis } = props;
    const [open, high, low, close] = ohlc;

    const isBullish = close > open;
    const fill = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
    const stroke = fill;

    const wickX = x + width / 2;
    const bodyY = yAxis.scale(Math.max(open, close));
    const bodyHeight = Math.abs(yAxis.scale(open) - yAxis.scale(close));

    return (
        <g stroke={stroke} fill="none" strokeWidth="1">
            {/* Тело свечи */}
            <rect x={x} y={bodyY} width={width} height={bodyHeight} fill={fill} />
            {/* Тень (фитиль) */}
            <line x1={wickX} y1={yAxis.scale(high)} x2={wickX} y2={yAxis.scale(low)} />
        </g>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const [open, high, low, close] = data.ohlc;
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                <p className="font-bold text-muted-foreground">{label}</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                    <span className="text-muted-foreground">Open:</span><span className="font-mono text-right">{open.toFixed(2)}</span>
                    <span className="text-muted-foreground">High:</span><span className="font-mono text-right">{high.toFixed(2)}</span>
                    <span className="text-muted-foreground">Low:</span><span className="font-mono text-right">{low.toFixed(2)}</span>
                    <span className="text-muted-foreground">Close:</span><span className="font-mono text-right">{close.toFixed(2)}</span>
                </div>
            </div>
        );
    }
    return null;
};


export function CandlestickChartPanel({ history }: { history: MarketHistoryItem[] }) {
    const data = useMemo(() => transformHistoryToCandlestickData(history), [history]);

    const yDomain = useMemo(() => {
        if (data.length === 0) return [0, 0];
        const min = Math.min(...data.map(d => d.ohlc[2])); // min of all lows
        const max = Math.max(...data.map(d => d.ohlc[1])); // max of all highs
        const padding = (max - min) * 0.1;
        return [min - padding, max + padding];
    }, [data]);


    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <CandlestickChartIcon className="h-5 w-5 text-primary" />
                    <CardTitle>График свечей</CardTitle>
                </div>
                <CardDescription>
                   Динамика цены за выбранный период (случайные данные).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[24rem] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={data}
                            margin={{ top: 5, right: 20, left: 5, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} />
                            <YAxis 
                                orientation="right"
                                domain={yDomain} 
                                tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString('ru-RU', {minimumFractionDigits: 2}) : ''}
                                tickLine={false}
                                axisLine={false}
                                width={80}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            
                            <Bar 
                                dataKey="ohlc" 
                                shape={<CandleShape />} 
                                barSize={8}
                            >
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
