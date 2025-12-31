'use client';

import { useActionState } from 'react';
import { getMarketAnalysis } from '@/lib/actions';
import type { AnalysisState } from '@/lib/types';
import { InputForm } from '@/components/input-form';
import { ResultsDisplay } from '@/components/results-display';
import { Icons } from '@/components/icons';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

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
      <main className="grid flex-1 grid-cols-5 gap-2 p-2 md:gap-4 md:p-4">
        <div className="col-span-1 grid grid-cols-2 gap-2">
            <div className="col-span-2 md:col-span-1">
                 <div className="sticky top-16 flex flex-col gap-2">
                    <InputForm formAction={formAction} />
                 </div>
            </div>
            <div className="col-span-2 md:col-span-1">
                <div className="sticky top-16 flex flex-col gap-2">
                    <Card>
                    <CardHeader className="p-3">
                        <CardTitle className="text-lg">Стакан</CardTitle>
                    </CardHeader>
                    </Card>
                </div>
            </div>
        </div>
        <div className="col-span-4">
          <ResultsDisplay state={state} />
        </div>
      </main>
    </div>
  );
}
