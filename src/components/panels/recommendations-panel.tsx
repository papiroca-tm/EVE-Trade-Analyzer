
'use client';
import type { AnalysisResult, Recommendation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Percent, TrendingUp, Clock } from 'lucide-react';

const StatCard = ({ icon, title, value, unit }: { icon: React.ReactNode, title: string, value: string, unit?: string }) => (
    <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">
                {value}
                {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
            </p>
        </div>
    </div>
);


export function RecommendationsPanel({ data }: { data: AnalysisResult }) {
  const { priceAnalysis, volumeAnalysis, recommendations, inputs } = data;

  const feasibilityMap = {
    high: 'Высокая',
    medium: 'Средняя',
    low: 'Низкая',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-accent" />
            <CardTitle>Анализ и рекомендации</CardTitle>
        </div>
        <CardDescription>Ключевые метрики и смоделированная торговая возможность на основе ваших параметров.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={<Percent size={20}/>} title="Волатильность" value={priceAnalysis.volatility.toFixed(2)} unit="%"/>
            <StatCard icon={<TrendingUp size={20}/>} title="Сред. дневной объем" value={Math.floor(volumeAnalysis.averageDailyVolume).toLocaleString('ru-RU')} />
            {volumeAnalysis.estimatedExecutionTimeDays && (
                 <StatCard icon={<Clock size={20}/>} title="Прим. время исп." value={volumeAnalysis.estimatedExecutionTimeDays.toFixed(1)} unit="дней"/>
            )}
            <div className="flex items-center justify-center rounded-lg bg-muted/50 p-4">
                <div>
                    <p className="text-sm text-muted-foreground text-center">Выполнимость объема</p>
                    <Badge variant={volumeAnalysis.feasibility === 'high' ? 'default' : volumeAnalysis.feasibility === 'medium' ? 'secondary' : 'destructive'} className="mt-2 w-full justify-center text-lg capitalize">
                       {feasibilityMap[volumeAnalysis.feasibility]}
                    </Badge>
                </div>
            </div>
        </div>

        <div>
            <h3 className="mb-2 text-lg font-semibold">Рекомендуемая торговая операция</h3>
            <div className="w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Цена покупки</TableHead>
                    <TableHead>Цена продажи</TableHead>
                    <TableHead>Расчетная маржа</TableHead>
                    <TableHead>Желаемая маржа</TableHead>
                    <TableHead>Объем</TableHead>
                    <TableHead>Срок исп.</TableHead>
                    <TableHead className="text-right">Потенц. прибыль</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recommendations.length > 0 ? (
                    recommendations.map((rec, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-green-400">{rec.buyPrice.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="font-mono text-red-400">{rec.sellPrice.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="font-mono">
                            <Badge variant={rec.netMarginPercent >= inputs.desiredNetMarginPercent ? "default" : "destructive"}>
                                {rec.netMarginPercent.toFixed(2)}%
                            </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{inputs.desiredNetMarginPercent.toFixed(2)}%</TableCell>
                        <TableCell className="font-mono">{rec.executableVolume.toLocaleString('ru-RU')}</TableCell>
                        <TableCell className="font-mono">{`~${rec.estimatedExecutionDays} д.`}</TableCell>
                        <TableCell className="text-right font-mono text-primary">{rec.potentialProfit.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Не удалось смоделировать прибыльную операцию на основе исторических данных. Возможно, цена покупки выше цены продажи.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
