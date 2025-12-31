
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
    // For buy orders, we want to find the cumulative volume of orders with a HIGHER price.
    // For sell orders, we want to find the cumulative volume of orders with a LOWER price.
    const relevantOrders = side === 'buy'
        ? ladder.filter(step => step.price > price)
        : ladder.filter(step => step.price < price);

    if (relevantOrders.length === 0) {
        return 0;
    }
    // The last relevant order in the sorted list will have the cumulative volume we need.
    return relevantOrders[relevantOrders.length - 1].cumulativeVolume;
}

export function calculateAnalysis(
  history: MarketHistoryItem[],
  orders: MarketOrderItem[],
  inputs: UserInputs
) {
    const buyOrders = orders.filter(o => o.is_buy_order);
    const sellOrders = orders.filter(o => !o.is_buy_order);

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

    const tickSize = 0.01;

    // --- Start of new buy price logic ---

    let finalMin = 0;
    let finalMax = 0;
    let feasibilityReason = "Анализ не дал результатов.";


    if (inputs.positionCapital && inputs.positionCapital > 0 && averageDailyVolume > 0 && buyLadder.length > 0) {
        const buyExecutionDays = inputs.executionDays / 2;
        
        // Volume that is likely to be traded during our buy window
        const targetExecutionVolume = averageDailyVolume * buyExecutionDays;

        // Find the price level where the cumulative volume is just under our target execution volume
        // We want to find the price at which we can place our order to be executed within the desired time
        let strategicBuyPrice = 0;
        
        // Find the first order where cumulative volume exceeds our target.
        // We want to place our order AT or just above this price to get ahead of some volume but still be competitive.
        const targetOrder = buyLadder.find(order => order.cumulativeVolume >= targetExecutionVolume);

        if (targetOrder) {
            // Place our order 1 tick above this level to get ahead of it.
            strategicBuyPrice = targetOrder.price + tickSize;
        } else {
            // If the entire book volume is less than our target,
            // we place the order at the very top of the buy book to be first in line.
             strategicBuyPrice = bestBuyPrice + tickSize;
        }

        // The recommended price is this strategic price.
        // The range is from this strategic price up to the best possible price.
        finalMin = Math.max(0.01, strategicBuyPrice); // Don't recommend a price of 0
        finalMax = bestBuyPrice + tickSize;
        
        feasibilityReason = `Диапазон покупки основан на вашем капитале (${inputs.positionCapital.toLocaleString('ru-RU')} ISK) и желаемом сроке исполнения (${inputs.executionDays} дней). Нижняя граница (~${finalMin.toFixed(2)} ISK) - это цена, по которой ваш ордер должен исполниться в течение ~${buyExecutionDays.toFixed(0)} дней, исходя из среднесуточного объема. Верхняя граница (~${finalMax.toFixed(2)} ISK) - это цена для немедленного исполнения.`;
    }
    
    // Ensure min is not greater than max
    if (finalMin > finalMax) {
        [finalMin, finalMax] = [finalMax, finalMin]; // Swap them
    }

    // --- End of new buy price logic ---


    const recommendations: Recommendation[] = [];
    
    if (finalMax > 0) {
        const recommendation: Recommendation = {
          buyPriceRange: { 
              min: finalMin, 
              max: finalMax,
          },
          // All other fields are placeholders for now
          sellPriceRange: { min: 0, max: 0 },
          netMarginPercent: 0,
          potentialProfit: 0,
          executableVolume: { low: 0, high: 0 },
          estimatedExecutionDays: { min: 0, max: 0 },
          feasibility: 'medium',
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
