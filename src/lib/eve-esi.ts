
'use server';

import type { MarketHistoryItem, MarketOrderItem, Region, ItemType } from './types';

const ESI_BASE_URL = 'https://esi.evetech.net/latest';

async function fetchEsi(path: string, cache: boolean = false): Promise<Response> {
    const url = `${ESI_BASE_URL}${path}`;
    const options: RequestInit = cache ? { next: { revalidate: 3600 } } : { cache: 'no-store' };
    
    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`ESI Error for ${url}: ${response.status} ${errorBody}`);
            throw new Error(`Failed to fetch from ESI at ${url}: ${response.statusText}`);
        }
        return response;
    } catch (error) {
        console.error(`Network error or failed fetch for ${url}:`, error);
        throw error;
    }
}


export async function fetchMarketHistory(regionId: number, typeId: number): Promise<MarketHistoryItem[]> {
  const response = await fetchEsi(`/markets/${regionId}/history/?type_id=${typeId}`);
  const data: MarketHistoryItem[] = await response.json();
  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function fetchAllPages(path: string): Promise<any[]> {
    let allItems: any[] = [];
    let page = 1;
    let totalPages = 1;

    const separator = path.includes('?') ? '&' : '?';

    while (page <= totalPages) {
        const url = `${path}${separator}page=${page}`;
        const response = await fetchEsi(url);
        const data = await response.json();

        if (data.length === 0) {
            break;
        }
        allItems = allItems.concat(data);

        const xPagesHeader = response.headers.get('x-pages');
        if (xPagesHeader) {
            totalPages = parseInt(xPagesHeader, 10);
        } else {
            break; // No more pages header, assume single page
        }
        page++;
    }
    return allItems;
}


export async function fetchMarketOrders(regionId: number, typeId: number): Promise<MarketOrderItem[]> {
  return fetchAllPages(`/markets/${regionId}/orders/?order_type=all&type_id=${typeId}`);
}

export async function getRegions(): Promise<Region[]> {
    const regionIdsRes = await fetchEsi('/universe/regions/', true);
    const regionIds: number[] = await regionIdsRes.json();
    
    const regionDetails = await Promise.all(
        regionIds.map(async id => {
            try {
                // We only care about the main regions with markets
                if (id > 11000000) {
                    return null;
                }
                const response = await fetchEsi(`/universe/regions/${id}/`, true);
                const data = await response.json();
                return { region_id: id, name: data.name };
            } catch (e) {
                console.warn(`Failed to fetch region details for ID ${id}`, e);
                return null;
            }
        })
    );

    return regionDetails
        .filter((r): r is Region => r !== null)
        .sort((a,b) => a.name.localeCompare(b.name));
}


export async function searchItemTypes(query: string): Promise<ItemType[]> {
    if (!query || query.length < 3) return [];
    
    const searchResponse = await fetchEsi(`/search/?categories=inventory_type&search=${encodeURIComponent(query)}&strict=false`);

    const searchResult = await searchResponse.json();
    const typeIds: number[] = searchResult.inventory_type || [];

    if (typeIds.length === 0) return [];
    
    // ESI has a limit of 1000 IDs for the /universe/names/ endpoint, but let's be reasonable
    const maxIdsToFetch = 50; 
    const cappedTypeIds = typeIds.slice(0, maxIdsToFetch);
    
    // Instead of N requests, let's try a single POST request to /universe/names/ which is more efficient
    try {
        const namesResponse = await fetch(`${ESI_BASE_URL}/universe/names/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(cappedTypeIds),
            cache: 'no-store'
        });
        if (!namesResponse.ok) {
             throw new Error(`Failed to post to /universe/names/: ${namesResponse.statusText}`);
        }
        const namesData: {id: number, name: string}[] = await namesResponse.json();
        
        const typeDetails = namesData.map(item => ({
            type_id: item.id,
            name: item.name
        }));

        // We can't check for market group here, but this is much faster.
        // We will rely on the fact that subsequent analysis will fail if the item is not on the market.
        return typeDetails.sort((a,b) => a.name.localeCompare(b.name));

    } catch (e) {
        console.error("Failed to fetch item names via POST", e);
        // Fallback to individual requests if POST fails for some reason
        const fallbackDetails = await Promise.all(
          cappedTypeIds.map(async (id) => {
            try {
                const response = await fetchEsi(`/universe/types/${id}/`, true);
                const data = await response.json();
                if (data.published && data.market_group_id) {
                    return { type_id: id, name: data.name };
                }
                return null;
            } catch (err) {
                return null;
            }
          })
        );
        return fallbackDetails.filter((t): t is ItemType => t !== null).sort((a,b) => a.name.localeCompare(b.name));
    }
}
