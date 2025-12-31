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


const SellOrdersRows = ({ orders }: { orders: MarketOrderItem[] }) => {
    const sortedOrders = useMemo(() => {
        return [...orders]
            .sort((a, b) => a.price - b.price) // Ascending for sells
            .reverse(); // Show lowest price at the bottom
    }, [orders]);

    return (
        <>
            {sortedOrders.length > 0 ? (
                sortedOrders.map((order) => (
                    <TableRow key={order.order_id} className="border-b-0">
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

const BuyOrdersRows = ({ orders }: { orders: MarketOrderItem[] }) => {
    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => b.price - a.price); // Descending for buys
    }, [orders]);

    return (
        <>
            {sortedOrders.length > 0 ? (
                sortedOrders.map((order) => (
                    <TableRow key={order.order_id} className="border-b-0">
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

export function OrderBookDisplay({ buyOrders, sellOrders, priceAnalysis }: { buyOrders: MarketOrderItem[], sellOrders: MarketOrderItem[], priceAnalysis?: PriceAnalysis }) {
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
        <ScrollArea className="h-[calc(100vh-13rem)]" viewportRef={viewportRef}>
          <Table>
            {/* Invisible header for column width */}
            <TableHeader className='invisible h-0'>
                <TableRow className='h-0'>
                    <TableHead className='py-0 px-2 w-1/2'></TableHead>
                    <TableHead className='py-0 px-2 w-1/2'></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              <SellOrdersRows orders={sellOrders} />
              <SpreadRow priceAnalysis={priceAnalysis} spreadRef={spreadRef} />
              <BuyOrdersRows orders={buyOrders} />
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
