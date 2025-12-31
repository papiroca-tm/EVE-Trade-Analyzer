'use client';
import type { MarketOrderItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen } from 'lucide-react';

const OrderTable = ({ orders, type }: { orders: MarketOrderItem[], type: 'buy' | 'sell' }) => (
    <div className='w-1/2'>
        <h3 className={`mb-2 text-lg font-semibold ${type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
            {type === 'buy' ? 'Buy Orders' : 'Sell Orders'}
        </h3>
        <ScrollArea className="h-64 border rounded-md">
          <Table>
            <TableHeader className='sticky top-0 bg-muted/50'>
              <TableRow>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length > 0 ? (
                orders.slice(0, 100).map((order) => (
                  <TableRow key={order.order_id}>
                    <TableCell className="font-mono">{order.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-mono">{order.volume_remain.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No {type} orders.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
    </div>
);


export function OrderBookPanel({ buyOrders, sellOrders }: { buyOrders: MarketOrderItem[], sellOrders: MarketOrderItem[] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <CardTitle>Live Order Book</CardTitle>
        </div>
        <CardDescription>A snapshot of the top 100 current buy and sell orders.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <OrderTable orders={buyOrders} type="buy" />
        <OrderTable orders={sellOrders} type="sell" />
      </CardContent>
    </Card>
  );
}
