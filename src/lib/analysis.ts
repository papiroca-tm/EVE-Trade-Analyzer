
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


    if (averageDailyVolume > 0 && buyLadder.length > 0) {
        // Upper bound is always the price for immediate execution
        finalMax = bestBuyPrice + tickSize;

        // Calculate lower bound based on capital and execution time
        const buyExecutionDays = inputs.executionDays / 2;
        const targetExecutionVolume = averageDailyVolume * buyExecutionDays;

        // Find the price level where we need to place our order.
        // We look for the first order where the cumulative volume *before* it exceeds our target.
        // Placing our order at this price level means we'll be executed after this volume.
        const targetOrder = buyLadder.find(order => order.cumulativeVolume >= targetExecutionVolume);

        if (targetOrder) {
            // We set our price at this level to wait in line.
            finalMin = targetOrder.price + tickSize;
        } else {
            // If the entire book volume is less than our target execution volume,
            // it means we can likely get filled at the top of the book within our timeframe.
            // So, the strategic price is the same as the immediate price.
            finalMin = bestBuyPrice + tickSize;
        }
        
        feasibilityReason = `Диапазон покупки основан на желаемом сроке исполнения (${inputs.executionDays} дней, ~${buyExecutionDays.toFixed(0)} на покупку), что соответствует целевому объему ~${targetExecutionVolume.toLocaleString('ru-RU', {maximumFractionDigits: 0})} ед. Нижняя граница (${finalMin.toFixed(2)} ISK) - это стратегическая цена для исполнения в срок. Верхняя граница (${finalMax.toFixed(2)} ISK) - цена для немедленного исполнения.`;
    }
    
    // Ensure min is not greater than max, which can happen if logic places min above max
    if (finalMin > finalMax) {
      finalMin = finalMax;
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
