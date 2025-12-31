
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

    // Find the buy-side support wall price (used as a fallback)
    const wallThreshold = averageDailyVolume > 0 ? averageDailyVolume / 2 : Infinity;
    let cumulativeVolumeForWall = 0;
    let supportWallBuyPrice = 0;
    for (const order of buyLadder) { // buyLadder is already sorted high to low
        cumulativeVolumeForWall += order.volume;
        if (cumulativeVolumeForWall >= wallThreshold) {
            supportWallBuyPrice = order.price;
            break;
        }
    }
    if (supportWallBuyPrice === 0 && buyLadder.length > 0) {
        supportWallBuyPrice = buyLadder[buyLadder.length - 1].price; // Fallback to lowest buy price
    }

    let minBuyPrice = supportWallBuyPrice + tickSize;
    let maxBuyPrice = bestBuyPrice + tickSize;

    // New logic based on capital and execution time
    if (inputs.positionCapital && inputs.positionCapital > 0 && averageDailyVolume > 0) {
        const buyExecutionDays = inputs.executionDays / 2;
        
        // Volume that is likely to be traded during our buy window
        const targetExecutionVolume = averageDailyVolume * buyExecutionDays;

        // Find the price level where the cumulative volume is just under our target execution volume
        let strategicBuyPrice = 0;
        // Find the first order where cumulative volume exceeds our target.
        // We want to place our order just below this price.
        const targetOrder = buyLadder.find(order => order.cumulativeVolume >= targetExecutionVolume);

        if (targetOrder) {
            // Place our order 1 tick below this level to wait for it to be cleared.
            strategicBuyPrice = targetOrder.price - tickSize;
        } else if (buyLadder.length > 0) {
            // If the entire book volume is less than our target,
            // we place the order at the very bottom of the buy book.
             strategicBuyPrice = buyLadder[buyLadder.length - 1].price - tickSize;
        }
        
        // The new recommended price is this strategic price.
        // We can use it as the upper bound of our range.
        if (strategicBuyPrice > 0) {
            maxBuyPrice = strategicBuyPrice;
        }
    }
    
    // Final check to make sure min is not greater than max
    const finalMin = Math.min(minBuyPrice, maxBuyPrice);
    const finalMax = Math.max(minBuyPrice, maxBuyPrice);

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
