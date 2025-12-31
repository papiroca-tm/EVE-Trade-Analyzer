'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHead,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { MarketOrderItem, PriceAnalysis } from '@/lib/types';
import { useMemo, useRef, useEffect } from 'react';

const SellOrdersRows = ({ orders, averageDailyVolume }: { orders: MarketOrderItem[], averageDailyVolume: number }) => {
    const processedOrders = useMemo(() => {
        if (!orders || orders.length === 0) return [];
        
        // Final display order: lowest price at the bottom
        const displaySorted = [...orders].sort((a, b) => b.price - a.price);

        const wallThreshold = averageDailyVolume > 0 ? averageDailyVolume / 2 : Infinity;
        
        // To find the wall, we need to sort by price ascending (cheapest first)
        const logicSorted = [...orders].sort((a, b) => a.price - b.price); 
        
        let cumulativeForWallCheck = 0;
        let wallOrderId: number | undefined;

        for (const order of logicSorted) {
            cumulativeForWallCheck += order.volume_remain;
            if (cumulativeForWallCheck >= wallThreshold) {
                wallOrderId = order.order_id;
                break; // Found our wall order
            }
        }

        const finalOrders = displaySorted.map(order => ({
            ...order,
            isWall: wallOrderId !== undefined && order.order_id === wallOrderId,
        }));
        
        return finalOrders;

    }, [orders, averageDailyVolume]);

    return (
        <>
            {processedOrders.length > 0 ? (
                processedOrders.map((order) => (
                    <TableRow key={order.order_id} className={cn("border-b-0", order.isWall && 'bg-accent/40 text-accent-foreground font-bold')}>
                        <TableCell className='py-0.5 px-2 text-right font-mono text-red-400'>
                            {order.price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-0.5 px-2 text-right font-mono">
                            {order.volume_remain.toLocaleString('ru-RU')}
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow className="border-b-0">
                    <TableCell colSpan={2} className="py-0.5 px-2 text-center font-mono text-muted-foreground">-</TableCell>
                </TableRow>
            )}
        </>
    );
};

const BuyOrdersRows = ({ orders, averageDailyVolume }: { orders: MarketOrderItem[], averageDailyVolume: number }) => {
    const processedOrders = useMemo(() => {
        if (!orders || orders.length === 0) return [];
        
        // Display order: highest price at top
        const sorted = [...orders].sort((a, b) => b.price - a.price); 
        
        const wallThreshold = averageDailyVolume > 0 ? averageDailyVolume / 2 : Infinity;
        let cumulativeVolume = 0;
        let wallOrderId: number | undefined;

        // Find the specific order that crosses the threshold
        for (const order of sorted) {
            cumulativeVolume += order.volume_remain;
            if (cumulativeVolume >= wallThreshold) {
                wallOrderId = order.order_id;
                break;
            }
        }

        const finalOrders = sorted.map(order => ({
            ...order,
            isWall: wallOrderId !== undefined && order.order_id === wallOrderId
        }));

        return finalOrders;
    }, [orders, averageDailyVolume]);

    return (
        <>
            {processedOrders.length > 0 ? (
                processedOrders.map((order) => (
                    <TableRow key={order.order_id} className={cn("border-b-0", order.isWall && 'bg-accent/40 text-accent-foreground font-bold')}>
                        <TableCell className='py-0.5 px-2 text-right font-mono text-green-400'>
                            {order.price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-0.5 px-2 text-right font-mono">
                            {order.volume_remain.toLocaleString('ru-RU')}
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow className="border-b-0">
                    <TableCell colSpan={2} className="py-0.5 px-2 text-center font-mono text-muted-foreground">-</TableCell>
                </TableRow>
            )}
        </>
    );
};


const SpreadRow = ({ priceAnalysis, spreadRef }: { priceAnalysis?: PriceAnalysis, spreadRef: React.RefObject<HTMLTableRowElement> }) => {
    const spread = useMemo(() => {
        if (!priceAnalysis || !priceAnalysis.bestBuyPrice || !priceAnalysis.bestSellPrice || priceAnalysis.bestSellPrice === Infinity) {
            return null;
        }
        return priceAnalysis.bestSellPrice - priceAnalysis.bestBuyPrice;
    }, [priceAnalysis]);

    return (
        <TableRow ref={spreadRef} className="border-y hover:bg-muted/50">
            <TableCell colSpan={2} className="p-1 text-center font-mono text-xs text-muted-foreground">
                {spread !== null ? spread.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ISK' : '-'}
            </TableCell>
        </TableRow>
    )
}

export function OrderBookDisplay({ buyOrders, sellOrders, priceAnalysis, averageDailyVolume }: { buyOrders: MarketOrderItem[], sellOrders: MarketOrderItem[], priceAnalysis?: PriceAnalysis, averageDailyVolume: number }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLTableRowElement>(null);
  
  useEffect(() => {
    if (viewportRef.current && spreadRef.current && (buyOrders.length > 0 || sellOrders.length > 0)) {
        const viewportHeight = viewportRef.current.offsetHeight;
        const spreadTop = spreadRef.current.offsetTop;
        const spreadHeight = spreadRef.current.offsetHeight;
        
        const scrollTo = spreadTop - (viewportHeight / 2) + (spreadHeight / 2);
        
        viewportRef.current.scrollTo({
            top: scrollTo,
            behavior: 'auto',
        });
    }
  }, [buyOrders, sellOrders, priceAnalysis, averageDailyVolume]);


  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-lg">Стакан</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-10rem)]" viewportRef={viewportRef}>
          <Table>
            <TableHeader className='sticky top-0 bg-background z-10'>
                <TableRow className='hover:bg-muted/50'>
                    <TableHead className='py-1 px-2 w-1/2 text-right'>Цена</TableHead>
                    <TableHead className='py-1 px-2 w-1/2 text-right'>Объем</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              <SellOrdersRows orders={sellOrders} averageDailyVolume={averageDailyVolume} />
              <SpreadRow priceAnalysis={priceAnalysis} spreadRef={spreadRef} />
              <BuyOrdersRows orders={buyOrders} averageDailyVolume={averageDailyVolume} />
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
