
'use server';

import type { MarketHistoryItem, MarketOrderItem, Region, ItemType } from './types';

const ESI_BASE_URL = 'https://esi.evetech.net/latest';

async function fetchEsi(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${ESI_BASE_URL}${path}`;
    // Уменьшено время кэширования до 10 минут для получения более свежих данных
    const finalOptions: RequestInit = { ...options, next: { revalidate: 600 } };
    
    console.log(`Fetching ESI: ${url}`);

    try {
        const response = await fetch(url, finalOptions);

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`ESI 404 Not Found for ${url}, returning empty array.`);
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

export async function fetchMarketHistory(regionId: number, typeId: number): Promise<MarketHistoryItem[]> {
  const response = await fetchEsi(`/markets/${regionId}/history/?type_id=${typeId}`);
  const data: MarketHistoryItem[] = await response.json();
  // Сортировка в хронологическом порядке (от старых к новым)
  return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
            // Исключаем регионы червоточин, т.к. у них нет рынков
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

async function resolveTypeNames(typeIds: number[]): Promise<Map<number, string>> {
    const nameMap = new Map<number, string>();
    // ESI /universe/names/ endpoint can handle up to 1000 IDs per request
    const chunks = [];
    for (let i = 0; i < typeIds.length; i += 1000) {
        chunks.push(typeIds.slice(i, i + 1000));
    }

    for (const chunk of chunks) {
        try {
            const namesResponse = await fetchEsi(`/universe/names/`, {
                method: 'POST',
                body: JSON.stringify(chunk),
                headers: { 'Content-Type': 'application/json' },
            });
            const itemNames: {id: number, name: string}[] = await namesResponse.json();
            for (const item of itemNames) {
                nameMap.set(item.id, item.name);
            }
        } catch (error) {
            console.error(`Failed to resolve names for a chunk`, error);
        }
    }
    return nameMap;
}

export async function getAllMarketableTypes(regionId: number): Promise<ItemType[]> {
    try {
        console.log(`Fetching all marketable type IDs for region ${regionId}`);
        const typeIds: number[] = await fetchAllPages(`/markets/${regionId}/types/`);
        console.log(`Found ${typeIds.length} type IDs. Resolving names...`);

        if (typeIds.length === 0) {
            console.warn(`No marketable types found for region ${regionId}.`);
            return [];
        }

        const nameMap = await resolveTypeNames(typeIds);
        console.log(`Resolved ${nameMap.size} names.`);

        const items: ItemType[] = typeIds
            .map(id => ({
                type_id: id,
                name: nameMap.get(id) || `Unknown Type ID: ${id}`
            }))
            .filter(item => !item.name.startsWith('Unknown'));

        console.log(`Returning ${items.length} marketable items.`);
        return items.sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
        console.error("Failed to get all marketable types, falling back to a small default list.", error);
        return [
            { type_id: 34, name: 'Tritanium' },
            { type_id: 35, name: 'Pyerite' },
            { type_id: 36, name: 'Mexallon' },
        ];
    }
}
