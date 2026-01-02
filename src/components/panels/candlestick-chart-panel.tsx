'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CandlestickChart as CandlestickChartIcon } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
        };
    });
};

// Компонент для отрисовки одной тени (вертикальной линии)
const WickShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    const [low, high] = payload.range;

    // y - координата нижней точки (для 'low'), height - высота до нее от верха.
    // Нам нужно найти y-координату для 'high'. Она будет выше.
    // 'y' соответствует 'low', а 'y' - 'height' соответствует 'high'
    // Но это не так, recharts передает y и height для всего бара.
    // y - это y-координата значения dataKey, то есть low. height - это высота от оси до этой точки.

    // Поскольку мы не можем легко получить две Y-координаты, мы просто используем x, y, и width,
    // а height игнорируем и рисуем свою линию. Но для этого нам нужна ось Y.
    // Recharts не передает оси в shape. Поэтому этот подход не сработает.

    // Попробуем другой, более простой подход с BarChart и плавающими барами.
    // Для этого dataKey должен указывать на массив [min, max].
    
    // Этот компонент не будет использоваться, но оставлен для демонстрации.
    // Мы используем встроенную возможность BarChart для "плавающих" баров.

    return null;
};


const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const [low, high] = data.range;
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                <p className="font-bold text-muted-foreground">{label}</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                    <span className="text-muted-foreground">High:</span><span className="font-mono text-right">{high.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
                    <span className="text-muted-foreground">Low:</span><span className="font-mono text-right">{low.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</span>
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
                        <BarChart
                            data={data}
                            barCategoryGap="40%"
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

                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
