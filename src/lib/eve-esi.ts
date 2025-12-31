import type { MarketHistoryItem, MarketOrderItem, Region, ItemType } from './types';

const ESI_BASE_URL = 'https://esi.evetech.net/latest';

export async function fetchMarketHistory(regionId: number, typeId: number): Promise<MarketHistoryItem[]> {
  const url = `${ESI_BASE_URL}/markets/${regionId}/history/?type_id=${typeId}`;
  const response = await fetch(url, { cache: 'no-store' });

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
    const response = await fetch(url, { cache: 'no-store' });

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

async function fetchAllPages<T>(baseUrl: string): Promise<T[]> {
  let allItems: T[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = new URL(baseUrl);
    url.searchParams.set('page', page.toString());
    
    const response = await fetch(url.toString(), { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Failed to fetch paged data from ${baseUrl}: ${response.statusText}`);
    }

    const data: T[] = await response.json();
    if (data.length === 0) break;

    allItems = allItems.concat(data);

    const xPagesHeader = response.headers.get('x-pages');
    if (xPagesHeader) {
      totalPages = parseInt(xPagesHeader, 10);
    } else {
      break; 
    }
    
    page++;
  }
  return allItems;
}

export async function getRegions(): Promise<Region[]> {
    const regionIdsUrl = `${ESI_BASE_URL}/universe/regions/`;
    const regionIdsResponse = await fetch(regionIdsUrl, { cache: 'no-store' });
    if (!regionIdsResponse.ok) throw new Error("Failed to fetch region IDs");
    const regionIds: number[] = await regionIdsResponse.json();

    const regionDetails = await Promise.all(
        regionIds.map(async id => {
            const url = `${ESI_BASE_URL}/universe/regions/${id}/`;
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) return null;
            const data = await response.json();
            return { region_id: id, name: data.name };
        })
    );

    return regionDetails.filter((r): r is Region => r !== null).sort((a,b) => a.name.localeCompare(b.name));
}

export async function getItemTypes(): Promise<ItemType[]> {
    const marketTypeIdsUrl = `${ESI_BASE_URL}/markets/types/`;
    const ids = await fetchAllPages<number>(marketTypeIdsUrl);

    const typeDetails = await Promise.all(
        ids.map(async id => {
            const url = `${ESI_BASE_URL}/universe/types/${id}/`;
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) return null;
            const data = await response.json();
            // We only care about published market items
            if (!data.published || !data.market_group_id) return null;
            return { type_id: id, name: data.name };
        })
    );

    return typeDetails.filter((t): t is ItemType => t !== null).sort((a,b) => a.name.localeCompare(b.name));
}
