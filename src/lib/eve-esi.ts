
'use server';

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

export async function getRegions(): Promise<Region[]> {
    const regionIdsUrl = `${ESI_BASE_URL}/universe/regions/`;
    const regionIdsRes = await fetchWithCache(regionIdsUrl);
    if (!regionIdsRes.ok) {
        throw new Error('Failed to fetch region IDs');
    }
    const regionIds: number[] = await regionIdsRes.json();
    
    const regionDetails = await Promise.all(
        regionIds.map(async id => {
            try {
                const url = `${ESI_BASE_URL}/universe/regions/${id}/`;
                const response = await fetchWithCache(url);
                if (!response.ok) return null;
                const data = await response.json();
                // Filter out wormhole/special regions that don't have markets
                if (id < 11000000) {
                    return { region_id: id, name: data.name };
                }
                return null;
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


export async function searchItemTypes(query: string): Promise<ItemType[]> {
    if (!query || query.length < 3) return [];
    
    const searchUrl = `${ESI_BASE_URL}/search/?categories=inventory_type&search=${encodeURIComponent(query)}&strict=false`;
    
    const searchResponse = await fetch(searchUrl, { cache: 'no-store' });

    if(!searchResponse.ok) {
        console.error(`Failed to search for items with query "${query}": ${searchResponse.statusText}`);
        return [];
    }

    const searchResult = await searchResponse.json();
    const typeIds: number[] = searchResult.inventory_type || [];

    if (typeIds.length === 0) return [];
    
    // ESI search can return a lot of IDs, let's cap it for performance.
    const maxIdsToFetch = 50; 
    const cappedTypeIds = typeIds.slice(0, maxIdsToFetch);
    
    const typeDetails = await Promise.all(
      cappedTypeIds.map(async (id) => {
        try {
            const url = `${ESI_BASE_URL}/universe/types/${id}/`;
            const response = await fetchWithCache(url);
            if (!response.ok) return null;
            const data = await response.json();
            // Ensure the item is published and on the market.
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
