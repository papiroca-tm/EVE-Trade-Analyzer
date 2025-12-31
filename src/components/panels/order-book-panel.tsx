
'use client';
import type { MarketOrderItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface OrderWithCumulative extends MarketOrderItem {
    cumulativeVolume: number;
    isWall: boolean;
}

const OrderTable = ({ orders, type, averageDailyVolume }: { orders: MarketOrderItem[], type: 'buy' | 'sell', averageDailyVolume: number }) => {
    const wallThreshold = averageDailyVolume > 0 ? averageDailyVolume / 2 : Infinity;

    const ordersWithCumulative = useMemo(() => {
        let cumulativeVolume = 0;
        let wallFound = false;

        const processedOrders: OrderWithCumulative[] = orders.map(order => {
            cumulativeVolume += order.volume_remain;
            let isWall = false;
            if (!wallFound && cumulativeVolume >= wallThreshold) {
                isWall = true;
                wallFound = true;
            }
            return { ...order, cumulativeVolume, isWall };
        });
        
        return processedOrders;
    }, [orders, wallThreshold]);


    return (
        <div className='w-1/2'>
            <h3 className={cn('mb-2 text-lg font-semibold', type === 'buy' ? 'text-green-400' : 'text-red-400')}>
                {type === 'buy' ? 'Ордера на покупку' : 'Ордера на продажу'}
            </h3>
            <ScrollArea className="h-64 border rounded-md">
            <Table>
                <TableHeader className='sticky top-0 bg-muted/50 z-10'>
                <TableRow>
                    <TableHead className={cn('py-2', type === 'buy' ? 'text-green-400' : 'text-red-400')}>Цена</TableHead>
                    <TableHead className="text-right py-2">Объем</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {ordersWithCumulative.length > 0 ? (
                    ordersWithCumulative.slice(0, 100).map((order) => (
                    <TableRow key={order.order_id} className={cn(order.isWall && "bg-muted/50 font-bold")}>
                        <TableCell className="py-1 px-4 font-mono">{order.price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="py-1 px-4 text-right font-mono">{order.volume_remain.toLocaleString('ru-RU')}</TableCell>
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
};


export function OrderBookPanel({ buyOrders, sellOrders, averageDailyVolume }: { buyOrders: MarketOrderItem[], sellOrders: MarketOrderItem[], averageDailyVolume: number }) {
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
        <CardDescription>Снимок топ-100 текущих ордеров. Уровни поддержки/сопротивления подсвечены.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <OrderTable orders={sortedBuyOrders} type="buy" averageDailyVolume={averageDailyVolume} />
        <OrderTable orders={sortedSellOrders} type="sell" averageDailyVolume={averageDailyVolume} />
      </CardContent>
    </Card>
  );
}
