'use server';

/**
 * @fileOverview Этот flow анализирует рыночные данные EVE Online на предмет расхождений и потенциальных проблем с надежностью данных с помощью генеративного AI.
 *
 * - analyzeDataIntegrity - функция, которая анализирует целостность рыночных данных.
 * - DataIntegrityInput - входной тип для функции analyzeDataIntegrity.
 * - DataIntegrityOutput - возвращаемый тип для функции analyzeDataIntegrity.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DataIntegrityInputSchema = z.object({
  marketHistoryData: z.string().describe('Необработанные данные истории рынка в виде строки JSON.'),
  marketOrderData: z.string().describe('Необработанные данные рыночных ордеров в виде строки JSON.'),
  timeHorizonDays: z.number().describe('Временной горизонт в днях для анализа.'),
});
export type DataIntegrityInput = z.infer<typeof DataIntegrityInputSchema>;

const DataIntegrityOutputSchema = z.object({
  analysisReport: z.string().describe('Подробный отчет по анализу целостности данных, потенциальных расхождений и проблем с надежностью.'),
  dataReliabilityScore: z.number().describe('Числовая оценка общей надежности данных (0-100).'),
  warnings: z.array(z.string()).describe('Список предупреждений о потенциальных проблемах с данными.'),
});
export type DataIntegrityOutput = z.infer<typeof DataIntegrityOutputSchema>;

export async function analyzeDataIntegrity(input: DataIntegrityInput): Promise<DataIntegrityOutput> {
  return dataIntegrityAnalysisFlow(input);
}

const dataIntegrityAnalysisPrompt = ai.definePrompt({
  name: 'dataIntegrityAnalysisPrompt',
  input: {schema: DataIntegrityInputSchema},
  output: {schema: DataIntegrityOutputSchema},
  prompt: `Вы — эксперт-аналитик данных, специализирующийся на рыночных данных EVE Online. Ваша задача — сгенерировать ответ на русском языке.

Вы проанализируете предоставленные данные истории рынка и данные рыночных ордеров, чтобы выявить любые расхождения, несоответствия или потенциальные проблемы с надежностью данных.

Учитывайте временной горизонт при оценке данных. Определите, является ли объем данных статистически надежным для принятия торговых решений.

Предоставьте подробный аналитический отчет на русском языке, оценку надежности данных (0-100) и список предупреждений на русском языке о любых потенциальных проблемах с данными.

Данные истории рынка: {{{marketHistoryData}}}
Данные рыночных ордеров: {{{marketOrderData}}}
Временной горизонт (дни): {{{timeHorizonDays}}}
`,
});

const dataIntegrityAnalysisFlow = ai.defineFlow(
  {
    name: 'dataIntegrityAnalysisFlow',
    inputSchema: DataIntegrityInputSchema,
    outputSchema: DataIntegrityOutputSchema,
  },
  async input => {
    try {
      const {output} = await dataIntegrityAnalysisPrompt(input);
      return output!;
    } catch (error: any) {
      console.error('Error in dataIntegrityAnalysisFlow:', error);
      throw new Error(`Анализ целостности данных не удался: ${error.message}`);
    }
  }
);
