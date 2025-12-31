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
        title: 'Analysis Failed',
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
                <h2 className="mt-4 text-xl font-semibold">Ready for Analysis</h2>
                <p className="mt-2 text-muted-foreground">Enter your parameters and click "Analyze Market" to begin.</p>
            </div>
        </div>
      );
    case 'loading':
      return <ResultsSkeleton />;
    case 'error':
      return (
         <Alert variant="destructive" className="h-full">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
                <p>The analysis could not be completed.</p>
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
            <OrderBookPanel buyOrders={state.data.buyOrders} sellOrders={state.data.sellOrders} />
        </div>
      );
    default:
      return null;
  }
}
