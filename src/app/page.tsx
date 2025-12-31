
'use client';

import { useActionState } from 'react';
import { getMarketAnalysis } from '@/lib/actions';
import type { AnalysisState } from '@/lib/types';
import { InputForm } from '@/components/input-form';
import { ResultsDisplay } from '@/components/results-display';
import { Icons } from '@/components/icons';

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
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-2">
          <Icons.logo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            EVE Market Navigator
          </h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 lg:flex-row">
        <div className="w-full lg:w-[28rem]">
          <div className="sticky top-20">
            <InputForm formAction={formAction} />
          </div>
        </div>
        <div className="flex-1">
          <ResultsDisplay state={state} />
        </div>
      </main>
    </div>
  );
}
