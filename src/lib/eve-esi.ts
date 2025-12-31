
import type { MarketHistoryItem, MarketOrderItem, Region, ItemType } from './types';

const ESI_BASE_URL = 'https://esi.evetech.net/latest';

// Fetch with a 24-hour cache policy.
async function fetchWithCache(url: string) {
    return fetch(url, { next: { revalidate: 86400 } }); 
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
    const response = await fetchWithoutCache(url);

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
        break;
    }
    
    page++;
  }
  
  return allOrders;
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
    const marketGroupsUrl = `${ESI_BASE_URL}/markets/groups/`;
    const marketGroupsResponse = await fetchWithCache(marketGroupsUrl);
    if (!marketGroupsResponse.ok) throw new Error("Failed to fetch market group IDs");
    const marketGroupIds: number[] = await marketGroupsResponse.json();
    
    let allTypeIds: number[] = [];

    for (const groupId of marketGroupIds) {
        try {
            const groupUrl = `${ESI_BASE_URL}/markets/groups/${groupId}/`;
            const groupResponse = await fetchWithCache(groupUrl);
            if (!groupResponse.ok) continue;
            const groupData = await groupResponse.json();
            if (groupData.types) {
                allTypeIds.push(...groupData.types);
            }
        } catch(e) {
             console.error(`Failed to fetch market group details for ID ${groupId}`, e);
        }
    }
    
    const uniqueTypeIds = [...new Set(allTypeIds)];

    const batchSize = 200;
    let allTypeDetails: (ItemType | null)[] = [];

    for (let i = 0; i < uniqueTypeIds.length; i += batchSize) {
        const batchIds = uniqueTypeIds.slice(i, i + batchSize);
        try {
            const url = `${ESI_BASE_URL}/universe/types/`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(batchIds),
                cache: 'force-cache',
            });
            if (!response.ok) continue;

            const data = await response.json();
            const batchDetails = data.map((item: any) => {
                if (!item.published) return null;
                return { type_id: item.type_id, name: item.name };
            });
            allTypeDetails.push(...batchDetails);

        } catch (e) {
            console.error(`Failed to fetch item details for batch`, e);
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to be polite to the API
    }
    
    return allTypeDetails
        .filter((t): t is ItemType => t !== null && !!t.name)
        .sort((a,b) => a.name.localeCompare(b.name));
}
