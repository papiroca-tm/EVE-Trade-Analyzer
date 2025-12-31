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
  const { priceAnalysis, volumeAnalysis, recommendations } = data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-accent" />
            <CardTitle>Analysis & Recommendations</CardTitle>
        </div>
        <CardDescription>Key metrics and profitable trade opportunities based on your parameters.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={<Percent size={20}/>} title="Volatility" value={priceAnalysis.volatility.toFixed(2)} unit="%"/>
            <StatCard icon={<TrendingUp size={20}/>} title="Avg. Daily Vol" value={Math.floor(volumeAnalysis.averageDailyVolume).toLocaleString()} />
            {volumeAnalysis.estimatedExecutionTimeDays && (
                 <StatCard icon={<Clock size={20}/>} title="Est. Exec. Time" value={volumeAnalysis.estimatedExecutionTimeDays.toFixed(1)} unit="days"/>
            )}
            <div className="flex items-center justify-center rounded-lg bg-muted/50 p-4">
                <div>
                    <p className="text-sm text-muted-foreground text-center">Volume Feasibility</p>
                    <Badge variant={volumeAnalysis.feasibility === 'high' ? 'default' : volumeAnalysis.feasibility === 'medium' ? 'secondary' : 'destructive'} className="mt-2 w-full justify-center text-lg capitalize">
                       {volumeAnalysis.feasibility}
                    </Badge>
                </div>
            </div>
        </div>

        <div>
            <h3 className="mb-2 text-lg font-semibold">Top Opportunities</h3>
            <ScrollArea className="h-64 w-full rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50">
                  <TableRow>
                    <TableHead>Buy Price</TableHead>
                    <TableHead>Sell Price</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Potential Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recommendations.length > 0 ? (
                    recommendations.map((rec, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-green-400">{rec.buyPrice.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-red-400">{rec.sellPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-accent">{rec.netMarginPercent.toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-mono">{rec.executableVolume.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-primary">{rec.potentialProfit.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No profitable opportunities found with the given margin.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
