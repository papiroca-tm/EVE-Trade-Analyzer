
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

    // 1. Анализ исторических данных
    const historicalPrices = history.map(h => h.average);
    const totalVolume = history.reduce((sum, item) => sum + item.volume, 0);
    const averageDailyVolume = history.length > 0 ? totalVolume / history.length : 0;
    
    const price25thPercentile = getPercentile(historicalPrices, 25);
    const price75thPercentile = getPercentile(historicalPrices, 75);

    const averagePriceHistory = history.length > 0 ? historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length : 0;
    const variance = history.length > 0 ? history.reduce((sum, h) => sum + Math.pow(h.average - averagePriceHistory, 2), 0) / history.length : 0;
    const stdDev = Math.sqrt(variance);
    const volatility = averagePriceHistory > 0 ? (stdDev / averagePriceHistory) * 100 : 0;

    const recommendations: Recommendation[] = [];

    // 2. Анализ глубины стакана и генерация рекомендаций
    // Мы будем рассматривать несколько потенциальных "ценовых уровней" для наших ордеров,
    // основываясь на исторических данных и текущем стакане.

    // Потенциальные цены покупки: начинаем от 25-го перцентиля и идем вверх до средней цены
    const potentialBuyPrices: number[] = [];
    if (buyOrders.length > 0) {
        potentialBuyPrices.push(buyOrders[0].price + 0.01); // Классический вариант "перебить топ"
    }
    if (price25thPercentile > 0) potentialBuyPrices.push(price25thPercentile);
    
    // Потенциальные цены продажи: начинаем от 75-го перцентиля и идем вниз до средней цены
    const potentialSellPrices: number[] = [];
    if (sellOrders.length > 0) {
        potentialSellPrices.push(sellOrders[0].price - 0.01); // "Перебить" низ рынка
    }
    if (price75thPercentile > 0) potentialSellPrices.push(price75thPercentile);

    // Добавим уникальные цены, чтобы избежать дублирования
    const buyPriceSet = new Set(potentialBuyPrices.filter(p => p > 0));
    const sellPriceSet = new Set(potentialSellPrices.filter(p => p > 0));

    buyPriceSet.forEach(buyPrice => {
        sellPriceSet.forEach(sellPrice => {
            if (buyPrice >= sellPrice) {
                return; // Пропускаем бессмысленные пары
            }

            const netProfit = calculateNetProfit(buyPrice, sellPrice, inputs);
            const netMarginPercent = (netProfit / buyPrice) * 100;

            if (netMarginPercent >= inputs.desiredNetMarginPercent) {
                // 3. Оценка исполняемого объема
                // Оцениваем объем как небольшую долю (например, 10-25%) от среднего дневного объема,
                // чтобы ордер не висел на рынке слишком долго.
                const executableVolume = Math.round(averageDailyVolume * 0.15);

                if (executableVolume > 0) {
                    recommendations.push({
                        buyPrice: buyPrice,
                        sellPrice: sellPrice,
                        netMarginPercent: netMarginPercent,
                        profitPerItem: netProfit,
                        potentialProfit: netProfit * executableVolume,
                        executableVolume: executableVolume,
                    });
                }
            }
        });
    });

    // Сортируем рекомендации по марже
    recommendations.sort((a, b) => b.netMarginPercent - a.netMarginPercent);
    const uniqueRecommendations = Array.from(new Map(recommendations.map(item => [`${item.buyPrice.toFixed(2)}-${item.sellPrice.toFixed(2)}`, item])).values());


    // 4. Анализ целевого объема
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
      recommendations: uniqueRecommendations.slice(0, 50),
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
