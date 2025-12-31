
'use client';
import type { AnalysisResult, Feasibility } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Percent, TrendingUp, Clock, Scale, Info, ArrowDown, ArrowUp, CircleDollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const PriceCard = ({ title, longTerm, midTerm, shortTerm, icon }: { title: string, longTerm: number, midTerm: number, shortTerm: number, icon: React.ReactNode }) => {
    const formatPrice = (price: number) => price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    return (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {icon}
                <span>{title}</span>
            </div>
            <div className="grid grid-cols-1 gap-1 text-center font-mono">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center justify-between rounded-sm bg-background/50 px-2 py-1">
                                <span className="text-xs font-sans text-muted-foreground">Долгосрок.</span>
                                <span className="text-sm font-bold text-foreground">{formatPrice(longTerm)}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Исторический минимум за выбранный период.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <div className="flex items-center justify-between rounded-sm bg-background/50 px-2 py-1">
                                <span className="text-xs font-sans text-muted-foreground">Среднесрок.</span>
                                <span className="text-base font-bold text-primary">{formatPrice(midTerm)}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Стратегическая цена для исполнения в заданный срок.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center justify-between rounded-sm bg-background/50 px-2 py-1">
                                <span className="text-xs font-sans text-muted-foreground">Краткосрок.</span>
                                <span className="text-sm font-bold text-foreground">{formatPrice(shortTerm)}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Тактическая цена для быстрого исполнения (~1 день).</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <p className="text-center text-xs text-muted-foreground">ISK</p>
        </div>
    );
};

const PriceCardSell = ({ title, priceMin, priceMax, icon }: { title: string, priceMin: number, priceMax: number, icon: React.ReactNode }) => (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {icon}
            <span>{title}</span>
        </div>
        <div className="flex items-baseline justify-center gap-2">
            {priceMin === priceMax ? (
                 <span className="text-base font-bold text-foreground font-mono">{priceMax.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            ) : (
                <>
                <span className="text-base font-bold text-foreground font-mono">{priceMin.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs text-muted-foreground">-</span>
                <span className="text-base font-bold text-foreground font-mono">{priceMax.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </>
            )}
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

  const rec = recommendations && recommendations.length > 0 ? recommendations[0] : null;

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
                <PriceCard 
                    title="Рекомендуемая цена покупки" 
                    longTerm={rec.buyPriceRange.longTerm} 
                    midTerm={rec.buyPriceRange.midTerm}
                    shortTerm={rec.buyPriceRange.shortTerm}
                    icon={<ArrowDown className="h-4 w-4 text-green-400" />} 
                />
                <PriceCardSell title="Ориентир цены продажи" priceMin={rec.sellPriceRange.min} priceMax={rec.sellPriceRange.max} icon={<ArrowUp className="h-4 w-4 text-red-400" />} />
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
                    <div className='flex items-center gap-2'>
                        <CircleDollarSign className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Потенциальная прибыль</CardTitle>
                    </div>
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
          <div className="space-y-3">
             <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <PriceCard title="Рекомендуемая цена покупки" longTerm={0} midTerm={0} shortTerm={0} icon={<ArrowDown className="h-4 w-4 text-green-400" />} />
                <PriceCardSell title="Ориентир цены продажи" priceMin={0} priceMax={0} icon={<ArrowUp className="h-4 w-4 text-red-400" />} />
             </div>

             <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <StatCard icon={<Percent size={16}/>} title="Расчетная маржа" value={"0.00"} unit="%"/>
                <StatCard icon={<TrendingUp size={16}/>} title="Выполн. объем" value={"0 - 0"} />
                <StatCard icon={<Clock size={16}/>} title="Время исполн." value={"0-0"} unit="дней"/>
                <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-xs text-muted-foreground">Выполнимость</p>
                     <Badge variant="secondary" className="mt-1 w-full justify-center capitalize">
                       Н/Д
                    </Badge>
                </div>
             </div>
             
             <Card className="bg-muted/30">
                <CardHeader className="p-2">
                    <div className='flex items-center gap-2'>
                        <CircleDollarSign className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Потенциальная прибыль</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                    <p className="text-2xl font-bold text-primary font-mono text-center">
                        0.00 ISK
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground flex items-start gap-1">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>Введите новую логику для расчета рекомендаций.</span>
                    </p>
                </CardContent>
             </Card>

          </div>
        )}
      </CardContent>
    </Card>
  );
}
