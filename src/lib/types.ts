import type { DataIntegrityOutput } from '@/ai/flows/data-integrity-analysis';

export interface MarketHistoryItem {
  date: string;
  volume: number;
  average: number;
  highest: number;
  lowest: number;
  order_count: number;
}

export interface MarketOrderItem {
  order_id: number;
  is_buy_order: boolean;
  price: number;
  volume_remain: number;
  location_id: number;
  range: string;
}

export interface UserInputs {
  regionId: number;
  typeId: number;
  brokerBuyFeePercent: number;
  brokerSellFeePercent: number;
  salesTaxPercent: number;
  desiredNetMarginPercent: number;
  timeHorizonDays: number;
  optionalTargetVolume?: number;
}

export interface Recommendation {
  buyPrice: number;
  sellPrice: number;
  netMarginPercent: number;
  profitPerItem: number;
  potentialProfit: number;
  executableVolume: number;
}

export interface AnalysisResult {
  inputs: UserInputs;
  history: MarketHistoryItem[];
  orders: MarketOrderItem[];
  buyOrders: MarketOrderItem[];
  sellOrders: MarketOrderItem[];
  recommendations: Recommendation[];
  volumeAnalysis: {
    averageDailyVolume: number;
    estimatedExecutionTimeDays?: number;
    feasibility: 'low' | 'medium' | 'high';
  };
  priceAnalysis: {
    avgBuyPrice: number;
    avgSellPrice: number;
    volatility: number;
  };
  dataIntegrity: DataIntegrityOutput;
}

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AnalysisState {
  status: AnalysisStatus;
  data: AnalysisResult | null;
  error: string | null;
  warnings: string[];
}
