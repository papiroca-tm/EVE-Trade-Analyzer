
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { Bar, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


/**
 * Преобразует исторические данные в формат для графика свечей.
 * Пока что это заглушка, возвращающая статические значения.
 * @param history - Массив исторических данных.
 * @returns - Массив данных, готовый для графика свечей.
 */
const transformHistoryToCandlestickData = (history: MarketHistoryItem[]) => {
    return history.map(item => ({
        date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
        open: 4.2,
        high: 5.18,
        low: 3.8,
        close: 4.6,
    }));
};


// Кастомный компонент для отрисовки одной свечи
const CandleShape = (props: any) => {
    const { x, y, width, height, open, close } = props.payload;

    // Получаем полный диапазон оси Y из пропсов, которые передает Recharts
    const yAxis = props.yAxis;
    if (!yAxis) return null;

    const yDomain = yAxis.domain;
    const yRange = yAxis.range;
    
    // Функция для преобразования значения цены в координату Y
    const yValueToCoordinate = (value: number) => {
        const domainRange = yDomain[1] - yDomain[0];
        if (domainRange === 0) return yRange[0];
        const valueRatio = (value - yDomain[0]) / domainRange;
        // Ось Y в Recharts идет сверху вниз (yRange[0] - верх, yRange[1] - низ)
        return yRange[0] + (1 - valueRatio) * (yRange[1] - yRange[0]);
    };

    // Определяем цвет свечи
    const isBullish = close > open;
    const candleFill = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';

    // Координаты тела свечи
    const bodyY1 = yValueToCoordinate(open);
    const bodyY2 = yValueToCoordinate(close);
    const bodyTop = Math.min(bodyY1, bodyY2);
    const bodyHeight = Math.abs(bodyY1 - bodyY2);

    // Координаты фитиля (тени)
    const wickX = x + width / 2;
    const wickTop = yValueToCoordinate(props.payload.high);
    const wickBottom = yValueToCoordinate(props.payload.low);

    return (
        <g stroke={candleFill} fill={candleFill} strokeWidth={1}>
            {/* Тень/фитиль */}
            <line x1={wickX} y1={wickTop} x2={wickX} y2={wickBottom} />
            {/* Тело */}
            <rect x={x} y={bodyTop} width={width} height={bodyHeight} fill={candleFill} />
        </g>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Мы используем первый payload, так как оба <Bar> имеют одни и те же данные
        const data = payload[0].payload;
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                <p className="font-bold text-muted-foreground">{label}</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                    <span className="text-muted-foreground">Open:</span><span className="font-mono text-right">{data.open.toFixed(2)}</span>
                    <span className="text-muted-foreground">High:</span><span className="font-mono text-right">{data.high.toFixed(2)}</span>
                    <span className="text-muted-foreground">Low:</span><span className="font-mono text-right">{data.low.toFixed(2)}</span>
                    <span className="text-muted-foreground">Close:</span><span className="font-mono text-right">{data.close.toFixed(2)}</span>
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
        const min = Math.min(...data.map(d => d.low));
        const max = Math.max(...data.map(d => d.high));
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
                   Динамика цены за выбранный период.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[24rem] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={data}
                            margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
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
                            
                            {/* 
                              Этот <Bar> используется как "холст" для кастомной отрисовки свечей.
                              dataKey="low" здесь используется просто чтобы передать данные в shape.
                              Вся логика отрисовки находится внутри <CandleShape>.
                            */}
                            <Bar 
                                dataKey="low" 
                                shape={<CandleShape />} 
                                barSize={8}
                            />

                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
