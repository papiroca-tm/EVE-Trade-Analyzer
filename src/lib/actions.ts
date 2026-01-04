
'use server';

import { z } from 'zod';
import { calculateAnalysis } from './analysis';
import { fetchMarketHistory, fetchMarketOrders, getRegions, getAllMarketableTypes } from './eve-esi';
import type { AnalysisState, AnalysisResult, Region, ItemType, UserInputs } from './types';

const formSchema = z.object({
  regionId: z.coerce.number().int().positive("ID региона должен быть положительным числом."),
  typeId: z.coerce.number().int().positive("ID типа должен быть положительным числом."),
  brokerBuyFeePercent: z.coerce.number().min(0).max(100),
  brokerSellFeePercent: z.coerce.number().min(0).max(100),
  salesTaxPercent: z.coerce.number().min(0).max(100),
  desiredNetMarginPercent: z.coerce.number().min(0).max(1000),
  volumeFactor: z.coerce.number().min(0, "Коэффициент объема должен быть положительным."),
  timeHorizonDays: z.coerce.number().int().positive().min(1).max(365),
  executionDays: z.coerce.number().int().positive().min(1).max(90),
  positionCapital: z.coerce.number().int().positive().optional(),
});

export async function getMarketAnalysis(
  prevState: AnalysisState,
  formData: FormData
): Promise<AnalysisState> {
  
  const positionCapitalRaw = formData.get('positionCapital') as string | null;
  const cleanedString = positionCapitalRaw?.replace(/\./g, '');
  const finalPositionCapital = cleanedString ? Number(cleanedString) : undefined;

  const validatedFields = formSchema.safeParse({
    regionId: formData.get('regionId'),
    typeId: formData.get('typeId'),
    brokerBuyFeePercent: formData.get('brokerBuyFeePercent'),
    brokerSellFeePercent: formData.get('brokerSellFeePercent'),
    salesTaxPercent: formData.get('salesTaxPercent'),
    desiredNetMarginPercent: formData.get('desiredNetMarginPercent'),
    volumeFactor: formData.get('volumeFactor'),
    timeHorizonDays: formData.get('timeHorizonDays'),
    executionDays: formData.get('executionDays'),
    positionCapital: finalPositionCapital,
  });

  if (!validatedFields.success) {
    return {
      status: 'error',
      data: null,
      error: validatedFields.error.issues.map(i => i.message).join('; '),
    };
  }

  const inputs: UserInputs = validatedFields.data;

  try {
    const [history, orders] = await Promise.all([
      fetchMarketHistory(inputs.regionId, inputs.typeId),
      fetchMarketOrders(inputs.regionId, inputs.typeId),
    ]);
    
    const analysis = await calculateAnalysis(history, orders, inputs);
        
    const result: AnalysisResult = {
        ...analysis,
    };

    return {
      status: 'success',
      data: result,
      error: null,
    };

  } catch (error) {
    console.error("Error during market analysis:", error);
    return {
      status: 'error',
      data: null,
      error: error instanceof Error ? error.message : "Произошла неизвестная ошибка во время анализа.",
    };
  }
}

export async function getInitialData(): Promise<{ regions: Region[], itemTypes: ItemType[] }> {
    try {
        const defaultRegionId = 10000002; // The Forge
        const [regions, itemTypes] = await Promise.all([
          getRegions(),
          getAllMarketableTypes(defaultRegionId),
        ]);
        
        return { regions, itemTypes };
    } catch (error) {
        console.error("Failed to get initial data", error);
        // Fallback to a very small list if the main fetch fails
        return { 
            regions: [{ region_id: 10000002, name: 'The Forge' }], 
            itemTypes: [{ type_id: 34, name: 'Tritanium' }] 
        };
    }
}
