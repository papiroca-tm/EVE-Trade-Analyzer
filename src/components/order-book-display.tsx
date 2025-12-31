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

interface OrderWithWall extends MarketOrderItem {
    isWall: boolean;
}

const SellOrdersRows = ({ orders, averageDailyVolume }: { orders: MarketOrderItem[], averageDailyVolume: number }) => {
    const processedOrders = useMemo(() => {
        if (!orders || orders.length === 0) return [];
        
        const sorted = [...orders]
            .sort((a, b) => a.price - b.price) // Ascending for sells
            .reverse(); // Show lowest price at the bottom

        const wallThreshold = averageDailyVolume > 0 ? averageDailyVolume / 2 : Infinity;
        
        // The logic for sell walls is based on orders *at or cheaper* than the current one.
        // We need to re-process to apply the flag correctly after sorting.
        let cumulativeForWallCheck = 0;
        const reversedForWallCheck = [...orders].sort((a, b) => a.price - b.price);
        const wallPrice = reversedForWallCheck.find(o => {
            cumulativeForWallCheck += o.volume_remain;
            return cumulativeForWallCheck >= wallThreshold;
        })?.price;

        const finalOrders = sorted.map(order => ({
            ...order,
            isWall: wallPrice !== undefined && order.price === wallPrice,
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
        
        const sorted = [...orders].sort((a, b) => b.price - a.price); // Descending for buys
        
        const wallThreshold = averageDailyVolume > 0 ? averageDailyVolume / 2 : Infinity;
        let cumulativeVolume = 0;
        
        const wallPrice = sorted.find(o => {
            cumulativeVolume += o.volume_remain;
            return cumulativeVolume >= wallThreshold;
        })?.price;

        const finalOrders = sorted.map(order => ({
            ...order,
            isWall: wallPrice !== undefined && order.price === wallPrice
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
            behavior: 'smooth',
        });
    }
  }, [buyOrders, sellOrders, priceAnalysis]);


  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-lg">Стакан</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-10rem)]" viewportRef={viewportRef}>
          <Table>
            <TableHeader className='invisible h-0'>
                <TableRow className='h-0'>
                    <TableHead className='py-0 px-2 w-1/2'></TableHead>
                    <TableHead className='py-0 px-2 w-1/2'></TableHead>
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
