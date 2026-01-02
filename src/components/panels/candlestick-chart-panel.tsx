'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { Line, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Customized } from 'recharts';
import type { MarketHistoryItem } from '@/lib/types';


/**
 * Преобразует исторические данные в формат для графика свечей.
 * Генерирует случайные данные в диапазоне от 3 до 5.
 * @param history - Массив исторических данных (используется для определения количества свечей).
 * @returns - Массив данных, готовый для графика свечей.
 */
const transformHistoryToCandlestickData = (history: MarketHistoryItem[]) => {
    return history.slice(-90).map(item => {
        const open = Math.random() * 2 + 3; // 3.0 to 5.0
        const close = Math.random() * 2 + 3; // 3.0 to 5.0
        const high = Math.max(open, close) + Math.random();
        const low = Math.min(open, close) - Math.random();

        return {
            date: new Date(item.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
            open: open,
            high: high,
            low: low,
            close: close,
        };
    });
};

const Candlestick = (props: any) => {
    const { data, yAxis, xAxis } = props;

    if (!data || !yAxis || !xAxis || !xAxis.width || data.length === 0) {
        return null;
    }

    // Рассчитываем ширину одной свечи на основе общей ширины оси и количества точек
    const bandWidth = xAxis.width / data.length;

    return (
        <g>
            {data.map((entry: any, index: number) => {
                const { open, close, high, low } = entry;

                // Получаем координату X центра свечи по индексу
                const x = xAxis.scale(index);
                
                if (x === undefined || x === null) return null;

                const yOpen = yAxis.scale(open);
                const yClose = yAxis.scale(close);
                const yHigh = yAxis.scale(high);
                const yLow = yAxis.scale(low);

                const isBullish = close >= open;
                const bodyHeight = Math.max(1, Math.abs(yOpen - yClose)); // Тело должно быть минимум 1px
                const bodyY = Math.min(yOpen, yClose);
                
                const bodyWidth = bandWidth * 0.6;
                const bodyX = x - bodyWidth / 2;
                const wickX = x;

                return (
                    <g key={`candlestick-${index}`}>
                        {/* Фитиль (тень) */}
                        <line 
                            x1={wickX} y1={yHigh} 
                            x2={wickX} y2={yLow} 
                            stroke={isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} 
                            strokeWidth={1} 
                        />
                        {/* Тело свечи */}
                        <rect 
                            x={bodyX}
                            y={bodyY}
                            width={bodyWidth}
                            height={bodyHeight}
                            fill={isBullish ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
                        />
                    </g>
                );
            })}
        </g>
    );
};


const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const { open, high, low, close } = data;
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
        if (data.length === 0) return [0, 5];
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
                            <XAxis dataKey="date" type="category" tickLine={false} axisLine={false} />
                            <YAxis 
                                orientation="right"
                                domain={yDomain} 
                                tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString('ru-RU', {minimumFractionDigits: 2}) : ''}
                                tickLine={false}
                                axisLine={false}
                                width={80}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            
                            {/* Невидимая линия, чтобы Tooltip работал */}
                            <Line dataKey="close" stroke="transparent" dot={false} activeDot={false} yAxisId={0} />
                            
                            {/* Кастомный компонент для отрисовки свечей */}
                            <Customized component={Candlestick} />

                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
