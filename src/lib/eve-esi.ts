
import type { MarketHistoryItem, MarketOrderItem, Region, ItemType } from './types';

const ESI_BASE_URL = 'https://esi.evetech.net/latest';

// Fetch with a 1-hour cache policy for semi-static data like regions/item types.
async function fetchWithCache(url: string) {
    return fetch(url, { next: { revalidate: 3600 } }); 
}

// Fetch without caching for live market data.
async function fetchWithoutCache(url: string) {
    return fetch(url, { cache: 'no-store' });
}


export async function fetchMarketHistory(regionId: number, typeId: number): Promise<MarketHistoryItem[]> {
  const url = `${ESI_BASE_URL}/markets/${regionId}/history/?type_id=${typeId}`;
  const response = await fetchWithoutCache(url);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`ESI History Error for ${typeId} in ${regionId}: ${response.status} ${errorBody}`);
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
    const response = await fetchWithoutCache(url);

    if (!response.ok) {
       const errorBody = await response.text();
       console.error(`ESI Orders Error for ${typeId} in ${regionId}: ${response.status} ${errorBody}`);
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
        // If the header is missing, we assume we're on the last page.
        break;
    }
    
    page++;
  }
  
  return allOrders;
}


async function fetchAllPages<T>(url: string): Promise<T[]> {
  const response = await fetchWithCache(url);
  if (!response.ok) {
    console.error(`Failed to fetch initial page for ${url}: ${response.statusText}`);
    throw new Error(`Failed to fetch paged data from ESI: ${response.statusText}`);
  }
  const xPagesHeader = response.headers.get('x-pages');
  const totalPages = xPagesHeader ? parseInt(xPagesHeader, 10) : 1;
  
  let allData: T[] = await response.json();

  if (totalPages > 1) {
    const pagePromises: Promise<T[]>[] = [];
    for (let page = 2; page <= totalPages; page++) {
        const pageUrl = `${url.includes('?') ? url : url + '?'}&page=${page}`;
        pagePromises.push(
            fetchWithCache(pageUrl).then(res => {
                if (!res.ok) {
                    console.error(`Failed to fetch page ${page} for ${url}: ${res.statusText}`);
                    return []; // Return empty array on error for a specific page
                }
                return res.json() as Promise<T[]>;
            })
        );
    }
    const pagedData = await Promise.all(pagePromises);
    pagedData.forEach(pageData => allData.push(...pageData));
  }
  
  return allData;
}


export async function getRegions(): Promise<Region[]> {
    const regionIdsUrl = `${ESI_BASE_URL}/universe/regions/`;
    const regionIds = await fetchAllPages<number>(regionIdsUrl);

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
        .filter((r): r is Region => r !== null && !!r.name)
        .sort((a,b) => a.name.localeCompare(b.name));
}


export async function getItemTypes(): Promise<ItemType[]> {
    const typeIdsUrl = `${ESI_BASE_URL}/universe/types/`;
    const allTypeIds = await fetchAllPages<number>(typeIdsUrl);

    const uniqueTypeIds = [...new Set(allTypeIds)];
    
    // We can't fetch all types at once. We'll rely on the default values and search.
    // Let's pre-warm with some common types.
    const defaultTypeIds = [34, 35, 36, 37, 38, 39, 40]; // Tritanium, Pyerite, etc.
    const idsToFetch = [...new Set([...defaultTypeIds, ...uniqueTypeIds.slice(0, 100)])]; // Fetch a small subset to start with.

    const typeDetails = await Promise.all(
      idsToFetch.map(async id => {
        try {
            const url = `${ESI_BASE_URL}/universe/types/${id}/`;
            const response = await fetchWithCache(url);
            if (!response.ok) return null;
            const data = await response.json();
            // We only want items that can be on the market.
            if (data.published && data.market_group_id) {
                return { type_id: id, name: data.name };
            }
            return null;
        } catch (e) {
            console.error(`Failed to fetch type details for ID ${id}`, e);
            return null;
        }
      })
    );
    
    return typeDetails
        .filter((t): t is ItemType => t !== null && !!t.name)
        .sort((a,b) => a.name.localeCompare(b.name));
}
