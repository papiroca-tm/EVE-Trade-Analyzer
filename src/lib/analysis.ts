import type { MarketHistoryItem, MarketOrderItem, UserInputs, Recommendation } from './types';

function calculateNetProfit(buyPrice: number, sellPrice: number, inputs: UserInputs) {
    const buyCost = buyPrice * (1 + inputs.brokerBuyFeePercent / 100);
    const sellRevenue = sellPrice * (1 - inputs.brokerSellFeePercent / 100 - inputs.salesTaxPercent / 100);
    return sellRevenue - buyCost;
}

export function calculateAnalysis(
  history: MarketHistoryItem[],
  orders: MarketOrderItem[],
  inputs: UserInputs
) {
  const buyOrders = orders.filter(o => o.is_buy_order).sort((a, b) => b.price - a.price);
  const sellOrders = orders.filter(o => !o.is_buy_order).sort((a, b) => a.price - b.price);

  const recommendations: Recommendation[] = [];

  for (const sellOrder of sellOrders) {
    for (const buyOrder of buyOrders) {
      if (buyOrder.price >= sellOrder.price) continue;

      const netProfit = calculateNetProfit(buyOrder.price, sellOrder.price, inputs);
      const netMargin = netProfit / buyOrder.price * 100;
      
      if (netMargin >= inputs.desiredNetMarginPercent) {
        const executableVolume = Math.min(buyOrder.volume_remain, sellOrder.volume_remain);
        recommendations.push({
          buyPrice: buyOrder.price,
          sellPrice: sellOrder.price,
          netMarginPercent: netMargin,
          profitPerItem: netProfit,
          potentialProfit: netProfit * executableVolume,
          executableVolume: executableVolume,
        });
      }
    }
  }

  const topRecommendations = recommendations
    .sort((a,b) => b.potentialProfit - a.potentialProfit)
    .slice(0, 20);

  const totalVolume = history.reduce((sum, item) => sum + item.volume, 0);
  const averageDailyVolume = history.length > 0 ? totalVolume / history.length : 0;
  
  let feasibility: 'low' | 'medium' | 'high' = 'low';
  if (averageDailyVolume > 10000) feasibility = 'medium';
  if (averageDailyVolume > 100000) feasibility = 'high';

  const estimatedExecutionTimeDays = inputs.optionalTargetVolume && averageDailyVolume > 0
    ? inputs.optionalTargetVolume / averageDailyVolume
    : undefined;

  const avgBuyPrice = buyOrders.length > 0 ? buyOrders.reduce((sum, o) => sum + o.price, 0) / buyOrders.length : 0;
  const avgSellPrice = sellOrders.length > 0 ? sellOrders.reduce((sum, o) => sum + o.price, 0) / sellOrders.length : 0;
  
  const averagePriceHistory = history.length > 0 ? history.reduce((sum, h) => sum + h.average, 0) / history.length : 0;
  const variance = history.length > 0 ? history.reduce((sum, h) => sum + Math.pow(h.average - averagePriceHistory, 2), 0) / history.length : 0;
  const stdDev = Math.sqrt(variance);
  const volatility = averagePriceHistory > 0 ? (stdDev / averagePriceHistory) * 100 : 0;

  return {
    inputs,
    history,
    orders,
    buyOrders,
    sellOrders,
    recommendations: topRecommendations,
    volumeAnalysis: {
      averageDailyVolume,
      estimatedExecutionTimeDays,
      feasibility,
    },
    priceAnalysis: {
        avgBuyPrice,
        avgSellPrice,
        volatility
    }
  };
}
