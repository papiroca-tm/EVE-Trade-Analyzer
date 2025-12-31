
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

    // --- Core Logic: Find Feasible Price Ranges ---
    const desiredMarginFactor = 1 + (inputs.desiredNetMarginPercent / 100);
    const costFactor = (1 + inputs.brokerBuyFeePercent / 100);
    const revenueFactor = (1 - inputs.brokerSellFeePercent / 100 - inputs.salesTaxPercent / 100);
    
    // The core equation: sellPrice * revenueFactor >= buyPrice * costFactor * desiredMarginFactor
    // To find the maximum buy price for a given sell price:
    // maxBuyPrice = (sellPrice * revenueFactor) / (costFactor * desiredMarginFactor)

    let recommendations: Recommendation[] = [];

    // We iterate through sell prices to find a corresponding buy price range.
    // Start from a reasonably low sell price up to a high one.
    const startSellPrice = bestSellPrice !== Infinity ? bestSellPrice : (midPrice > 0 ? midPrice : getPercentile(historicalPrices, 50));
    const endSellPrice = getPercentile(historicalPrices, 95) * 1.2; // Go up to 95th percentile + 20%
    if (startSellPrice > 0 && startSellPrice < endSellPrice) {
        let bestRecommendation: Recommendation | null = null;
        let maxProfit = -Infinity;

        // Let's check a hundred price points in the plausible sell range
        const step = (endSellPrice - startSellPrice) / 100;
        for (let sellPrice = startSellPrice; sellPrice <= endSellPrice; sellPrice += step) {
            const maxBuyPriceForMargin = (sellPrice * revenueFactor) / (costFactor * desiredMarginFactor);
            const minBuyPriceForMarket = getPercentile(historicalPrices, 10); // Don't recommend ridiculously low buy prices

            if (maxBuyPriceForMargin > minBuyPriceForMarket && maxBuyPriceForMargin < sellPrice) {
                // We found a feasible range
                const buyPriceRange = { min: minBuyPriceForMarket, max: maxBuyPriceForMargin };
                const sellPriceRange = { min: sellPrice, max: endSellPrice };

                // --- Estimate Executable Volume & Time ---
                const targetBuyPrice = buyPriceRange.max * 0.99; // Be competitive
                const targetSellPrice = sellPriceRange.min * 1.01;
                
                const volumeAheadBuy = getVolumeAhead(buyLadder, targetBuyPrice, 'buy');
                const volumeAheadSell = getVolumeAhead(sellLadder, targetSellPrice, 'sell');
                
                // Executable volume is a fraction of historical daily volume, capped by order book depth
                const dailyVolumeFraction = Math.min(volumeAheadBuy, volumeAheadSell, averageDailyVolume * 0.25);
                const executableVolume = {
                    low: Math.floor(dailyVolumeFraction * 0.5),
                    high: Math.floor(dailyVolumeFraction * 1.5),
                };

                const estimatedExecutionDays = {
                    min: averageDailyVolume > 0 ? Math.max(1, Math.round(executableVolume.low / (averageDailyVolume * 0.1))) : 1,
                    max: averageDailyVolume > 0 ? Math.max(1, Math.round(executableVolume.high / (averageDailyVolume * 0.1))) : 3,
                };
                
                // --- Feasibility ---
                let score = 0;
                if (averageDailyVolume > 1000) score++;
                if (totalBuyOrderVolume > executableVolume.high) score++;
                if (totalSellOrderVolume > executableVolume.high) score++;
                if (Math.abs(targetBuyPrice - midPrice) / midPrice < 0.1) score++; // price distance
                
                const feasibilityLevels: Feasibility[] = ['low', 'medium', 'high', 'very high'];
                const feasibility = feasibilityLevels[Math.min(score, 3)];
                const feasibilityReasons = [
                    `Исторический объем (сред. ${Math.round(averageDailyVolume)}/день)`,
                    `Глубина стакана покупки (общий ${totalBuyOrderVolume.toLocaleString()})`,
                    `Глубина стакана продажи (общий ${totalSellOrderVolume.toLocaleString()})`,
                    `Близость к рынку (реком. цена ${targetBuyPrice.toFixed(2)} vs спред ${bestBuyPrice.toFixed(2)}-${bestSellPrice.toFixed(2)})`
                ];
                const feasibilityReason = `Оценка "${feasibility}" основана на: ${feasibilityReasons.join(', ')}.`;

                const netProfit = (sellPrice * revenueFactor) - (targetBuyPrice * costFactor);
                const netMarginPercent = (netProfit / targetBuyPrice) * 100;
                const potentialProfit = netProfit * executableVolume.high;

                if (potentialProfit > maxProfit) {
                    maxProfit = potentialProfit;
                    bestRecommendation = {
                        buyPriceRange,
                        sellPriceRange,
                        netMarginPercent,
                        potentialProfit,
                        executableVolume,
                        estimatedExecutionDays,
                        feasibility,
                        feasibilityReason,
                    };
                }
            }
        }
        if (bestRecommendation) {
            recommendations.push(bestRecommendation);
        }
    }

    // --- Volatility ---
    const averagePriceHistory = history.length > 0 ? historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length : 0;
    const variance = history.length > 0 ? history.reduce((sum, h) => sum + Math.pow(h.average - averagePriceHistory, 2), 0) / history.length : 0;
    const stdDev = Math.sqrt(variance);
    const volatility = averagePriceHistory > 0 ? (stdDev / averagePriceHistory) * 100 : 0;

    return {
      inputs,
      history,
      buyOrders,
      sellOrders,
      recommendations,
      volumeAnalysis: {
        averageDailyVolume,
        totalBuyOrderVolume,
        totalSellOrderVolume,
      },
      priceAnalysis: {
        bestBuyPrice,
        bestSellPrice,
        midPrice,
        volatility
      }
    };
}

// Helper to get percentile from a sorted array
function getPercentile(data: number[], percentile: number): number {
    if (data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    if (Math.floor(index) === index) {
        return sorted[index];
    }
    const lower = sorted[Math.floor(index)];
    const upper = sorted[Math.ceil(index)];
    return lower + (upper - lower) * (index - Math.floor(index));
}
