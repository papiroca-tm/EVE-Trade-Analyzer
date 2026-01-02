
'use client';
import type { AnalysisResult, PriceRange } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, Percent, TrendingUp, Clock, Scale, Info, ArrowDown, ArrowUp, CircleDollarSign, Target, ShoppingBasket, Tag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const StatCard = ({ icon, title, value, unit, tooltipText, className }: { icon: React.ReactNode, title: string, value: string, unit?: string, tooltipText?: string, className?: string }) => (
    <div className={cn("flex items-start gap-2 rounded-lg bg-muted/50 p-2", className)}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
        </div>
        <div>
            <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground">{title}</p>
                {tooltipText && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-3 w-3 text-muted-foreground/70" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">{tooltipText}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <p className="text-base font-bold">
                {value}
                {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
            </p>
        </div>
    </div>
);


const PriceCard = ({ title, priceRange, icon, colorClass, isBuy }: { title: string, priceRange: PriceRange, icon: React.ReactNode, colorClass: string, isBuy: boolean }) => {
    const formatPrice = (price: number) => price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    return (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                {icon}
                <span>{title}</span>
            </div>
            
            <div className='text-center my-2'>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <p className={`inline-flex cursor-help items-center gap-1 text-3xl font-bold font-mono ${colorClass}`}>
                                {formatPrice(priceRange.average)}
                                <Info className="h-4 w-4 text-muted-foreground/70" />
                            </p>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Обобщенная цена, рассчитанная как среднее из двух ориентиров (средне- и краткосрочного).</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-muted-foreground">ISK (обобщенная)</p>
            </div>

            <div className="grid grid-cols-1 gap-1 text-center font-mono">
                <div className="flex items-center justify-between rounded-sm bg-background/50 px-2 py-1">
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-sans text-muted-foreground">{isBuy ? "Мин. цена за период" : "Макс. цена за период"}</span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground/70" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Исторический {isBuy ? 'минимум' : 'максимум'} цены за выбранный период. Самая оптимистичная, но труднодостижимая цена.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <span className="text-sm font-bold text-red-500">{formatPrice(priceRange.longTerm)}</span>
                </div>

                <div className="flex items-center justify-between rounded-sm bg-background/50 px-2 py-1">
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-sans text-muted-foreground">Среднесрок.</span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground/70" />
                                </TooltipTrigger>
                                <TooltipContent>
                                     <p>Стратегическая цена, рассчитанная для исполнения в рамках '{isBuy ? data.inputs.executionDays : ''}' дневного срока сделки. Учитывает глубину рынка и конкуренцию в заданном временном горизонте.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <span className="text-sm font-bold text-yellow-500">{formatPrice(priceRange.midTerm)}</span>
                </div>
                
                <div className="flex items-center justify-between rounded-sm bg-background/50 px-2 py-1">
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-sans text-muted-foreground">Краткосрок.</span>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground/70" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Тактическая цена для быстрого исполнения (в течение ~1 дня), основанная на текущей суточной структуре стакана ордеров.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <span className="text-sm font-bold text-green-500">{formatPrice(priceRange.shortTerm)}</span>
                </div>
            </div>
        </div>
    );
};


export function RecommendationsPanel({ data }: { data: AnalysisResult }) {
  const { priceAnalysis, volumeAnalysis, recommendations, inputs } = data;

  const rec = recommendations && recommendations.length > 0 ? recommendations[0] : null;

  const emptyPriceRange: PriceRange = { longTerm: 0, midTerm: 0, shortTerm: 0, average: 0 };

  const desiredMarginBgClass = (() => {
    if (!rec || !inputs) return 'bg-muted/50';
    if (rec.netMarginPercent >= inputs.desiredNetMarginPercent) {
        return 'bg-green-800/60'; // Green
    }
    if (rec.netMarginPercent >= inputs.desiredNetMarginPercent - 2) {
        return 'bg-yellow-600/60'; // Yellow
    }
    return 'bg-red-800/60'; // Red
  })();


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
            <StatCard 
                icon={<Percent size={16}/>} 
                title="Желаемая маржа" 
                value={inputs.desiredNetMarginPercent.toFixed(2)} 
                unit="%"
                className={desiredMarginBgClass}
                tooltipText="Фон показывает сравнение с расчетной маржой. Зеленый: расчетная >= желаемой. Желтый: немного ниже. Красный: значительно ниже."
            />
        </div>

        {rec ? (
          <div className="space-y-3">
             <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <PriceCard 
                    title="Рекомендуемая цена покупки" 
                    priceRange={rec.buyPriceRange}
                    icon={<ArrowDown className="h-4 w-4 text-green-400" />}
                    colorClass="text-primary"
                    isBuy={true}
                />
                 <PriceCard 
                    title="Ориентир цены продажи" 
                    priceRange={rec.sellPriceRange}
                    icon={<ArrowUp className="h-4 w-4 text-red-400" />}
                    colorClass="text-destructive"
                    isBuy={false}
                />
             </div>

             <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <StatCard 
                    icon={<Percent size={16}/>} 
                    title="Расчетная маржа" 
                    value={rec.netMarginPercent.toFixed(2)} 
                    unit="%"
                    tooltipText="Эта маржа рассчитана на основе разницы между тактической (краткосрочной) ценой покупки и тактической (краткосрочной) ценой продажи, за вычетом всех комиссий и налогов."
                />
                <StatCard 
                    icon={<Target size={16}/>} 
                    title="Целевой объем" 
                    value={rec.targetVolume.toLocaleString('ru-RU')}
                    tooltipText="Количество единиц, которое можно приобрести на указанный 'Инвестируемый капитал' по тактической (краткосрочной) цене покупки."
                />
                <StatCard 
                    icon={<ShoppingBasket size={16}/>} 
                    title="Примерный объем закупок" 
                    value={"0"} 
                    unit="ед/день"
                />
                 <StatCard 
                    icon={<Tag size={16}/>} 
                    title="Примерный объем продаж" 
                    value={"0"} 
                    unit="ед/день"
                />
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
                <PriceCard 
                    title="Рекомендуемая цена покупки" 
                    priceRange={emptyPriceRange} 
                    icon={<ArrowDown className="h-4 w-4 text-green-400" />}
                    colorClass="text-primary"
                    isBuy={true}
                />
                 <PriceCard 
                    title="Ориентир цены продажи" 
                    priceRange={emptyPriceRange}
                    icon={<ArrowUp className="h-4 w-4 text-red-400" />}
                    colorClass="text-destructive"
                    isBuy={false}
                />
             </div>

             <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <StatCard 
                    icon={<Percent size={16}/>} 
                    title="Расчетная маржа" 
                    value={"0.00"} 
                    unit="%"
                    tooltipText="Эта маржа рассчитана на основе разницы между тактической (краткосрочной) ценой покупки и тактической (краткосрочной) ценой продажи, за вычетом всех комиссий и налогов."
                />
                <StatCard 
                    icon={<Target size={16}/>} 
                    title="Целевой объем" 
                    value={"0"} 
                    tooltipText="Количество единиц, которое можно приобрести на указанный 'Инвестируемый капитал' по тактической (краткосрочной) цене покупки."
                />
                 <StatCard 
                    icon={<ShoppingBasket size={16}/>} 
                    title="Примерный объем закупок" 
                    value={"0"} 
                    unit="ед/день"
                />
                 <StatCard 
                    icon={<Tag size={16}/>} 
                    title="Примерный объем продаж" 
                    value={"0"} 
                    unit="ед/день"
                />
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
