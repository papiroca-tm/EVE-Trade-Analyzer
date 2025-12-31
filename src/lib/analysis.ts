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

  // Limit iterations to avoid performance issues with huge order books
  const sellOrderCap = Math.min(sellOrders.length, 500);
  const buyOrderCap = Math.min(buyOrders.length, 500);

  for (let i = 0; i < sellOrderCap; i++) {
    const sellOrder = sellOrders[i];
    for (let j = 0; j < buyOrderCap; j++) {
      const buyOrder = buyOrders[j];

      if (buyOrder.price >= sellOrder.price) continue;

      const netProfit = calculateNetProfit(buyOrder.price, sellOrder.price, inputs);
      if (netProfit <= 0) continue; // Early exit if there's no gross profit

      const netMargin = (netProfit / buyOrder.price) * 100;
      
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
    .slice(0, 100); // Increased to show more options

  const totalVolume = history.reduce((sum, item) => sum + item.volume, 0);
  const averageDailyVolume = history.length > 0 ? totalVolume / history.length : 0;
  
  let feasibility: 'low' | 'medium' | 'high' = 'low';
  if (inputs.optionalTargetVolume) {
      if (averageDailyVolume > inputs.optionalTargetVolume * 0.5) {
          feasibility = 'high';
      } else if (averageDailyVolume > inputs.optionalTargetVolume * 0.1) {
          feasibility = 'medium';
      }
  } else {
      if (averageDailyVolume > 500000) feasibility = 'high';
      else if (averageDailyVolume > 50000) feasibility = 'medium';
  }


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
