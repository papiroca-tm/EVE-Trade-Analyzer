
'use client';
import { useState, useEffect, useMemo } from 'react';
import type { AnalysisResult, PriceRange, UserInputs } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, Percent, TrendingUp, Scale, Info, ArrowDown, ArrowUp, CircleDollarSign, Target, ShoppingBasket, Tag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// EVE Online Price Rounding Rules (copied from analysis.ts for client-side use)
function roundToEvePrice(price: number): number {
    if (price <= 0) return 0;
    if (price < 100) { // Keep 2 decimal places for smaller amounts
        return parseFloat(price.toFixed(2));
    }
    const magnitude = Math.pow(10, Math.floor(Math.log10(price)) - 3);
    const rounded = Math.round(price / magnitude) * magnitude;
    // Convert to a string with exactly 2 decimal places to fix floating point issues
    return parseFloat(rounded.toFixed(2));
}

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

type PriceType = 'mid' | 'short' | 'custom';

const PriceCard = ({ title, priceRange, icon, colorClass, isBuy, inputs, activePriceType, onPriceTypeChange, customPrice, onCustomPriceChange }: { title: string, priceRange: PriceRange, icon: React.ReactNode, colorClass: string, isBuy: boolean, inputs: UserInputs, activePriceType: PriceType, onPriceTypeChange: (value: PriceType) => void, customPrice: string, onCustomPriceChange: (value: string) => void, }) => {
    const formatPrice = (price: number) => price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formatForDisplay = (value: string) => {
        if (!value) return '';
        const [integer, decimal] = value.split('.');
        if (!integer) return value;
        const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        let decimalPart = '';
        if (decimal !== undefined) {
             decimalPart = ',' + (decimal + '00').slice(0, 2);
        }
        return formattedInteger + decimalPart;
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        value = value.replace(/\./g, '').replace(',', '.');
        if (/^(\d+)?(\.?\d{0,2})?$/.test(value)) {
            onCustomPriceChange(value);
        }
    };

    const handleBlur = () => {
        const numericValue = parseFloat(customPrice);
        if (isNaN(numericValue) || numericValue <= 0) {
            onCustomPriceChange('');
            return;
        }
        const roundedValue = roundToEvePrice(numericValue);
        const priceString = roundedValue.toFixed(2);
        onCustomPriceChange(priceString.replace(',', '.'));
    };
    
    return (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                {icon}
                <span>{title}</span>
            </div>

            <ToggleGroup 
                type="single" 
                defaultValue={activePriceType}
                className="w-full grid grid-cols-3"
                onValueChange={(value: PriceType) => onPriceTypeChange(value || 'short')}>
                <ToggleGroupItem value="mid" aria-label="Среднесрок">Среднесрок</ToggleGroupItem>
                <ToggleGroupItem value="short" aria-label="Краткосрок">Краткосрок</ToggleGroupItem>
                <ToggleGroupItem value="custom" aria-label="Пользовательская">Кастом</ToggleGroupItem>
            </ToggleGroup>

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
                 <div className={cn("flex items-center justify-between rounded-sm bg-background/50 px-2 py-1", activePriceType !== 'mid' && 'opacity-50')}>
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-sans text-muted-foreground">Среднесрок.</span>
                    </div>
                    <span className="text-sm font-bold text-yellow-500">{formatPrice(priceRange.midTerm)}</span>
                </div>
                
                <div className={cn("flex items-center justify-between rounded-sm bg-background/50 px-2 py-1", activePriceType !== 'short' && 'opacity-50')}>
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-sans text-muted-foreground">Краткосрок.</span>
                    </div>
                    <span className="text-sm font-bold text-green-500">{formatPrice(priceRange.shortTerm)}</span>
                </div>
                <div className={cn("flex items-center justify-between rounded-sm bg-background/50 px-2 py-1", activePriceType !== 'custom' && 'opacity-50')}>
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-sans text-muted-foreground">Пользовательская</span>
                    </div>
                    <Input
                        type="text"
                        inputMode="decimal"
                        className="h-7 w-40 bg-background text-right font-mono"
                        placeholder="0,00"
                        value={formatForDisplay(customPrice)}
                        onChange={handlePriceChange}
                        onBlur={handleBlur}
                    />
                </div>
            </div>
        </div>
    );
};


export function RecommendationsPanel({ data }: { data: AnalysisResult }) {
  const { priceAnalysis, volumeAnalysis, recommendations, inputs } = data;
  const rec = recommendations && recommendations.length > 0 ? recommendations[0] : null;

  const [buyPriceType, setBuyPriceType] = useState<PriceType>('short');
  const [sellPriceType, setSellPriceType] = useState<PriceType>('short');
  const [customBuyPrice, setCustomBuyPrice] = useState('');
  const [customSellPrice, setCustomSellPrice] = useState('');

  const calculatedValues = useMemo(() => {
    if (!rec) return { netMarginPercent: 0, targetVolume: 0, potentialProfit: 0 };

    const getPrice = (type: PriceType, priceRange: PriceRange, customPriceStr: string) => {
        switch (type) {
            case 'mid': return priceRange.midTerm;
            case 'short': return priceRange.shortTerm;
            case 'custom': return parseFloat(customPriceStr) || 0;
            default: return 0;
        }
    };

    const selectedBuyPrice = getPrice(buyPriceType, rec.buyPriceRange, customBuyPrice);
    const selectedSellPrice = getPrice(sellPriceType, rec.sellPriceRange, customSellPrice);

    if (selectedBuyPrice <= 0 || selectedSellPrice <= 0) {
        return { netMarginPercent: 0, targetVolume: 0, potentialProfit: 0 };
    }

    const cost = selectedBuyPrice * (1 + inputs.brokerBuyFeePercent / 100);
    const revenue = selectedSellPrice * (1 - inputs.brokerSellFeePercent/100 - inputs.salesTaxPercent/100);
    const netMarginPercent = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;

    const capital = inputs.positionCapital ?? 0;
    const targetVolume = selectedBuyPrice > 0 && capital > 0 
        ? Math.floor(capital / selectedBuyPrice)
        : 0;

    const potentialProfit = targetVolume * (selectedSellPrice - selectedBuyPrice) - (targetVolume * selectedBuyPrice * (inputs.brokerBuyFeePercent / 100)) - (targetVolume * selectedSellPrice * (inputs.brokerSellFeePercent / 100 + inputs.salesTaxPercent / 100));

    return {
        netMarginPercent,
        targetVolume,
        potentialProfit: potentialProfit > 0 ? potentialProfit : 0,
    };

  }, [rec, inputs, buyPriceType, sellPriceType, customBuyPrice, customSellPrice]);


  const emptyPriceRange: PriceRange = { longTerm: 0, midTerm: 0, shortTerm: 0, average: 0 };

  const desiredMarginBgClass = (() => {
    if (!rec || !inputs) return 'bg-muted/50';
    if (calculatedValues.netMarginPercent >= inputs.desiredNetMarginPercent) {
        return 'bg-green-800/60';
    }
    if (calculatedValues.netMarginPercent >= inputs.desiredNetMarginPercent - 2) {
        return 'bg-yellow-600/60';
    }
    return 'bg-red-800/60';
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
            <StatCard icon={<Percent size={16}/>} title="Волатильность" value={priceAnalysis.volatility.toFixed(2)} unit="%" />
            <StatCard icon={<TrendingUp size={16}/>} title="Сред. дневной объем" value={Math.floor(volumeAnalysis.averageDailyVolume).toLocaleString('ru-RU')} />
            <StatCard icon={<Scale size={16}/>} title="Спред" value={(priceAnalysis.bestSellPrice - priceAnalysis.bestBuyPrice).toLocaleString('ru-RU', {minimumFractionDigits: 2})} unit="ISK" />
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
                    title="Цена покупки"
                    priceRange={rec.buyPriceRange}
                    icon={<ArrowDown className="h-4 w-4 text-green-400" />}
                    colorClass="text-primary"
                    isBuy={true}
                    inputs={inputs}
                    activePriceType={buyPriceType}
                    onPriceTypeChange={setBuyPriceType}
                    customPrice={customBuyPrice}
                    onCustomPriceChange={setCustomBuyPrice}
                />
                 <PriceCard 
                    title="Цена продажи" 
                    priceRange={rec.sellPriceRange}
                    icon={<ArrowUp className="h-4 w-4 text-red-400" />}
                    colorClass="text-destructive"
                    isBuy={false}
                    inputs={inputs}
                    activePriceType={sellPriceType}
                    onPriceTypeChange={setSellPriceType}
                    customPrice={customSellPrice}
                    onCustomPriceChange={setCustomSellPrice}
                />
             </div>

             <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <StatCard 
                    icon={<Percent size={16}/>} 
                    title="Расчетная маржа" 
                    value={calculatedValues.netMarginPercent.toFixed(2)} 
                    unit="%"
                    tooltipText="Рассчитано на основе выбранных цен покупки/продажи, за вычетом всех комиссий и налогов."
                />
                <StatCard 
                    icon={<Target size={16}/>} 
                    title="Целевой объем" 
                    value={calculatedValues.targetVolume.toLocaleString('ru-RU')}
                    tooltipText="Количество единиц, которое можно приобрести на указанный 'Инвестируемый капитал' по выбранной цене покупки."
                />
                <StatCard 
                    icon={<ShoppingBasket size={16}/>} 
                    title="Объем закупки (расч.)" 
                    value={Math.floor(rec.estimatedBuyVolumePerDay).toLocaleString('ru-RU')} 
                    unit="ед/день"
                />
                 <StatCard 
                    icon={<Tag size={16}/>} 
                    title="Объем продаж (расч.)" 
                    value={Math.floor(rec.estimatedSellVolumePerDay).toLocaleString('ru-RU')}
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
                        {calculatedValues.potentialProfit.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ISK
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground flex items-start gap-1">
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger className='flex items-start gap-1 text-left'>
                                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                                    <span>{rec.feasibilityReason}</span>
                                </TooltipTrigger>
                                <TooltipContent className='max-w-xs'>
                                    <p>Рассчитано для исполнимого объема, ограниченного вашим капиталом и реальной возможностью продать товар по среднесрочным ценам.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </p>
                </CardContent>
             </Card>

          </div>
        ) : (
            // Fallback UI when there are no recommendations
            <div className="text-center py-4 text-muted-foreground">
                Нет данных для отображения.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
