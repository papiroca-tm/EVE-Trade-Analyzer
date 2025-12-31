
import type { MarketHistoryItem, MarketOrderItem, UserInputs, Recommendation } from './types';

// Вспомогательная функция для расчета перцентиля
function getPercentile(data: number[], percentile: number): number {
    if (data.length === 0) return 0;
    data.sort((a, b) => a - b);
    const index = (percentile / 100) * (data.length - 1);
    if (Math.floor(index) === index) {
        return data[index];
    }
    const lower = data[Math.floor(index)];
    const upper = data[Math.ceil(index)];
    return lower + (upper - lower) * (index - Math.floor(index));
}

// Вспомогательная функция для расчета чистой прибыли
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

    // 1. Анализ исторических данных
    const historicalPrices = history.map(h => h.average);
    const totalVolume = history.reduce((sum, item) => sum + item.volume, 0);
    const averageDailyVolume = history.length > 0 ? totalVolume / history.length : 0;
    
    // 2. Моделирование единственной торговой возможности
    const recommendedBuyPrice = getPercentile(historicalPrices, 25);
    const recommendedSellPrice = getPercentile(historicalPrices, 75);

    if (recommendedBuyPrice > 0 && recommendedSellPrice > 0 && recommendedBuyPrice < recommendedSellPrice) {
        const netProfit = calculateNetProfit(recommendedBuyPrice, recommendedSellPrice, inputs);
        const netMarginPercent = (netProfit / recommendedBuyPrice) * 100;
        
        // Рекомендация создается независимо от того, выше ли она желаемой маржи.
        // Пользователь увидит реальную маржу и сам примет решение.
        const executableVolume = Math.round(averageDailyVolume * 0.15); // 15% от среднего дневного объема
        const estimatedExecutionDays = 1; // Так как мы берем долю от дневного объема

        if (executableVolume > 0) {
            recommendations.push({
                buyPrice: recommendedBuyPrice,
                sellPrice: recommendedSellPrice,
                netMarginPercent: netMarginPercent,
                profitPerItem: netProfit,
                potentialProfit: netProfit * executableVolume,
                executableVolume: executableVolume,
                estimatedExecutionDays,
            });
        }
    }


    // 3. Анализ волатильности и целевого объема
    const averagePriceHistory = history.length > 0 ? historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length : 0;
    const variance = history.length > 0 ? history.reduce((sum, h) => sum + Math.pow(h.average - averagePriceHistory, 2), 0) / history.length : 0;
    const stdDev = Math.sqrt(variance);
    const volatility = averagePriceHistory > 0 ? (stdDev / averagePriceHistory) * 100 : 0;

    let feasibility: 'low' | 'medium' | 'high' = 'low';
    if (inputs.optionalTargetVolume) {
        if (averageDailyVolume > inputs.optionalTargetVolume) {
            feasibility = 'high';
        } else if (averageDailyVolume > inputs.optionalTargetVolume * 0.25) {
            feasibility = 'medium';
        }
    } else {
        if (averageDailyVolume > 500000) feasibility = 'high';
        else if (averageDailyVolume > 50000) feasibility = 'medium';
    }

    const estimatedExecutionTimeDays = inputs.optionalTargetVolume && averageDailyVolume > 0
      ? inputs.optionalTargetVolume / averageDailyVolume
      : undefined;

    return {
      inputs,
      history,
      orders,
      buyOrders,
      sellOrders,
      recommendations, // Будет содержать 0 или 1 рекомендацию
      volumeAnalysis: {
        averageDailyVolume,
        estimatedExecutionTimeDays,
        feasibility,
      },
      priceAnalysis: {
          avgBuyPrice: buyOrders.length > 0 ? buyOrders.reduce((sum, o) => sum + o.price, 0) / buyOrders.length : 0,
          avgSellPrice: sellOrders.length > 0 ? sellOrders.reduce((sum, o) => sum + o.price, 0) / sellOrders.length : 0,
          volatility
      }
    };
}
