
'use server';

import { z } from 'zod';
import { calculateAnalysis } from './analysis';
import { analyzeDataIntegrity, type DataIntegrityOutput } from '@/ai/flows/data-integrity-analysis';
import { fetchMarketHistory, fetchMarketOrders, getRegions, getInitialItemTypes } from './eve-esi';
import type { AnalysisState, AnalysisResult, Region, ItemType } from './types';

const formSchema = z.object({
  regionId: z.coerce.number().int().positive("ID региона должен быть положительным числом."),
  typeId: z.coerce.number().int().positive("ID типа должен быть положительным числом."),
  brokerBuyFeePercent: z.coerce.number().min(0).max(100),
  brokerSellFeePercent: z.coerce.number().min(0).max(100),
  salesTaxPercent: z.coerce.number().min(0).max(100),
  desiredNetMarginPercent: z.coerce.number().min(0).max(1000),
  timeHorizonDays: z.coerce.number().int().positive().min(1).max(365),
  optionalTargetVolume: z.coerce.number().int().positive().optional(),
  runAiAnalysis: z.boolean().default(false),
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
    runAiAnalysis: formData.get('runAiAnalysis') === 'on',
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
    
    let dataIntegrity: DataIntegrityOutput;
    if (inputs.runAiAnalysis) {
        const dataIntegrityInput = {
            marketHistoryData: JSON.stringify(history),
            marketOrderData: JSON.stringify(orders),
            timeHorizonDays: inputs.timeHorizonDays,
        };
        dataIntegrity = await analyzeDataIntegrity(dataIntegrityInput);
    } else {
        dataIntegrity = {
            analysisReport: 'AI-анализ не проводился. Включите опцию, чтобы запустить его.',
            dataReliabilityScore: 0,
            warnings: [],
        };
    }
    
    const result: AnalysisResult = {
        ...analysis,
        dataIntegrity,
    };

    return {
      status: 'success',
      data: result,
      error: null,
      warnings: [...baseWarnings, ...dataIntegrity.warnings],
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
        const [regions, initialItems] = await Promise.all([
          getRegions(),
          getInitialItemTypes(),
        ]);
        
        const finalItems = new Map<number, ItemType>();
        // Ensure Tritanium is always in the list as a default
        const tritanium = { type_id: 34, name: 'Tritanium' };
        finalItems.set(tritanium.type_id, tritanium);
        initialItems.forEach(item => finalItems.set(item.type_id, item));

        return { regions, itemTypes: Array.from(finalItems.values()) };
    } catch (error) {
        console.error("Failed to get initial data", error);
        // Fallback to avoid complete UI crash
        return { regions: [], itemTypes: [{ type_id: 34, name: 'Tritanium' }] };
    }
}

    