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
import type { MarketOrderItem, PriceAnalysis, UserInputs } from '@/lib/types';
import { useMemo, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const SellOrdersRows = ({ orders, averageDailyVolume }: { orders: MarketOrderItem[], averageDailyVolume: number }) => {
    const processedOrders = useMemo(() => {
        if (!orders || orders.length === 0) return [];
        
        const displaySorted = [...orders].sort((a, b) => b.price - a.price);

        const wallThreshold = averageDailyVolume > 0 ? averageDailyVolume / 2 : Infinity;
        
        const logicSorted = [...orders].sort((a, b) => a.price - b.price); 
        
        let wallOrderId: number | undefined;

        let cumulativeForWallCheck = 0;
        for (const order of logicSorted) {
            cumulativeForWallCheck += order.volume_remain;
            if (cumulativeForWallCheck >= wallThreshold) {
                wallOrderId = order.order_id;
                break; 
            }
        }

        const finalOrders = displaySorted.map(order => {
            const fillPercent = averageDailyVolume > 0 
                ? Math.min((order.volume_remain / wallThreshold) * 100, 100)
                : 0;

            return {
                ...order,
                isWall: wallOrderId !== undefined && order.order_id === wallOrderId,
                fillPercent: fillPercent,
            };
        });
        
        return finalOrders;

    }, [orders, averageDailyVolume]);

    return (
        <>
            {processedOrders.length > 0 ? (
                processedOrders.map((order) => (
                    <TableRow 
                        key={order.order_id} 
                        className="border-b-0"
                        style={order.isWall ? {
                            background: `linear-gradient(to left, hsl(0 72% 51% / 0.7) ${order.fillPercent}%, hsl(0 72% 51% / 0.4) ${order.fillPercent}%)`
                        } : {
                            background: `linear-gradient(to left, hsl(var(--accent) / 0.4) ${order.fillPercent}%, transparent ${order.fillPercent}%)`
                        }}
                    >
                        <TableCell className={cn('py-0.5 px-2 text-right font-mono text-red-400', order.isWall && 'font-bold text-destructive-foreground')}>
                            {order.price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={cn("py-0.5 px-2 text-right font-mono", order.isWall && 'font-bold text-destructive-foreground')}>
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
        
        const sorted = [...orders].sort((a, b) => b.price - a.price); 
        
        const wallThreshold = averageDailyVolume > 0 ? averageDailyVolume / 2 : Infinity;
        let cumulativeVolume = 0;
        let wallOrderId: number | undefined;

        for (const order of sorted) {
            cumulativeVolume += order.volume_remain;
            if (cumulativeVolume >= wallThreshold) {
                wallOrderId = order.order_id;
                break;
            }
        }

        const finalOrders = sorted.map(order => {
             const fillPercent = averageDailyVolume > 0 
                ? Math.min((order.volume_remain / wallThreshold) * 100, 100)
                : 0;

            return {
                ...order,
                isWall: wallOrderId !== undefined && order.order_id === wallOrderId,
                fillPercent: fillPercent,
            }
        });

        return finalOrders;
    }, [orders, averageDailyVolume]);

    return (
        <>
            {processedOrders.length > 0 ? (
                processedOrders.map((order) => (
                    <TableRow 
                        key={order.order_id} 
                        className="border-b-0"
                        style={order.isWall ? {
                             background: `linear-gradient(to left, hsl(142 76% 36% / 0.7) ${order.fillPercent}%, hsl(142 76% 36% / 0.4) ${order.fillPercent}%)`
                        } : {
                            background: `linear-gradient(to left, hsl(var(--accent) / 0.4) ${order.fillPercent}%, transparent ${order.fillPercent}%)`
                        }}
                    >
                        <TableCell className={cn('py-0.5 px-2 text-right font-mono text-green-400', order.isWall && 'font-bold text-accent-foreground')}>
                            {order.price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={cn("py-0.5 px-2 text-right font-mono", order.isWall && 'font-bold text-accent-foreground')}>
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


const SpreadRow = ({ priceAnalysis, inputs, spreadRef }: { priceAnalysis?: PriceAnalysis, inputs?: UserInputs, spreadRef: React.RefObject<HTMLTableRowElement> }) => {
    const { spread, marginPercent, rowClass } = useMemo(() => {
        if (!priceAnalysis || !inputs || !priceAnalysis.bestBuyPrice || !priceAnalysis.bestSellPrice || priceAnalysis.bestSellPrice === Infinity) {
            return { spread: null, marginPercent: null, rowClass: "hover:bg-muted/50" };
        }
        const spreadValue = priceAnalysis.bestSellPrice - priceAnalysis.bestBuyPrice;

        const cost = priceAnalysis.bestBuyPrice * (1 + inputs.brokerBuyFeePercent / 100);
        const revenue = priceAnalysis.bestSellPrice * (1 - inputs.brokerSellFeePercent / 100 - inputs.salesTaxPercent / 100);
        const profit = revenue - cost;
        const margin = cost > 0 ? (profit / cost) * 100 : 0;
        
        let calculatedRowClass = "bg-destructive/30 hover:bg-destructive/40"; // Red
        if (margin >= inputs.desiredNetMarginPercent + 1) {
            calculatedRowClass = "bg-green-800/60 hover:bg-green-800/70"; // Green
        } else if (margin >= inputs.desiredNetMarginPercent) {
            calculatedRowClass = "bg-accent/30 hover:bg-accent/40"; // Yellow/Orange
        }

        return { spread: spreadValue, marginPercent: margin, rowClass: calculatedRowClass };
    }, [priceAnalysis, inputs]);

    return (
        <TableRow ref={spreadRef} className={cn("border-y", rowClass)}>
            <TableCell colSpan={2} className="p-1 text-center font-mono text-xs">
                <div className='flex justify-around items-center'>
                    <div className='text-muted-foreground'>
                        Маржа:
                        {marginPercent !== null 
                            ? <span className={cn('ml-1', 'text-foreground')}>{marginPercent.toFixed(2)}%</span>
                            : <span className='ml-1'>-</span>
                        }
                    </div>
                    <div className='text-muted-foreground'>
                        Спред:
                        {spread !== null 
                            ? <span className='ml-1 text-foreground'>{spread.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ISK</span> 
                            : <span className='ml-1'>-</span>
                        }
                    </div>
                </div>
            </TableCell>
        </TableRow>
    )
}

export function OrderBookDisplay({ buyOrders, sellOrders, priceAnalysis, averageDailyVolume, inputs }: { buyOrders: MarketOrderItem[], sellOrders: MarketOrderItem[], priceAnalysis?: PriceAnalysis, averageDailyVolume: number, inputs?: UserInputs }) {
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
  }, [buyOrders, sellOrders, priceAnalysis, averageDailyVolume, inputs]);


  return (
    <Card>
      <CardHeader className="p-3">
        <div className='flex items-center gap-2'>
            <CardTitle className="text-lg">Стакан</CardTitle>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className='max-w-xs'>
                        <p>Фон каждой строки показывает долю объема этого ордера от половины среднесуточного объема, помогая оценить его 'вес'. Ярким цветом подсвечивается 'стена' — первый ордер, где совокупный объем достигает этого порога, указывая на ключевой уровень поддержки (зеленый) или сопротивления (красный).</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-10rem)]" viewportRef={viewportRef}>
          <Table>
            <TableBody>
              <SellOrdersRows orders={sellOrders} averageDailyVolume={averageDailyVolume} />
              <SpreadRow priceAnalysis={priceAnalysis} inputs={inputs} spreadRef={spreadRef} />
              <BuyOrdersRows orders={buyOrders} averageDailyVolume={averageDailyVolume} />
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
