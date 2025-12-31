
'use server';

import { z } from 'zod';
import { calculateAnalysis } from './analysis';
import { fetchMarketHistory, fetchMarketOrders, getRegions, getAllMarketableTypes } from './eve-esi';
import type { AnalysisState, AnalysisResult, Region, ItemType } from './types';

const formSchema = z.object({
  regionId: z.coerce.number().int().positive("ID региона должен быть положительным числом."),
  typeId: z.coerce.number().int().positive("ID типа должен быть положительным числом."),
  brokerBuyFeePercent: z.coerce.number().min(0).max(100),
  brokerSellFeePercent: z.coerce.number().min(0).max(100),
  salesTaxPercent: z.coerce.number().min(0).max(100),
  desiredNetMarginPercent: z.coerce.number().min(0).max(1000),
  timeHorizonDays: z.coerce.number().int().positive().min(1).max(365),
  executionDays: z.coerce.number().int().positive().min(1).max(90),
  volatilityFactor: z.coerce.number().min(0.1).max(5),
  positionCapital: z.coerce.number().int().positive().optional(),
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
    executionDays: formData.get('executionDays'),
    volatilityFactor: formData.get('volatilityFactor'),
    positionCapital: formData.get('positionCapital') || undefined,
  });

  if (!validatedFields.success) {
    return {
      status: 'error',
      data: null,
      error: "Неверные данные формы. Пожалуйста, проверьте введенные значения.",
      warnings: validatedFields.error.issues.map(i => i.message),
    };
  }

  const inputs = validatedFields.data;

  try {
    const [history, orders] = await Promise.all([
      fetchMarketHistory(inputs.regionId, inputs.typeId),
      fetchMarketOrders(inputs.regionId, inputs.typeId),
    ]);

    const baseWarnings: string[] = [];
    if (history.length === 0) baseWarnings.push("История рынка для этого предмета в выбранном регионе не найдена.");
    if (orders.length === 0) baseWarnings.push("Активные ордера для этого предмета в выбранном регионе не найдены.");
    if (history.length < inputs.timeHorizonDays) baseWarnings.push("Исторические данные охватывают меньший период, чем выбранный временной горизонт.");

    const analysis = calculateAnalysis(history, orders, inputs);
    
    if (analysis.recommendations.length === 0) {
      baseWarnings.push("Не удалось смоделировать прибыльную операцию с заданной маржой. Попробуйте снизить желаемую маржу или выбрать другой предмет/регион.");
    } else {
      const feasibility = analysis.recommendations[0].feasibility;
      if(feasibility === 'low' || feasibility === 'medium') {
        baseWarnings.push(`Низкая выполнимость рекомендации. ${analysis.recommendations[0].feasibilityReason}`);
      }
    }
    
    const result: AnalysisResult = {
        ...analysis,
    };

    return {
      status: 'success',
      data: result,
      error: null,
      warnings: baseWarnings,
    };

  } catch (error) {
    console.error("Error during market analysis:", error);
    return {
      status: 'error',
      data: null,
      error: error instanceof Error ? error.message : "Произошла неизвестная ошибка во время анализа.",
      warnings: [],
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
