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
import { useMemo } from 'react';

const OrderTable = ({
  orders,
  type,
  rows = 15,
}: {
  orders: MarketOrderItem[];
  type: 'buy' | 'sell';
  rows?: number;
}) => {
  const isSell = type === 'sell';
  
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => type === 'buy' ? b.price - a.price : a.price - b.price);
  }, [orders, type]);

  return (
    <div className="flex-1">
      <ScrollArea className="h-[200px]">
        <Table>
          <TableBody>
            {sortedOrders.length > 0 ? (
              sortedOrders.slice(0, rows).map((order) => (
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
              Array.from({ length: rows }).map((_, i) => (
                <TableRow key={i} className="border-b-0">
                  <TableCell
                    className={cn(
                      'py-0.5 px-2 text-right font-mono',
                      isSell ? 'text-red-400' : 'text-green-400'
                    )}
                  >
                    -
                  </TableCell>
                  <TableCell className="py-0.5 px-2 text-right font-mono">
                    -
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

const SpreadTable = ({ priceAnalysis }: { priceAnalysis?: PriceAnalysis }) => {
    const spread = useMemo(() => {
        if (!priceAnalysis || !priceAnalysis.bestBuyPrice || !priceAnalysis.bestSellPrice || priceAnalysis.bestSellPrice === Infinity) {
            return null;
        }
        return priceAnalysis.bestSellPrice - priceAnalysis.bestBuyPrice;
    }, [priceAnalysis]);

    return (
        <Table>
            <TableBody>
                <TableRow className="border-y hover:bg-muted/50">
                     <TableCell colSpan={2} className="p-1 text-center font-mono text-xs text-muted-foreground">
                        {spread !== null ? spread.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ISK' : '-'}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}

export function OrderBookDisplay({ buyOrders, sellOrders, priceAnalysis }: { buyOrders: MarketOrderItem[], sellOrders: MarketOrderItem[], priceAnalysis?: PriceAnalysis }) {
  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-lg">Стакан</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col">
          <OrderTable orders={sellOrders} type="sell" />
          <SpreadTable priceAnalysis={priceAnalysis} />
          <OrderTable orders={buyOrders} type="buy" />
        </div>
      </CardContent>
    </Card>
  );
}
