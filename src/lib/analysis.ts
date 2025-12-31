
'use server';

import type { MarketHistoryItem, MarketOrderItem, UserInputs, Recommendation, Feasibility } from './types';

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
    sortedBuyOrders: MarketOrderItem[],
    buyLadder: { price: number; cumulativeVolume: number }[],
    averageDailyVolume: number,
    executionDays: number,
): { price: number, reason: string } {
    const tickSize = 0.01;
    if (sortedBuyOrders.length === 0) {
        return { price: 0, reason: "Нет ордеров на покупку для анализа." };
    }

    const bestBuyPrice = sortedBuyOrders[0].price;
    const marketBuyPower = (averageDailyVolume / 2) * (executionDays / 2);

    // Find the "wall"
    const wallThreshold = averageDailyVolume / 2;
    let cumulativeVolumeForWall = 0;
    let wallIndex = -1;

    for (const [index, order] of sortedBuyOrders.entries()) {
        cumulativeVolumeForWall += order.volume_remain;
        if (cumulativeVolumeForWall >= wallThreshold) {
            wallIndex = index;
            break;
        }
    }

    // If no wall is found, start searching from the end
    if (wallIndex === -1) {
        wallIndex = sortedBuyOrders.length - 1;
    }

    // Search from the wall upwards
    for (let i = wallIndex; i >= 0; i--) {
        const order = sortedBuyOrders[i];
        const volumeAhead = getVolumeAhead(buyLadder, order.price, 'buy');
        
        if (volumeAhead < marketBuyPower) {
            const strategicPrice = order.price + tickSize;
            const reason = `Стратегическая цена ${strategicPrice.toFixed(2)} найдена поиском вверх от 'стены'. Объем впереди (${volumeAhead.toLocaleString('ru-RU')} ед.) меньше, чем 'сила' рынка (~${marketBuyPower.toLocaleString('ru-RU')} ед.) за ${executionDays / 2} дней.`;
            return { price: strategicPrice, reason };
        }
    }

    // If no strategic price found (dense market), return best price
    const reason = "Рынок слишком 'плотный'. Не удалось найти стратегическую цену с исполнением в срок. Рекомендуется исполнение по лучшей цене.";
    return { price: bestBuyPrice + tickSize, reason };
}


export async function calculateAnalysis(
  history: MarketHistoryItem[],
  orders: MarketOrderItem[],
  inputs: UserInputs
) {
    const buyOrders = orders.filter(o => o.is_buy_order);
    const sellOrders = orders.filter(o => !o.is_buy_order);

    const sortedBuyOrders = [...buyOrders].sort((a, b) => b.price - a.price);
    const buyLadder = buildDepthLadder(buyOrders, 'buy');
    const sellLadder = buildDepthLadder(sellOrders, 'sell');

    const bestBuyPrice = buyOrders.reduce((max, o) => Math.max(max, o.price), 0);
    const bestSellPrice = sellOrders.reduce((min, o) => Math.min(min, o.price), Infinity);
    
    const historicalPrices = history.map(h => h.average);
    const totalVolume = history.reduce((sum, item) => sum + item.volume, 0);
    const averageDailyVolume = history.length > 0 ? totalVolume / history.length : 0;
    
    const averagePriceHistory = history.length > 0 ? historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length : 0;
    const variance = history.length > 0 ? history.reduce((sum, h) => sum + Math.pow(h.average - averagePriceHistory, 2), 0) / history.length : 0;
    const stdDev = Math.sqrt(variance);
    const volatilityPercent = averagePriceHistory > 0 ? (stdDev / averagePriceHistory) * 100 : 0;
    
    // --- Price Calculation ---
    // 1. Long-Term (Optimistic)
    const longTermPrice = history.length > 0 
        ? Math.min(...history.map(h => h.lowest)) 
        : 0;

    // 2. Mid-Term (Strategic)
    const { price: midTermPrice, reason: feasibilityReason } = findStrategicPrice(sortedBuyOrders, buyLadder, averageDailyVolume, inputs.executionDays);

    // 3. Short-Term (Tactical) - Same logic but with 1 day execution
    const { price: shortTermPrice } = findStrategicPrice(sortedBuyOrders, buyLadder, averageDailyVolume, 2); // 2 * (1/2) = 1 day for buy side.

    const recommendations: Recommendation[] = [];
    
    if (midTermPrice > 0) {
        const recommendation: Recommendation = {
          buyPriceRange: { 
              longTerm: longTermPrice, 
              midTerm: midTermPrice,
              shortTerm: shortTermPrice,
          },
          sellPriceRange: { min: 0, max: 0 }, // Will be calculated later
          netMarginPercent: 0,
          potentialProfit: 0,
          executableVolume: { low: 0, high: 0 },
          estimatedExecutionDays: { min: 0, max: 0 },
          feasibility: 'medium', // Default feasibility
          feasibilityReason: feasibilityReason,
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
