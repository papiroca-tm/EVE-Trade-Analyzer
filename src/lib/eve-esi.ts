
import type { MarketHistoryItem, MarketOrderItem, Region, ItemType } from './types';

const ESI_BASE_URL = 'https://esi.evetech.net/latest';

async function fetchWithCache(url: string) {
    return fetch(url, { next: { revalidate: 86400 } }); // Cache for 24 hours
}


export async function fetchMarketHistory(regionId: number, typeId: number): Promise<MarketHistoryItem[]> {
  const url = `${ESI_BASE_URL}/markets/${regionId}/history/?type_id=${typeId}`;
  const response = await fetch(url, { cache: 'no-store' }); // Don't cache this

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
    const response = await fetch(url, { cache: 'no-store' }); // Don't cache this

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
    } else {
        break; // No more pages
    }
    
    page++;
  }
  
  return allOrders;
}

async function fetchAllPages<T>(url: string): Promise<T[]> {
    let allItems: T[] = [];
    let page = 1;
    let totalPages = 1;
  
    while (page <= totalPages) {
      const pageUrl = `${url}?page=${page}`;
      const response = await fetchWithCache(pageUrl);
  
      if (!response.ok) {
        throw new Error(`Failed to fetch paged data from ${url}: ${response.statusText}`);
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
    const regionIdsResponse = await fetchWithCache(regionIdsUrl);
    if (!regionIdsResponse.ok) throw new Error("Failed to fetch region IDs");
    const regionIds: number[] = await regionIdsResponse.json();

    const regionDetails = await Promise.all(
        regionIds.map(async id => {
            try {
                const url = `${ESI_BASE_URL}/universe/regions/${id}/`;
                const response = await fetchWithCache(url);
                if (!response.ok) return null;
                const data = await response.json();
                return { region_id: id, name: data.name };
            } catch (e) {
                console.error(`Failed to fetch region details for ID ${id}`, e);
                return null;
            }
        })
    );

    return regionDetails
        .filter((r): r is Region => r !== null)
        .sort((a,b) => a.name.localeCompare(b.name));
}


export async function getItemTypes(): Promise<ItemType[]> {
    const marketTypeIdsUrl = `${ESI_BASE_URL}/markets/types/`;
    const ids = await fetchAllPages<number>(marketTypeIdsUrl);

    // ESI has a limit on how many concurrent requests are good, let's batch
    const batchSize = 100;
    let allTypeDetails: (ItemType | null)[] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        const batchPromises = batchIds.map(async id => {
             try {
                const url = `${ESI_BASE_URL}/universe/types/${id}/`;
                const response = await fetchWithCache(url);
                if (!response.ok) return null;
                const data = await response.json();
                if (!data.published || !data.market_group_id) return null;
                return { type_id: id, name: data.name };
            } catch (e) {
                console.error(`Failed to fetch item details for ID ${id}`, e);
                return null;
            }
        });
        const batchResults = await Promise.all(batchPromises);
        allTypeDetails = allTypeDetails.concat(batchResults);
    }
    
    return allTypeDetails
        .filter((t): t is ItemType => t !== null)
        .sort((a,b) => a.name.localeCompare(b.name));
}
