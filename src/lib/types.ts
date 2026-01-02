

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
  executionDays: number;
  volatilityFactor: number;
  positionCapital?: number;
}

export type Feasibility = 'low' | 'medium' | 'high' | 'very high';

export interface PriceRange {
  longTerm: number;
  midTerm: number;
  shortTerm: number;
  average: number;
}

export interface Recommendation {
  buyPriceRange: PriceRange;
  sellPriceRange: PriceRange;
  netMarginPercent: number;
  potentialProfit: number;
  targetVolume: number;
  feasibilityReason: string;
  estimatedBuyVolumePerDay: number;
  estimatedSellVolumePerDay: number;
}

export interface PriceAnalysis {
    bestBuyPrice: number;
    bestSellPrice: number;
    midPrice: number;
    volatility: number;
    averagePrice: number;
}

export interface AnalysisResult {
  inputs: UserInputs;
  history: MarketHistoryItem[];
  buyOrders: MarketOrderItem[];
  sellOrders: MarketOrderItem[];
  recommendations: Recommendation[]; // Though we will likely only generate one
  volumeAnalysis: {
    averageDailyVolume: number;
    totalBuyOrderVolume: number;
    totalSellOrderVolume: number;
    totalVolume: number;
  };
  priceAnalysis: PriceAnalysis;
}

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AnalysisState {
  status: AnalysisStatus;
  data: AnalysisResult | null;
  error: string | null;
}

export interface Region {
    region_id: number;
    name: string;
}

export interface ItemType {
    type_id: number;
    name: string;
}
