
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

    // Find the buy-side support wall price
    const wallThreshold = averageDailyVolume > 0 ? averageDailyVolume / 2 : Infinity;
    let cumulativeVolumeForWall = 0;
    let supportWallBuyPrice = 0;
    const sortedBuyOrders = [...buyOrders].sort((a, b) => b.price - a.price);
    for (const order of sortedBuyOrders) {
        cumulativeVolumeForWall += order.volume_remain;
        if (cumulativeVolumeForWall >= wallThreshold) {
            supportWallBuyPrice = order.price;
            break;
        }
    }
    // If no wall is found, use the best buy price as a fallback for the lower bound.
    if (supportWallBuyPrice === 0 && sortedBuyOrders.length > 0) {
        supportWallBuyPrice = bestBuyPrice;
    }


    const recommendations: Recommendation[] = [];
    
    const lowerBound = supportWallBuyPrice > 0 ? supportWallBuyPrice + tickSize : 0;
    const upperBound = bestBuyPrice > 0 ? bestBuyPrice + tickSize : 0;

    // Ensure min is not greater than max
    const finalMin = Math.min(lowerBound, upperBound);
    const finalMax = Math.max(lowerBound, upperBound);

    if (finalMax > 0) {
        const recommendation: Recommendation = {
          buyPriceRange: { 
              min: finalMin, 
              max: finalMax,
          },
          // All other fields are placeholders for now
          recommendedBuyPrice: 0,
          sellPriceRange: { min: 0, max: 0 },
          netMarginPercent: 0,
          potentialProfit: 0,
          executableVolume: { low: 0, high: 0 },
          estimatedExecutionDays: { min: 0, max: 0 },
          feasibility: 'medium',
          feasibilityReason: "Диапазон покупки основан на 'стене' поддержки и лучшем ордере в стакане."
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
