'use client';
import type { AnalysisState } from '@/lib/types';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Bot } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ResultsSkeleton } from './panels/results-skeleton';
import { RecommendationsPanel } from './panels/recommendations-panel';
import { DataIntegrityPanel } from './panels/data-integrity-panel';
import { MarketHistoryPanel } from './panels/market-history-panel';
import { OrderBookPanel } from './panels/order-book-panel';

export function ResultsDisplay({ state }: { state: AnalysisState }) {
  const { toast } = useToast();

  useEffect(() => {
    if (state.status === 'error' && state.error) {
      toast({
        variant: 'destructive',
        title: 'Анализ не удался',
        description: state.error,
      });
    }
  }, [state.status, state.error, toast]);

  switch (state.status) {
    case 'idle':
      return (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-card/50 p-8 text-center">
            <div>
                <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">Готов к анализу</h2>
                <p className="mt-2 text-muted-foreground">Введите параметры и нажмите "Анализировать рынок", чтобы начать.</p>
            </div>
        </div>
      );
    case 'loading':
      return <ResultsSkeleton />;
    case 'error':
      return (
         <Alert variant="destructive" className="h-full">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>
                <p>Не удалось завершить анализ.</p>
                <p className="mt-2 font-mono text-xs">{state.error}</p>
            </AlertDescription>
        </Alert>
      );
    case 'success':
      if (!state.data) return null;
      return (
        <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2">
            <div className="lg:col-span-2">
                <RecommendationsPanel data={state.data} />
            </div>
            <DataIntegrityPanel data={state.data.dataIntegrity} />
            <MarketHistoryPanel history={state.data.history.slice(0, state.data.inputs.timeHorizonDays)} />
            <OrderBookPanel 
              buyOrders={state.data.buyOrders} 
              sellOrders={state.data.sellOrders} 
              averageDailyVolume={state.data.volumeAnalysis.averageDailyVolume}
            />
        </div>
      );
    default:
      return null;
  }
}
