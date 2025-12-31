'use server';

/**
 * @fileOverview This flow analyzes EVE Online market data for discrepancies and potential data reliability issues using generative AI.
 *
 * - analyzeDataIntegrity - A function that analyzes the integrity of market data.
 * - DataIntegrityInput - The input type for the analyzeDataIntegrity function.
 * - DataIntegrityOutput - The return type for the analyzeDataIntegrity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DataIntegrityInputSchema = z.object({
  marketHistoryData: z.string().describe('Raw market history data as a JSON string.'),
  marketOrderData: z.string().describe('Raw market order data as a JSON string.'),
  timeHorizonDays: z.number().describe('The time horizon in days for the analysis.'),
});
export type DataIntegrityInput = z.infer<typeof DataIntegrityInputSchema>;

const DataIntegrityOutputSchema = z.object({
  analysisReport: z.string().describe('A detailed analysis report of the data integrity, potential discrepancies, and reliability issues.'),
  dataReliabilityScore: z.number().describe('A numerical score representing the overall reliability of the data (0-100).'),
  warnings: z.array(z.string()).describe('A list of warnings regarding potential data issues.'),
});
export type DataIntegrityOutput = z.infer<typeof DataIntegrityOutputSchema>;

export async function analyzeDataIntegrity(input: DataIntegrityInput): Promise<DataIntegrityOutput> {
  return dataIntegrityAnalysisFlow(input);
}

const dataIntegrityAnalysisPrompt = ai.definePrompt({
  name: 'dataIntegrityAnalysisPrompt',
  input: {schema: DataIntegrityInputSchema},
  output: {schema: DataIntegrityOutputSchema},
  prompt: `You are an expert data analyst specializing in EVE Online market data.

You will analyze the provided market history data and market order data to identify any discrepancies, inconsistencies, or potential data reliability issues.

Consider the time horizon when evaluating the data. Determine if the amount of data is statistically reliable for making trading decisions.

Provide a detailed analysis report, a data reliability score (0-100), and a list of warnings regarding any potential data issues.

Market History Data: {{{marketHistoryData}}}
Market Order Data: {{{marketOrderData}}}
Time Horizon (Days): {{{timeHorizonDays}}}
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
      throw new Error(`Data integrity analysis failed: ${error.message}`);
    }
  }
);
