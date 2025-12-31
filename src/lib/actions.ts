
'use server';

import { z } from 'zod';
import { calculateAnalysis } from './analysis';
import { analyzeDataIntegrity } from '@/ai/flows/data-integrity-analysis';
import { fetchMarketHistory, fetchMarketOrders, getRegions, searchItemTypes } from './eve-esi';
import type { AnalysisState, AnalysisResult, Region, ItemType } from './types';

const formSchema = z.object({
  regionId: z.coerce.number().int().positive("Region ID must be a positive number."),
  typeId: z.coerce.number().int().positive("Type ID must be a positive number."),
  brokerBuyFeePercent: z.coerce.number().min(0).max(100),
  brokerSellFeePercent: z.coerce.number().min(0).max(100),
  salesTaxPercent: z.coerce.number().min(0).max(100),
  desiredNetMarginPercent: z.coerce.number().min(0).max(1000),
  timeHorizonDays: z.coerce.number().int().positive().min(1).max(365),
  optionalTargetVolume: z.coerce.number().int().positive().optional(),
});

export async function getMarketAnalysis(
  prevState: AnalysisState,
  formData: FormData
): Promise<AnalysisState> {
  
  const validatedFields = formSchema.safeParse({
    regionId: formData.get('regionId'),
    typeId: formData.get('typeId'),
    brokerBuyFeePercent: formData.get('brokerBuyFeePercent'),
    brokerSellFeePercent: formData.get('brokerSellFeePercent'),
    salesTaxPercent: formData.get('salesTaxPercent'),
    desiredNetMarginPercent: formData.get('desiredNetMarginPercent'),
    timeHorizonDays: formData.get('timeHorizonDays'),
    optionalTargetVolume: formData.get('optionalTargetVolume') || undefined,
  });

  if (!validatedFields.success) {
    return {
      status: 'error',
      data: null,
      error: "Invalid form data. Please check your inputs.",
      warnings: validatedFields.error.issues.map(i => i.message),
    };
  }

  const inputs = validatedFields.data;

  try {
    const [history, orders] = await Promise.all([
      fetchMarketHistory(inputs.regionId, inputs.typeId),
      fetchMarketOrders(inputs.regionId, inputs.typeId),
    ]);

    const warnings: string[] = [];
    if (history.length === 0) warnings.push("No market history found for this item in the selected region.");
    if (orders.length === 0) warnings.push("No active orders found for this item in the selected region.");
    if (history.length < inputs.timeHorizonDays) warnings.push("Historical data is shorter than the selected time horizon.");

    const analysis = calculateAnalysis(history, orders, inputs);
    
    const dataIntegrityInput = {
        marketHistoryData: JSON.stringify(history),
        marketOrderData: JSON.stringify(orders),
        timeHorizonDays: inputs.timeHorizonDays,
    };
    
    const dataIntegrity = await analyzeDataIntegrity(dataIntegrityInput);
    
    const result: AnalysisResult = {
        ...analysis,
        dataIntegrity,
    };

    return {
      status: 'success',
      data: result,
      error: null,
      warnings: [...warnings, ...dataIntegrity.warnings],
    };

  } catch (error) {
    console.error("Error during market analysis:", error);
    return {
      status: 'error',
      data: null,
      error: error instanceof Error ? error.message : "An unknown error occurred during analysis.",
      warnings: [],
    };
  }
}

export async function getInitialData(): Promise<{ regions: Region[], itemTypes: ItemType[] }> {
    try {
        const regions = await getRegions();
        // Pre-warm with Tritanium as a default
        const initialItems = await searchItemTypes('Tritanium');
        return { regions, itemTypes: initialItems };
    } catch (error) {
        console.error("Failed to get initial data", error);
        // Return empty arrays on failure so the app doesn't crash
        return { regions: [], itemTypes: [] };
    }
}
