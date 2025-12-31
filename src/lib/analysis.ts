
import type { MarketHistoryItem, MarketOrderItem, UserInputs, Recommendation } from './types';

function calculateNetProfit(buyPrice: number, sellPrice: number, inputs: UserInputs) {
    const buyCost = buyPrice * (1 + inputs.brokerBuyFeePercent / 100);
    const sellRevenue = sellPrice * (1 - inputs.brokerSellFeePercent / 100 - inputs.salesTaxPercent / 100);
    return sellRevenue - buyCost;
}

export function calculateAnalysis(
  history: MarketHistoryItem[],
  orders: MarketOrderItem[],
  inputs: UserInputs
) {
  const buyOrders = orders.filter(o => o.is_buy_order).sort((a, b) => b.price - a.price);
  const sellOrders = orders.filter(o => !o.is_buy_order).sort((a, b) => a.price - b.price);

  const recommendations: Recommendation[] = [];

  // Новая логика: ищем "стенки" и выгодные коридоры, а не просто перебиваем крайние ордера.
  // Мы будем рассматривать несколько лучших ордеров на покупку и продажу.
  const buySlice = buyOrders.slice(0, 15);
  const sellSlice = sellOrders.slice(0, 15);

  // Перебираем потенциальные цены покупки (основанные на существующих ордерах на покупку)
  for (const potentialBuyOrder of buySlice) {
    // Наша цена покупки будет чуть выше, чтобы быть конкурентными
    const myBuyPrice = potentialBuyOrder.price + 0.01;
    
    // Перебираем потенциальные цены продажи
    for (const potentialSellOrder of sellSlice) {
      // Наша цена продажи будет чуть ниже
      const mySellPrice = potentialSellOrder.price - 0.01;

      // Цена покупки не может быть выше или равна цене продажи
      if (myBuyPrice >= mySellPrice) {
        continue;
      }

      const netProfit = calculateNetProfit(myBuyPrice, mySellPrice, inputs);
      const netMargin = (netProfit / myBuyPrice) * 100;
      
      // Проверяем, соответствует ли маржа желаемой
      if (netMargin >= inputs.desiredNetMarginPercent) {
        
        // Оцениваем объем, который реально исполнить по этим ценам.
        // Это объем ордеров, которые находятся "между" нашими ценами.
        const volumeBetween = 
            buyOrders.filter(o => o.price >= myBuyPrice).reduce((sum, o) => sum + o.volume_remain, 0) +
            sellOrders.filter(o => o.price <= mySellPrice).reduce((sum, o) => sum + o.volume_remain, 0);
        
        const executableVolume = Math.min(
            potentialBuyOrder.volume_remain, 
            potentialSellOrder.volume_remain,
            volumeBetween
        );

        if (executableVolume > 0) {
            recommendations.push({
                buyPrice: myBuyPrice,
                sellPrice: mySellPrice,
                netMarginPercent: netMargin,
                profitPerItem: netProfit,
                potentialProfit: netProfit * executableVolume,
                executableVolume: executableVolume,
            });
        }
      }
    }
  }

  // Удаляем дубликаты и сортируем по потенциальной прибыли
  const uniqueRecommendations = Array.from(new Map(recommendations.map(item => [`${item.buyPrice}-${item.sellPrice}`, item])).values());
  uniqueRecommendations.sort((a, b) => b.potentialProfit - a.potentialProfit);


  const totalVolume = history.reduce((sum, item) => sum + item.volume, 0);
  const averageDailyVolume = history.length > 0 ? totalVolume / history.length : 0;
  
  let feasibility: 'low' | 'medium' | 'high' = 'low';
  if (inputs.optionalTargetVolume) {
      if (averageDailyVolume > inputs.optionalTargetVolume * 0.5) {
          feasibility = 'high';
      } else if (averageDailyVolume > inputs.optionalTargetVolume * 0.1) {
          feasibility = 'medium';
      }
  } else {
      if (averageDailyVolume > 500000) feasibility = 'high';
      else if (averageDailyVolume > 50000) feasibility = 'medium';
  }


  const estimatedExecutionTimeDays = inputs.optionalTargetVolume && averageDailyVolume > 0
    ? inputs.optionalTargetVolume / averageDailyVolume
    : undefined;

  const avgBuyPrice = buyOrders.length > 0 ? buyOrders.reduce((sum, o) => sum + o.price, 0) / buyOrders.length : 0;
  const avgSellPrice = sellOrders.length > 0 ? sellOrders.reduce((sum, o) => sum + o.price, 0) / sellOrders.length : 0;
  
  const averagePriceHistory = history.length > 0 ? history.reduce((sum, h) => sum + h.average, 0) / history.length : 0;
  const variance = history.length > 0 ? history.reduce((sum, h) => sum + Math.pow(h.average - averagePriceHistory, 2), 0) / history.length : 0;
  const stdDev = Math.sqrt(variance);
  const volatility = averagePriceHistory > 0 ? (stdDev / averagePriceHistory) * 100 : 0;

  return {
    inputs,
    history,
    orders,
    buyOrders,
    sellOrders,
    recommendations: uniqueRecommendations.slice(0, 50), // Возвращаем топ-50 лучших возможностей
    volumeAnalysis: {
      averageDailyVolume,
      estimatedExecutionTimeDays,
      feasibility,
    },
    priceAnalysis: {
        avgBuyPrice,
        avgSellPrice,
        volatility
    }
  };
}
