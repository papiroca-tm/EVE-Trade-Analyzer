
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { Bar, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Функция для генерации случайных данных для графика свечей
const generateRandomCandleData = (count: number) => {
    let lastClose = Math.random() * 500 + 100;
    const data = [];
    for (let i = 0; i < count; i++) {
        const open = lastClose;
        const close = open + (Math.random() - 0.5) * 20;
        const high = Math.max(open, close) + Math.random() * 10;
        const low = Math.min(open, close) - Math.random() * 10;
        const date = new Date();
        date.setDate(date.getDate() + i);

        data.push({
            date: date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            open,
            high,
            low,
            close
        });
        lastClose = close;
    }
    return data;
};

// Кастомный компонент для отрисовки одной свечи
const CandleShape = (props: any) => {
    const { x, y, width, height, open, close, high, low, fill } = props;

    // Определяем цвет свечи
    const isBullish = close > open;
    const candleFill = isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';

    // Координаты тела свечи
    const bodyY = isBullish ? y + height : y;
    const bodyHeight = Math.abs(height);

    // Координаты фитиля (тени)
    const wickX = x + width / 2;
    
    return (
        <g stroke={candleFill} fill={candleFill} strokeWidth={1}>
            {/* Тень/фитиль */}
            <line x1={wickX} y1={y} x2={wickX} y2={y + height} />
            {/* Тело */}
            <rect x={x} y={bodyY} width={width} height={bodyHeight} fill={candleFill} />
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


export function CandlestickChartPanel() {
    const data = useMemo(() => generateRandomCandleData(60), []);

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
                    <CardTitle>График свечей (случайные данные)</CardTitle>
                </div>
                <CardDescription>
                    Стандартный биржевой график для демонстрации. Данные генерируются случайным образом.
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
                                tickFormatter={(value) => typeof value === 'number' ? Math.round(value).toLocaleString('ru-RU') : ''}
                                tickLine={false}
                                axisLine={false}
                                width={60}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            
                            {/* Бар для теней (фитилей) */}
                            <Bar dataKey="low" stackId="candle" fill="transparent" stroke="transparent" barSize={1} shape={(props) => <CandleShape {...props} high={props.payload.high} low={props.payload.low} open={props.payload.open} close={props.payload.close} />} />
                            
                             {/* Бар для тела свечи. Высота этого бара определяет диапазон (y, y+height) для отрисовки в CandleShape */}
                            <Bar dataKey="high" stackId="candle" fill="transparent" stroke="transparent" barSize={8} shape={(props) => <CandleShape {...props} high={props.payload.high} low={props.payload.low} open={props.payload.open} close={props.payload.close} />} />

                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
