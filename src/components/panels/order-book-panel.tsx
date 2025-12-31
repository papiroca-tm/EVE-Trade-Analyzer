
'use client';
import type { MarketOrderItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen } from 'lucide-react';
import { useMemo } from 'react';

const OrderTable = ({ orders, type }: { orders: MarketOrderItem[], type: 'buy' | 'sell' }) => (
    <div className='w-1/2'>
        <h3 className={`mb-2 text-lg font-semibold ${type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
            {type === 'buy' ? 'Ордера на покупку' : 'Ордера на продажу'}
        </h3>
        <ScrollArea className="h-64 border rounded-md">
          <Table>
            <TableHeader className='sticky top-0 bg-muted/50'>
              <TableRow>
                <TableHead className={type === 'buy' ? 'text-green-400' : 'text-red-400'}>Цена</TableHead>
                <TableHead className="text-right">Объем</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length > 0 ? (
                orders.slice(0, 100).map((order) => (
                  <TableRow key={order.order_id}>
                    <TableCell className="font-mono">{order.price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-mono">{order.volume_remain.toLocaleString('ru-RU')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    Нет ордеров на {type === 'buy' ? 'покупку' : 'продажу'}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
    </div>
);


export function OrderBookPanel({ buyOrders, sellOrders }: { buyOrders: MarketOrderItem[], sellOrders: MarketOrderItem[] }) {
    const sortedBuyOrders = useMemo(() => 
        [...buyOrders].sort((a, b) => b.price - a.price),
    [buyOrders]);

    const sortedSellOrders = useMemo(() =>
        [...sellOrders].sort((a, b) => a.price - b.price),
    [sellOrders]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <CardTitle>Активные ордера</CardTitle>
        </div>
        <CardDescription>Снимок топ-100 текущих ордеров на покупку и продажу.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <OrderTable orders={sortedBuyOrders} type="buy" />
        <OrderTable orders={sortedSellOrders} type="sell" />
      </CardContent>
    </Card>
  );
}
