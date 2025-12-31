
'use server';

import type { MarketHistoryItem, MarketOrderItem, Region, ItemType } from './types';

const ESI_BASE_URL = 'https://esi.evetech.net/latest';

async function fetchEsi(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${ESI_BASE_URL}${path}`;
    const defaultOptions: RequestInit = path.startsWith('/universe/names/') ? {} : { next: { revalidate: 3600 } };
    const finalOptions: RequestInit = { ...defaultOptions, ...options, cache: path.startsWith('/universe/names/') ? 'no-store' : options.cache };
    
    try {
        const response = await fetch(url, finalOptions);

        if (!response.ok) {
            if (response.status === 404) {
                 // For 404, return a response with an empty JSON array to prevent crashes.
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
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
        const response = await fetchEsi(url, { cache: 'no-store' });
        
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
                break; 
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
  const response = await fetchAllPages(`/markets/${regionId}/orders/?order_type=all&type_id=${typeId}`);
  return response;
}

export async function getRegions(): Promise<Region[]> {
    const regionIdsRes = await fetchEsi('/universe/regions/');
    const regionIds: number[] = await regionIdsRes.json();
    
    const regionDetailsPromises = regionIds.map(async id => {
        try {
            // Filter out wormhole space and other weird regions
            if (id > 11000000) {
                return null;
            }
            const response = await fetchEsi(`/universe/regions/${id}/`);
            const data = await response.json();
            return { region_id: id, name: data.name };
        } catch (e) {
            console.warn(`Failed to fetch region details for ID ${id}`, e);
            return null;
        }
    });

    const settledDetails = await Promise.all(regionDetailsPromises);

    const successfulRegions = settledDetails.filter((r): r is Region => r !== null);

    return successfulRegions.sort((a,b) => a.name.localeCompare(b.name));
}


export async function searchItemTypes(query: string, category: string = 'inventory_type'): Promise<ItemType[]> {
    if (!query || query.length < 3) return [];
    
    const searchResponse = await fetchEsi(`/search/?categories=${category}&search=${encodeURIComponent(query)}&strict=false`);
    
    const searchResult = await searchResponse.json();
    const typeIds: number[] = searchResult[category] || [];

    if (typeIds.length === 0) return [];
    
    // ESI has a /universe/names/ endpoint that can resolve multiple IDs at once via POST
    const namesResponse = await fetchEsi(`/universe/names/`, {
        method: 'POST',
        body: JSON.stringify(typeIds.slice(0, 500)), // Capped at 500 for safety
        headers: { 'Content-Type': 'application/json' },
    });
    
    const itemNames = (await namesResponse.json()) as {id: number, name: string}[];

    const nameMap = new Map(itemNames.map(item => [item.id, item.name]));
    
    // We still need to check if items are published (marketable)
    const itemDetailsPromises = typeIds.slice(0, 100).map(async (id) => {
        try {
            const response = await fetchEsi(`/universe/types/${id}/`);
            const data = await response.json();
            if (data.published) {
                return { type_id: id, name: nameMap.get(id) || data.name };
            }
            return null;
        } catch (error) {
            console.warn(`Could not fetch details for typeId ${id}.`);
            return null;
        }
    });

    const settledDetails = await Promise.all(itemDetailsPromises);
    
    return settledDetails
        .filter((r): r is ItemType => r !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getInitialItemTypes(): Promise<ItemType[]> {
    try {
        const marketGroupResponse = await fetchEsi(`/markets/groups/1857/`, { next: { revalidate: 86400 }}); // Minerals, cache for a day
        const marketGroupData = await marketGroupResponse.json();
        const typeIds: number[] = marketGroupData.types || [];
        
        if (typeIds.length === 0) {
            return [];
        }
        
        const namesResponse = await fetchEsi('/universe/names/', {
            method: 'POST',
            body: JSON.stringify(typeIds),
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        const itemNames: {id: number, name: string}[] = await namesResponse.json();
        const nameMap = new Map(itemNames.map(item => [item.id, item.name]));

        const items: ItemType[] = typeIds.map(id => ({
            type_id: id,
            name: nameMap.get(id) || 'Unknown Mineral'
        }));

        return items.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Failed to get initial item types from market group, falling back.", error);
        return [
            { type_id: 34, name: 'Tritanium' },
            { type_id: 35, name: 'Pyerite' },
            { type_id: 36, name: 'Mexallon' },
        ];
    }
}
