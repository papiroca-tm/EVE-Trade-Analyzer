import type { MarketHistoryItem, MarketOrderItem } from './types';

const ESI_BASE_URL = 'https://esi.evetech.net/latest';

export async function fetchMarketHistory(regionId: number, typeId: number): Promise<MarketHistoryItem[]> {
  const url = `${ESI_BASE_URL}/markets/${regionId}/history/?type_id=${typeId}`;
  const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`ESI History Error for ${typeId} in ${regionId}: ${errorBody}`);
    throw new Error(`Failed to fetch market history: ${response.statusText}`);
  }
  const data: MarketHistoryItem[] = await response.json();
  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchMarketOrders(regionId: number, typeId: number): Promise<MarketOrderItem[]> {
  let allOrders: MarketOrderItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${ESI_BASE_URL}/markets/${regionId}/orders/?order_type=all&type_id=${typeId}&page=${page}`;
    const response = await fetch(url, { next: { revalidate: 300 } }); // Cache for 5 minutes

    if (!response.ok) {
       const errorBody = await response.text();
       console.error(`ESI Orders Error for ${typeId} in ${regionId}: ${errorBody}`);
       throw new Error(`Failed to fetch market orders (page ${page}): ${response.statusText}`);
    }

    const data: MarketOrderItem[] = await response.json();
    if (data.length === 0) {
      break;
    }
    allOrders = allOrders.concat(data);

    const xPagesHeader = response.headers.get('x-pages');
    if (xPagesHeader) {
      totalPages = parseInt(xPagesHeader, 10);
    }
    
    page++;
  }
  
  return allOrders;
}
