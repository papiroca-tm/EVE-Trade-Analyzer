
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

  // Вы абсолютно правы. Мы должны сравнивать только лучший ордер на покупку с лучшим ордером на продажу.
  const bestBuyOrder = buyOrders[0];
  const bestSellOrder = sellOrders[0];

  if (bestBuyOrder && bestSellOrder && bestBuyOrder.price < bestSellOrder.price) {
    // Эта логика для маржинальной торговли: разместить ордер на покупку и дождаться его исполнения,
    // затем разместить ордер на продажу и дождаться его исполнения.
    // Цена "покупки" - это цена, по которой мы ставим наш ордер на покупку (равна bestBuyOrder.price)
    // Цена "продажи" - это цена, по которой мы ставим наш ордер на продажу (равна bestSellOrder.price)
    const netProfit = calculateNetProfit(bestBuyOrder.price, bestSellOrder.price, inputs);
    const netMargin = (netProfit / bestBuyOrder.price) * 100;

    if (netMargin >= inputs.desiredNetMarginPercent) {
        // "Исполняемый объем" в данном случае - это скорее оценка ликвидности.
        // Возьмем меньший из объемов на вершине стакана.
        const executableVolume = Math.min(bestBuyOrder.volume_remain, bestSellOrder.volume_remain);
        recommendations.push({
            buyPrice: bestBuyOrder.price,
            sellPrice: bestSellOrder.price,
            netMarginPercent: netMargin,
            profitPerItem: netProfit,
            potentialProfit: netProfit * executableVolume,
            executableVolume: executableVolume,
        });
    }
  }


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
    recommendations: recommendations, // Возвращаем только одну, но правильную рекомендацию
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

