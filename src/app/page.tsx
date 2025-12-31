'use client';

import { useActionState } from 'react';
import { getMarketAnalysis } from '@/lib/actions';
import type { AnalysisState } from '@/lib/types';
import { InputForm } from '@/components/input-form';
import { ResultsDisplay } from '@/components/results-display';
import { Icons } from '@/components/icons';
import { OrderBookDisplay } from '@/components/order-book-display';


const initialState: AnalysisState = {
  status: 'idle',
  data: null,
  error: null,
  warnings: [],
};

export default function Home() {
  const [state, formAction] = useActionState(getMarketAnalysis, initialState);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm md:px-3">
        <div className="flex items-center gap-2">
          <Icons.logo className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            EVE Market Navigator
          </h1>
        </div>
      </header>
      <main className="grid flex-1 grid-cols-10 gap-2 p-2 md:gap-4 md:p-4">
        <div className="col-span-2">
          <InputForm formAction={formAction} />
        </div>
        <div className="col-span-2">
           <OrderBookDisplay
            buyOrders={state.data?.buyOrders ?? []}
            sellOrders={state.data?.sellOrders ?? []}
            priceAnalysis={state.data?.priceAnalysis}
            averageDailyVolume={state.data?.volumeAnalysis.averageDailyVolume ?? 0}
          />
        </div>
        <div className="col-span-6">
          <ResultsDisplay state={state} />
        </div>
      </main>
    </div>
  );
}
