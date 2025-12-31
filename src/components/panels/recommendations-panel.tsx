'use client';
import type { AnalysisResult, Feasibility } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Percent, TrendingUp, Clock, Scale, Info, ArrowDown, ArrowUp } from 'lucide-react';

const StatCard = ({ icon, title, value, unit }: { icon: React.ReactNode, title: string, value: string, unit?: string }) => (
    <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
        </div>
        <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-base font-bold">
                {value}
                {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
            </p>
        </div>
    </div>
);

const PriceRangeCard = ({ title, range, icon }: { title: string, range: { min: number; max: number }, icon: React.ReactNode }) => (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {icon}
            <span>{title}</span>
        </div>
        <div className="flex items-baseline justify-center gap-2">
            <span className="text-base font-bold text-foreground font-mono">{range.min.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-muted-foreground text-xs">до</span>
            <span className="text-base font-bold text-foreground font-mono">{range.max.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
         <p className="text-center text-xs text-muted-foreground">ISK</p>
    </div>
);

export function RecommendationsPanel({ data }: { data: AnalysisResult }) {
  const { priceAnalysis, volumeAnalysis, recommendations, inputs } = data;

  const feasibilityMap: Record<Feasibility, string> = {
    'low': 'Низкая',
    'medium': 'Средняя',
    'high': 'Высокая',
    'very high': 'Очень высокая',
  };
  const feasibilityVariant: Record<Feasibility, "destructive" | "secondary" | "default" | "default"> = {
      'low': 'destructive',
      'medium': 'secondary',
      'high': 'default',
      'very high': 'default'
  };

  const rec = recommendations[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            <CardTitle>Анализ и рекомендации</CardTitle>
        </div>
        <CardDescription>Ключевые метрики и смоделированная торговая возможность на основе ваших параметров.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard icon={<Percent size={16}/>} title="Волатильность" value={priceAnalysis.volatility.toFixed(2)} unit="%"/>
            <StatCard icon={<TrendingUp size={16}/>} title="Сред. дневной объем" value={Math.floor(volumeAnalysis.averageDailyVolume).toLocaleString('ru-RU')} />
            <StatCard icon={<Scale size={16}/>} title="Спред" value={(priceAnalysis.bestSellPrice - priceAnalysis.bestBuyPrice).toLocaleString('ru-RU', {minimumFractionDigits: 2})} unit="ISK"/>
            <StatCard icon={<Percent size={16}/>} title="Желаемая маржа" value={inputs.desiredNetMarginPercent.toFixed(2)} unit="%"/>
        </div>

        {rec ? (
          <div className="space-y-3">
             <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <PriceRangeCard title="Рекомендуемый диапазон покупки" range={rec.buyPriceRange} icon={<ArrowDown className="h-4 w-4 text-green-400" />} />
                <PriceRangeCard title="Рекомендуемый диапазон продажи" range={rec.sellPriceRange} icon={<ArrowUp className="h-4 w-4 text-red-400" />} />
             </div>

             <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <StatCard icon={<Percent size={16}/>} title="Расчетная маржа" value={rec.netMarginPercent.toFixed(2)} unit="%"/>
                <StatCard icon={<TrendingUp size={16}/>} title="Выполн. объем" value={`${rec.executableVolume.low.toLocaleString('ru-RU')} - ${rec.executableVolume.high.toLocaleString('ru-RU')}`} />
                <StatCard icon={<Clock size={16}/>} title="Время исполн." value={`${rec.estimatedExecutionDays.min}-${rec.estimatedExecutionDays.max}`} unit="дней"/>
                <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-xs text-muted-foreground">Выполнимость</p>
                    <Badge variant={feasibilityVariant[rec.feasibility]} className="mt-1 w-full justify-center capitalize">
                       {feasibilityMap[rec.feasibility]}
                    </Badge>
                </div>
             </div>
             
             <Card className="bg-muted/30">
                <CardHeader className="p-2">
                     <CardTitle className="text-base">Потенциальная прибыль</CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                    <p className="text-2xl font-bold text-primary font-mono text-center">
                        {rec.potentialProfit.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ISK
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground flex items-start gap-1">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{rec.feasibilityReason}</span>
                    </p>
                </CardContent>
             </Card>

          </div>
        ) : (
            <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed bg-muted/50 p-4 text-center">
                <div>
                    <h3 className="text-base font-semibold text-foreground">Нет прибыльных возможностей</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Не удалось смоделировать прибыльную операцию. Попробуйте снизить желаемую маржу.
                    </p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
