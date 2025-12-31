
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
            // Do not throw for 404 on search, as it means "not found"
            if (response.status === 404 && path.startsWith('/search/')) {
                return response; 
            }
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
        
        try {
            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
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
        } catch (e) {
            console.error(`Failed to parse JSON for page ${page} of ${path}`, e);
            break; 
        }
    }
    return allItems;
}


export async function fetchMarketOrders(regionId: number, typeId: number): Promise<MarketOrderItem[]> {
  return fetchAllPages(`/markets/${regionId}/orders/?order_type=all&type_id=${typeId}`);
}

export async function getRegions(): Promise<Region[]> {
    const regionIdsRes = await fetchEsi('/universe/regions/', true);
    const regionIds: number[] = await regionIdsRes.json();
    
    const regionDetailsPromises = regionIds.map(async id => {
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
    });

    const settledDetails = await Promise.allSettled(regionDetailsPromises);

    const successfulRegions = settledDetails
        .filter((result): result is PromiseFulfilledResult<Region | null> => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value as Region);


    return successfulRegions
        .filter((r): r is Region => r !== null)
        .sort((a,b) => a.name.localeCompare(b.name));
}


export async function searchItemTypes(query: string): Promise<ItemType[]> {
    if (!query || query.length < 3) return [];
    
    const searchResponse = await fetchEsi(`/search/?categories=inventory_type&search=${encodeURIComponent(query)}&strict=false`);
    
    // ESI search returns 404 if nothing is found.
    if (searchResponse.status === 404) {
        return [];
    }

    const searchResult = await searchResponse.json();
    const typeIds: number[] = searchResult.inventory_type || [];

    if (typeIds.length === 0) return [];
    
    // ESI search can return many results, limit what we fetch details for.
    const maxIdsToFetch = 50; 
    const cappedTypeIds = typeIds.slice(0, maxIdsToFetch);
    
    const itemDetailsPromises = cappedTypeIds.map(async (id) => {
        try {
            const response = await fetchEsi(`/universe/types/${id}/`, true);
            const data = await response.json();
            // Check if the item is published (meaning it's a usable item in the game)
            if (data.published) {
                return { type_id: id, name: data.name };
            }
            return null;
        } catch (error) {
            console.warn(`Could not fetch details for typeId ${id}.`);
            return null;
        }
    });

    const settledDetails = await Promise.allSettled(itemDetailsPromises);

    const successfulItems = settledDetails
        .filter((result): result is PromiseFulfilledResult<ItemType | null> => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value as ItemType);

    return successfulItems.sort((a, b) => a.name.localeCompare(b.name));
}

// Gets a sample of marketable items to populate the list initially.
export async function getInitialItemTypes(): Promise<ItemType[]> {
    try {
        // We fetch one of the main market groups for minerals.
        const marketGroupResponse = await fetchEsi(`/markets/groups/1857/`, true);
        const marketGroupData = await marketGroupResponse.json();
        const typeIds: number[] = marketGroupData.types || [];
        
        if (typeIds.length === 0) {
            return [];
        }

        const itemDetailsPromises = typeIds.map(async (id) => {
            try {
                const response = await fetchEsi(`/universe/types/${id}/`, true);
                const data = await response.json();
                if (data.published) {
                    return { type_id: id, name: data.name };
                }
                return null;
            } catch {
                return null;
            }
        });

        const settledDetails = await Promise.allSettled(itemDetailsPromises);
        
        const items = settledDetails
            .filter((result): result is PromiseFulfilledResult<ItemType | null> => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value as ItemType);

        return items.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Failed to get initial item types from market group, falling back.", error);
        // Fallback in case the market group ID changes or is unavailable
        return [
            { type_id: 34, name: 'Tritanium' },
            { type_id: 35, name: 'Pyerite' },
            { type_id: 36, name: 'Mexallon' },
        ];
    }
}
