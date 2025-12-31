
'use server';

import type { MarketHistoryItem, MarketOrderItem, Region, ItemType } from './types';

const ESI_BASE_URL = 'https://esi.evetech.net/latest';

async function fetchEsi(path: string, cache: boolean = false) {
    const url = `${ESI_BASE_URL}${path}`;
    const options: RequestInit = cache ? { next: { revalidate: 3600 } } : { cache: 'no-store' };
    const response = await fetch(url, options);

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`ESI Error for ${path}: ${response.status} ${errorBody}`);
        throw new Error(`Failed to fetch from ESI at ${path}: ${response.statusText}`);
    }
    return response;
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
            break;
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
                if (id >= 11000000) {
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
    
    const maxIdsToFetch = 50; 
    const cappedTypeIds = typeIds.slice(0, maxIdsToFetch);
    
    const typeDetails = await Promise.all(
      cappedTypeIds.map(async (id) => {
        try {
            const response = await fetchEsi(`/universe/types/${id}/`, true);
            const data = await response.json();
            // Ensure the item is published and has a market group (i.e., is tradeable)
            if (data.published && data.market_group_id) {
                return { type_id: id, name: data.name };
            }
            return null;
        } catch (e) {
            console.warn(`Failed to fetch type details for ID ${id}`, e);
            return null;
        }
      })
    );
    
    return typeDetails
        .filter((t): t is ItemType => t !== null)
        .sort((a,b) => a.name.localeCompare(b.name));
}
