
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

  // Логика для маржинальной торговли: разместить ордер на покупку и дождаться его исполнения,
  // затем разместить ордер на продажу и дождаться его исполнения.
  const highestBuyOrder = buyOrders[0];
  const lowestSellOrder = sellOrders[0];

  if (highestBuyOrder && lowestSellOrder) {
    // Рекомендуемая цена для НАШЕГО ордера на покупку: чуть выше самой высокой существующей цены покупки.
    const recommendedBuyPrice = highestBuyOrder.price + 0.01;
    // Рекомендуемая цена для НАШЕГО ордера на продажу: чуть ниже самой низкой существующей цены продажи.
    const recommendedSellPrice = lowestSellOrder.price - 0.01;

    if (recommendedBuyPrice < recommendedSellPrice) {
        const netProfit = calculateNetProfit(recommendedBuyPrice, recommendedSellPrice, inputs);
        const netMargin = (netProfit / recommendedBuyPrice) * 100;

        if (netMargin >= inputs.desiredNetMarginPercent) {
            // "Исполняемый объем" - это оценка ликвидности. 
            // Возьмем меньший из объемов на вершине стакана, так как это наиболее релевантные ордера, которые мы "перебиваем".
            const executableVolume = Math.min(highestBuyOrder.volume_remain, lowestSellOrder.volume_remain);
            
            recommendations.push({
                buyPrice: recommendedBuyPrice,
                sellPrice: recommendedSellPrice,
                netMarginPercent: netMargin,
                profitPerItem: netProfit,
                potentialProfit: netProfit * executableVolume,
                executableVolume: executableVolume,
            });
        }
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
    recommendations,
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
