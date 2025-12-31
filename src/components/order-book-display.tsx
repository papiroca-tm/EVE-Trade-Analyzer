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
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { MarketOrderItem, PriceAnalysis } from '@/lib/types';
import { useMemo, useRef, useEffect } from 'react';

const OrderTable = ({
  orders,
  type,
}: {
  orders: MarketOrderItem[];
  type: 'buy' | 'sell';
}) => {
  const isSell = type === 'sell';
  
  const sortedOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => type === 'buy' ? b.price - a.price : a.price - b.price);
    // For sell orders, we need to show the lowest price at the bottom (closer to the spread)
    // so we reverse the ascending sort.
    if (type === 'sell') {
      return sorted.reverse();
    }
    return sorted;
  }, [orders, type]);

  return (
    <div className="flex-1">
      <Table>
        <TableBody>
          {sortedOrders.length > 0 ? (
            sortedOrders.map((order) => (
              <TableRow key={order.order_id} className="border-b-0">
                <TableCell
                  className={cn(
                    'py-0.5 px-2 text-right font-mono',
                    isSell ? 'text-red-400' : 'text-green-400'
                  )}
                >
                  {order.price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="py-0.5 px-2 text-right font-mono">
                  {order.volume_remain.toLocaleString('ru-RU')}
                </TableCell>
              </TableRow>
            ))
          ) : (
              <TableRow className="border-b-0">
                <TableCell colSpan={2} className="py-0.5 px-2 text-center font-mono text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

const SpreadTable = ({ priceAnalysis, spreadRef }: { priceAnalysis?: PriceAnalysis, spreadRef: React.RefObject<HTMLDivElement> }) => {
    const spread = useMemo(() => {
        if (!priceAnalysis || !priceAnalysis.bestBuyPrice || !priceAnalysis.bestSellPrice || priceAnalysis.bestSellPrice === Infinity) {
            return null;
        }
        return priceAnalysis.bestSellPrice - priceAnalysis.bestBuyPrice;
    }, [priceAnalysis]);

    return (
        <div ref={spreadRef}>
            <Table>
                <TableBody>
                    <TableRow className="border-y hover:bg-muted/50">
                        <TableCell colSpan={2} className="p-1 text-center font-mono text-xs text-muted-foreground">
                            {spread !== null ? spread.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ISK' : '-'}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    )
}

export function OrderBookDisplay({ buyOrders, sellOrders, priceAnalysis }: { buyOrders: MarketOrderItem[], sellOrders: MarketOrderItem[], priceAnalysis?: PriceAnalysis }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);
  
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
          <div className="flex flex-col">
            <OrderTable orders={sellOrders} type="sell" />
            <SpreadTable priceAnalysis={priceAnalysis} spreadRef={spreadRef} />
            <OrderTable orders={buyOrders} type="buy" />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}