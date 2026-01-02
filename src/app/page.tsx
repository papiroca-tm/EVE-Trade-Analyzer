'use client';

import { useActionState, useState, useEffect } from 'react';
import { getMarketAnalysis, getInitialData } from '@/lib/actions';
import type { AnalysisState, Region, ItemType } from '@/lib/types';
import { InputForm } from '@/components/input-form';
import { ResultsDisplay } from '@/components/results-display';
import { Icons } from '@/components/icons';
import { OrderBookDisplay } from '@/components/order-book-display';
import { Loader2 } from 'lucide-react';


const initialState: AnalysisState = {
  status: 'idle',
  data: null,
  error: null,
};

const LoadingOverlay = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-lg font-semibold text-foreground">Получение данных...</p>
      <p className="text-sm text-muted-foreground">Загружаем регионы и предметы EVE Online.</p>
    </div>
  </div>
);


export default function Home() {
  const [state, formAction] = useActionState(getMarketAnalysis, initialState);
  const [initialData, setInitialData] = useState<{ regions: Region[], itemTypes: ItemType[] }>({ regions: [], itemTypes: [] });
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoadingInitialData(true);
      try {
        const data = await getInitialData();
        setInitialData(data);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setLoadingInitialData(false);
      }
    }
    fetchData();
  }, []);

  const recommendation = state.data?.recommendations?.[0];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {loadingInitialData && <LoadingOverlay />}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm md:px-3">
        <div className="flex items-center gap-2">
          <Icons.logo className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            EVE Market Navigator
          </h1>
        </div>
      </header>
      <main className="grid flex-1 grid-cols-10 gap-2 p-2 md:gap-4 md:p-4">
        <div className="col-span-3 grid grid-cols-2 gap-2 md:gap-4">
            <div className="col-span-1">
                <InputForm 
                  formAction={formAction} 
                  initialData={initialData}
                  isLoading={loadingInitialData}
                />
            </div>
            <div className="col-span-1">
                <OrderBookDisplay
                    buyOrders={state.data?.buyOrders ?? []}
                    sellOrders={state.data?.sellOrders ?? []}
                    priceAnalysis={state.data?.priceAnalysis}
                    estimatedBuyVolumePerDay={recommendation?.estimatedBuyVolumePerDay ?? state.data?.volumeAnalysis.averageDailyVolume ?? 0}
                    estimatedSellVolumePerDay={recommendation?.estimatedSellVolumePerDay ?? state.data?.volumeAnalysis.averageDailyVolume ?? 0}
                    inputs={state.data?.inputs}
                />
            </div>
        </div>
        <div className="col-span-7">
          <ResultsDisplay state={state} />
        </div>
      </main>
    </div>
  );
}
