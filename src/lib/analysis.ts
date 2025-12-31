
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
    const midPrice = bestBuyPrice > 0 && bestSellPrice !== Infinity ? (bestBuyPrice + bestSellPrice) / 2 : 0;
    
    const historicalPrices = history.map(h => h.average);
    const totalVolume = history.reduce((sum, item) => sum + item.volume, 0);
    const averageDailyVolume = history.length > 0 ? totalVolume / history.length : 0;
    const totalBuyOrderVolume = buyLadder.length > 0 ? buyLadder[buyLadder.length - 1].cumulativeVolume : 0;
    const totalSellOrderVolume = sellLadder.length > 0 ? sellLadder[sellLadder.length - 1].cumulativeVolume : 0;
    
    // Новая логика: возвращаем пустые рекомендации с нулевыми значениями
    const recommendations: Recommendation[] = [];

    const averagePriceHistory = history.length > 0 ? historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length : 0;
    const variance = history.length > 0 ? history.reduce((sum, h) => sum + Math.pow(h.average - averagePriceHistory, 2), 0) / history.length : 0;
    const stdDev = Math.sqrt(variance);
    const volatilityPercent = averagePriceHistory > 0 ? (stdDev / averagePriceHistory) * 100 : 0;

    return {
      inputs,
      history,
      buyOrders,
      sellOrders,
      recommendations, // This will be empty, causing the message
      volumeAnalysis: {
        averageDailyVolume,
        totalBuyOrderVolume,
        totalSellOrderVolume,
        totalVolume,
      },
      priceAnalysis: {
        bestBuyPrice,
        bestSellPrice,
        midPrice,
        volatility: volatilityPercent,
        averagePrice: 0,
      }
    };
}
