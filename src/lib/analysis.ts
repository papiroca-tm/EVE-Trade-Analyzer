
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
    // For buy side, we look at the top of the book (highest price) which is the start of the sorted ladder.
    // For sell side, we look at the bottom of the book (lowest price), which is also the start of its sorted ladder.
    // The cumulative volume we want is the one from the order *just before* our price.
    // Since `relevantOrders` are those "ahead" of us, the last one in that list holds the total cumulative volume of all orders ahead.
    return relevantOrders[relevantOrders.length - 1].cumulativeVolume;
}

function findStrategicPrice(
    orders: MarketOrderItem[],
    ladder: { price: number; cumulativeVolume: number }[],
    averageDailyVolume: number,
    executionDays: number,
    side: 'buy' | 'sell'
): { price: number, reason: string } {
    const tickSize = 0.01;
    if (orders.length === 0) {
        return { price: 0, reason: `Нет ордеров на ${side === 'buy' ? 'покупку' : 'продажу'} для анализа.` };
    }

    // Sort orders appropriately for our logic
    const sortedOrders = [...orders].sort((a, b) => side === 'buy' ? b.price - a.price : a.price - b.price);
    const bestPrice = sortedOrders[0].price;
    
    // This is the "market power" for the given execution timeframe
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
        // If no wall is found (market is thin), we start from the last order
        wallIndex = sortedOrders.length - 1;
    }
    
    const searchStartPrice = sortedOrders[wallIndex]?.price ?? (side === 'buy' ? 0 : Infinity);

    // Now, find the price where our order is likely to be filled within the timeframe
    for (let i = wallIndex; i >= 0; i--) {
        const order = sortedOrders[i];
        // The volume of orders that are more competitively priced than this level
        const volumeAhead = getVolumeAhead(ladder, order.price, side);
        
        if (volumeAhead < marketPower) {
            const strategicPrice = side === 'buy' ? order.price + tickSize : order.price - tickSize;
            const reason = `Стратегическая цена ${strategicPrice.toFixed(2)} найдена поиском от 'стены' (${searchStartPrice.toFixed(2)} ISK). Объем впереди (${volumeAhead.toLocaleString('ru-RU')} ед.) меньше, чем 'сила' рынка (~${marketPower.toLocaleString('ru-RU')} ед.) за ${executionDays / 2} дней.`;
            return { price: strategicPrice, reason };
        }
    }

    // Fallback if no suitable price is found (very dense market)
    const fallbackPrice = side === 'buy' ? bestPrice + tickSize : bestPrice - tickSize;
    const reason = `Рынок слишком 'плотный'. Не удалось найти стратегическую цену с исполнением в срок. Рекомендуется исполнение по лучшей цене (${fallbackPrice.toFixed(2)} ISK).`;
    return { price: fallbackPrice, reason };
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
    
    // --- Buy Price Calculation ---
    const longTermBuyPrice = history.length > 0 ? Math.min(...history.map(h => h.lowest)) : 0;
    
    const { price: midTermBuyPriceRaw, reason: feasibilityReason } = findStrategicPrice(sortedBuyOrders, buyLadder, averageDailyVolume, inputs.executionDays, 'buy');
    // Ensure mid-term isn't unrealistically low
    const midTermBuyPrice = Math.max(midTermBuyPriceRaw, longTermBuyPrice);

    const { price: shortTermBuyPrice } = findStrategicPrice(sortedBuyOrders, buyLadder, averageDailyVolume, 2, 'buy'); // Always 1 day horizon for short term
    const averageBuyPrice = (longTermBuyPrice + midTermBuyPrice + shortTermBuyPrice) / 3;

    // --- Sell Price Calculation (Mirrored Logic) ---
    const longTermSellPrice = history.length > 0 ? Math.max(...history.map(h => h.highest)) : 0;
    
    const { price: midTermSellPriceRaw } = findStrategicPrice(sortedSellOrders, sellLadder, averageDailyVolume, inputs.executionDays, 'sell');
    // Ensure mid-term isn't unrealistically high
    const midTermSellPrice = longTermSellPrice > 0 ? Math.min(midTermSellPriceRaw, longTermSellPrice) : midTermSellPriceRaw;
    
    const { price: shortTermSellPrice } = findStrategicPrice(sortedSellOrders, sellLadder, averageDailyVolume, 2, 'sell'); // Always 1 day horizon
    const averageSellPrice = (longTermSellPrice + midTermSellPrice + shortTermSellPrice) / 3;


    const recommendations: Recommendation[] = [];
    
    if (averageBuyPrice > 0) {
        // --- Margin Calculation (based on SHORT-TERM tactical prices) ---
        const cost = shortTermBuyPrice * (1 + inputs.brokerBuyFeePercent / 100);
        const revenue = shortTermSellPrice * (1 - inputs.brokerSellFeePercent/100 - inputs.salesTaxPercent/100);
        const actualNetMarginPercent = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
        
        // --- Executable Volume & Profit (based on MID-TERM strategic prices) ---
        const capital = inputs.positionCapital ?? Infinity;
        const maxVolumeByCapital = midTermBuyPrice > 0 ? Math.floor(capital / midTermBuyPrice) : 0;

        const sellDepthAtTarget = getVolumeAhead(sellLadder, midTermSellPrice, 'sell');
        const executableSellVolume = Math.max(0, (averageDailyVolume / 2) * (inputs.executionDays / 2) - sellDepthAtTarget);
        
        const finalExecutableVolume = Math.min(maxVolumeByCapital, executableSellVolume);
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
          executableVolume: { low: 0, high: Math.floor(finalExecutableVolume) },
          estimatedExecutionDays: { min: 1, max: inputs.executionDays },
          feasibility: 'medium', // Placeholder
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
