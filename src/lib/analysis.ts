
'use server';

import type { MarketHistoryItem, MarketOrderItem, UserInputs, Recommendation } from './types';

// Helper to build a cumulative depth ladder from orders
function buildDepthLadder(orders: MarketOrderItem[], side: 'buy' | 'sell'): { price: number; volume: number; cumulativeVolume: number }[] {
    const sortedOrders = [...orders].sort((a, b) => side === 'buy' ? b.price - a.price : a.price - b.price);
    let cumulativeVolume = 0;
    return sortedOrders.map(order => {
        cumulativeVolume += order.volume_remain;
        return {
            price: order.price,
            volume: order.volume_remain,
            cumulativeVolume,
        };
    });
}

// Estimate volume ahead of a certain price
function getVolumeAhead(ladder: { price: number; cumulativeVolume: number }[], price: number, side: 'buy' | 'sell'): number {
    const relevantOrders = side === 'buy'
        ? ladder.filter(step => step.price > price)
        : ladder.filter(step => step.price < price);

    if (relevantOrders.length === 0) {
        return 0;
    }
    return relevantOrders[relevantOrders.length - 1].cumulativeVolume;
}

function findStrategicPrice(
    orders: MarketOrderItem[],
    ladder: { price: number; cumulativeVolume: number }[],
    averageDailyVolume: number,
    executionDays: number,
    side: 'buy' | 'sell',
    inputs: UserInputs
): { price: number, reason: string } {
    const tickSize = 0.01;
    if (orders.length === 0) {
        return { price: 0, reason: `Нет ордеров на ${side === 'buy' ? 'покупку' : 'продажу'} для анализа.` };
    }

    const sortedOrders = [...orders].sort((a, b) => side === 'buy' ? b.price - a.price : a.price - b.price);
    const bestPrice = sortedOrders[0].price;
    
    const marketPower = (averageDailyVolume / 2) * (executionDays / 2);
    const wallThreshold = marketPower;
    
    let cumulativeVolumeForWall = 0;
    let wallIndex = -1;

    for (const [index, order] of sortedOrders.entries()) {
        cumulativeVolumeForWall += order.volume_remain;
        if (cumulativeVolumeForWall >= wallThreshold) {
            wallIndex = index;
            break;
        }
    }
    
    if (wallIndex === -1) {
        wallIndex = sortedOrders.length - 1;
    }
    
    for (let i = wallIndex; i >= 0; i--) {
        const order = sortedOrders[i];
        const volumeAhead = getVolumeAhead(ladder, order.price, side);
        
        if (volumeAhead < marketPower) {
            const strategicPrice = side === 'buy' ? order.price + tickSize : order.price - tickSize;
            const reason = `Стратегическая цена, рассчитанная для исполнения в рамках '${inputs.executionDays}' дневного срока сделки. Учитывает глубину рынка и конкуренцию в заданном временном горизонте.`;
            return { price: strategicPrice, reason };
        }
    }

    const fallbackPrice = side === 'buy' ? bestPrice + tickSize : bestPrice - tickSize;
    const reason = `Рынок слишком 'плотный'. Не удалось найти стратегическую цену с исполнением в срок. Рекомендуется исполнение по лучшей цене (${fallbackPrice.toFixed(2)} ISK).`;
    return { price: fallbackPrice, reason };
}

function calculateVolumeDistribution(history: MarketHistoryItem[], timeHorizonDays: number): { buyVolumePerDay: number, sellVolumePerDay: number } {
    const K = 100; // Threshold for confidence
    const relevantHistory = history.slice(-timeHorizonDays);

    if (relevantHistory.length === 0) {
        return { buyVolumePerDay: 0, sellVolumePerDay: 0 };
    }

    let totalWeight = 0;
    let totalBuyShareWeighted = 0;
    let totalVolumePeriod = 0;

    for (const day of relevantHistory) {
        let buy_share_base = 0.5;
        let confidence = 0;

        const priceRange = day.highest - day.lowest;
        if (priceRange > 0) {
            const price_position = (day.average - day.lowest) / priceRange;
            buy_share_base = 1 - price_position;
            confidence = Math.min(1, day.order_count / K);
        }

        const buy_share = confidence * buy_share_base + (1 - confidence) * 0.5;
        
        const weight = day.volume * confidence;
        
        totalBuyShareWeighted += buy_share * weight;
        totalWeight += weight;
        totalVolumePeriod += day.volume;
    }
    
    const buy_share_period = totalWeight > 0 ? totalBuyShareWeighted / totalWeight : 0.5;
    const sell_share_period = 1 - buy_share_period;

    const buy_volume_period = totalVolumePeriod * buy_share_period;
    const sell_volume_period = totalVolumePeriod * sell_share_period;
    
    const days = relevantHistory.length;
    return {
        buyVolumePerDay: days > 0 ? buy_volume_period / days : 0,
        sellVolumePerDay: days > 0 ? sell_volume_period / days : 0,
    };
}


export async function calculateAnalysis(
  history: MarketHistoryItem[],
  orders: MarketOrderItem[],
  inputs: UserInputs
) {
    const buyOrders = orders.filter(o => o.is_buy_order);
    const sellOrders = orders.filter(o => !o.is_buy_order);

    const sortedBuyOrders = [...buyOrders].sort((a, b) => b.price - a.price);
    const sortedSellOrders = [...sellOrders].sort((a, b) => a.price - b.price);
    
    const buyLadder = buildDepthLadder(buyOrders, 'buy');
    const sellLadder = buildDepthLadder(sellOrders, 'sell');

    const bestBuyPrice = buyOrders.reduce((max, o) => Math.max(max, o.price), 0);
    const bestSellPrice = sellOrders.reduce((min, o) => Math.min(min, o.price), Infinity);
    
    const totalVolume = history.reduce((sum, item) => sum + item.volume, 0);
    const averageDailyVolume = history.length > 0 ? totalVolume / history.length : 0;
    
    const averagePriceHistory = history.length > 0 ? history.reduce((sum, h) => sum + h.average, 0) / history.length : 0;
    const variance = history.length > 0 ? history.reduce((sum, h) => sum + Math.pow(h.average - averagePriceHistory, 2), 0) / history.length : 0;
    const stdDev = Math.sqrt(variance);
    const volatilityPercent = averagePriceHistory > 0 ? (stdDev / averagePriceHistory) * 100 : 0;
    
    const longTermBuyPrice = history.length > 0 ? Math.min(...history.map(h => h.lowest)) : 0;
    
    const { price: midTermBuyPriceRaw, reason: feasibilityReason } = findStrategicPrice(sortedBuyOrders, buyLadder, averageDailyVolume, inputs.executionDays, 'buy', inputs);
    const midTermBuyPrice = Math.max(midTermBuyPriceRaw, longTermBuyPrice);

    const { price: shortTermBuyPrice } = findStrategicPrice(sortedBuyOrders, buyLadder, averageDailyVolume, 2, 'buy', inputs);
    const averageBuyPrice = (midTermBuyPrice + shortTermBuyPrice) / 2;

    const longTermSellPrice = history.length > 0 ? Math.max(...history.map(h => h.highest)) : 0;
    
    const { price: midTermSellPriceRaw } = findStrategicPrice(sortedSellOrders, sellLadder, averageDailyVolume, inputs.executionDays, 'sell', inputs);
    const midTermSellPrice = longTermSellPrice > 0 ? Math.min(midTermSellPriceRaw, longTermSellPrice) : midTermSellPriceRaw;
    
    const { price: shortTermSellPrice } = findStrategicPrice(sortedSellOrders, sellLadder, averageDailyVolume, 2, 'sell', inputs);
    const averageSellPrice = (midTermSellPrice + shortTermSellPrice) / 2;

    const { buyVolumePerDay, sellVolumePerDay } = calculateVolumeDistribution(history, inputs.timeHorizonDays);

    const recommendations: Recommendation[] = [];
    
    if (averageBuyPrice > 0) {
        const cost = shortTermBuyPrice * (1 + inputs.brokerBuyFeePercent / 100);
        const revenue = shortTermSellPrice * (1 - inputs.brokerSellFeePercent/100 - inputs.salesTaxPercent/100);
        const actualNetMarginPercent = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
        
        const capital = inputs.positionCapital ?? 0;
        const targetVolume = shortTermBuyPrice > 0 && capital > 0 
            ? Math.floor(capital / shortTermBuyPrice)
            : 0;

        const sellDepthAtTarget = getVolumeAhead(sellLadder, midTermSellPrice, 'sell');
        const executableSellVolume = Math.max(0, (averageDailyVolume / 2) * (inputs.executionDays / 2) - sellDepthAtTarget);
        
        const finalExecutableVolume = Math.min(targetVolume, executableSellVolume);

        const potentialProfit = finalExecutableVolume * (midTermSellPrice - midTermBuyPrice) - (finalExecutableVolume * midTermBuyPrice * (inputs.brokerBuyFeePercent / 100)) - (finalExecutableVolume * midTermSellPrice * (inputs.brokerSellFeePercent / 100 + inputs.salesTaxPercent / 100));

        const recommendation: Recommendation = {
          buyPriceRange: { 
              longTerm: longTermBuyPrice, 
              midTerm: midTermBuyPrice,
              shortTerm: shortTermBuyPrice,
              average: averageBuyPrice,
          },
          sellPriceRange: { 
              longTerm: longTermSellPrice,
              midTerm: midTermSellPrice,
              shortTerm: shortTermSellPrice,
              average: averageSellPrice
          },
          netMarginPercent: actualNetMarginPercent,
          potentialProfit: potentialProfit > 0 ? potentialProfit : 0,
          targetVolume: targetVolume,
          feasibilityReason: feasibilityReason,
          estimatedBuyVolumePerDay: buyVolumePerDay,
          estimatedSellVolumePerDay: sellVolumePerDay,
        };
        recommendations.push(recommendation);
    }

    return {
      inputs,
      history,
      buyOrders,
      sellOrders,
      recommendations,
      volumeAnalysis: {
        averageDailyVolume,
        totalBuyOrderVolume: buyLadder.length > 0 ? buyLadder[buyLadder.length - 1].cumulativeVolume : 0,
        totalSellOrderVolume: sellLadder.length > 0 ? sellLadder[sellLadder.length - 1].cumulativeVolume : 0,
        totalVolume,
      },
      priceAnalysis: {
        bestBuyPrice,
        bestSellPrice,
        midPrice: bestBuyPrice > 0 && bestSellPrice !== Infinity ? (bestBuyPrice + bestSellPrice) / 2 : 0,
        volatility: volatilityPercent,
        averagePrice: averagePriceHistory,
      }
    };
}
