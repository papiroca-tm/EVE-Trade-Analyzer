
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
    const averagePrice = historicalPrices.length > 0 ? historicalPrices.reduce((a,b) => a+b, 0) / historicalPrices.length : 0;

    let recommendations: Recommendation[] = [];

    // --- New Algorithm Implementation ---
    if (history.length > 0 && bestSellPrice !== Infinity) {
        
        // Step 1: Определяем волатильность
        const min_price = history.reduce((min, h) => Math.min(min, h.lowest), Infinity);
        const max_price = history.reduce((max, h) => Math.max(max, h.highest), 0);
        const volatility = max_price - min_price;
        const price_floor = min_price + inputs.volatilityFactor * volatility;

        // Step 2: Расчёт максимальной цены покупки
        const AssumedSellPrice = bestSellPrice; // Используем лучший селл-ордер
        const broker_buy_fee_rate = inputs.brokerBuyFeePercent / 100;
        const broker_sell_fee_rate = inputs.brokerSellFeePercent / 100;
        const tax_rate = inputs.salesTaxPercent / 100;
        const target_profit_rate = inputs.desiredNetMarginPercent / 100;
        
        const MaxBuyPrice = (AssumedSellPrice * (1 - tax_rate - broker_sell_fee_rate)) / ((1 + broker_buy_fee_rate) * (1 + target_profit_rate));

        // Step 3: Применяем нижнюю границу (больше не блокируем, а используем для информации)
        // Шаг 3 теперь не изменяет цену, а только используется для анализа рисков
        let recommended_buy = MaxBuyPrice;
        
        // Step 4: Коррекция по текущему стакану
        const tick_size = 0.01;
        if (buyOrders.length > 0) {
            const best_current_buy = buyOrders.reduce((max, o) => Math.max(max, o.price), 0);
            recommended_buy = Math.max(recommended_buy, best_current_buy + tick_size);
        }

        // --- End of New Algorithm Core Logic ---

        if (recommended_buy > 0 && recommended_buy < AssumedSellPrice) {
            
            const buyPriceRange = { min: price_floor, max: recommended_buy };
            const sellPriceRange = { min: AssumedSellPrice, max: max_price };

            const executableVolume = {
                low: Math.floor(averageDailyVolume * 0.1 * inputs.executionDays),
                high: Math.floor(averageDailyVolume * 0.5 * inputs.executionDays),
            };

            const estimatedExecutionDays = {
                min: 1,
                max: inputs.executionDays,
            };

            let feasibilityReason = `Оценка выполнимости основана на историческом объеме, глубине стакана и близости к текущим ценам.`;
            if (recommended_buy < price_floor) {
                feasibilityReason += ` Внимание: Рекомендованная цена для достижения маржи ниже исторического уровня поддержки (${price_floor.toFixed(2)} ISK). Покупка по этой цене может быть затруднена.`;
            }

            // Feasibility logic
            let score = 0;
            if (averageDailyVolume > 1000) score++;
            if (totalBuyOrderVolume > executableVolume.high) score++;
            if (totalSellOrderVolume > executableVolume.high) score++;
            if (Math.abs(recommended_buy - midPrice) / midPrice < 0.1) score++;
            if (recommended_buy >= price_floor) score++; // bonus point for being above floor
            
            const feasibilityLevels: Feasibility[] = ['low', 'low', 'medium', 'high', 'very high', 'very high'];
            const feasibility = feasibilityLevels[score];

            const netProfitPerItem = (AssumedSellPrice * (1 - tax_rate - broker_sell_fee_rate)) - (recommended_buy * (1 + broker_buy_fee_rate));
            const netMarginPercent = (netProfitPerItem / (recommended_buy * (1 + broker_buy_fee_rate))) * 100;
            
            // Step 5: Ограничение по капиталу
            const capital = inputs.positionCapital ?? 100000000;
            const quantity = Math.floor(capital / recommended_buy);
            const potentialProfit = netProfitPerItem * quantity;

            if (quantity >= 1) {
                recommendations.push({
                    buyPriceRange,
                    sellPriceRange,
                    netMarginPercent,
                    potentialProfit,
                    executableVolume: {
                        low: Math.min(executableVolume.low, quantity),
                        high: Math.min(executableVolume.high, quantity)
                    },
                    estimatedExecutionDays,
                    feasibility,
                    feasibilityReason,
                });
            }
        }
    }


    // --- Volatility (calculated for display) ---
    const averagePriceHistory = history.length > 0 ? historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length : 0;
    const variance = history.length > 0 ? history.reduce((sum, h) => sum + Math.pow(h.average - averagePriceHistory, 2), 0) / history.length : 0;
    const stdDev = Math.sqrt(variance);
    const volatilityPercent = averagePriceHistory > 0 ? (stdDev / averagePriceHistory) * 100 : 0;

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
        totalVolume,
      },
      priceAnalysis: {
        bestBuyPrice,
        bestSellPrice,
        midPrice,
        volatility: volatilityPercent,
        averagePrice,
      }
    };
}
