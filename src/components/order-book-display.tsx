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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const OrderTable = ({
  type,
  rows = 15,
}: {
  type: 'buy' | 'sell';
  rows?: number;
}) => {
  const isSell = type === 'sell';
  return (
    <div className="flex-1">
      <ScrollArea className="h-[200px]">
        <Table>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
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
                <TableCell className="py-0.5 px-2 text-right font-mono">
                  -
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

const SpreadTable = () => {
    return (
        <Table>
            <TableBody>
                <TableRow className="border-y hover:bg-muted/50">
                     <TableCell colSpan={3} className="p-1 text-center font-mono text-xs text-muted-foreground">
                        -
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}

export function OrderBookDisplay() {
  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-lg">Стакан</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col">
          <OrderTable type="sell" />
          <SpreadTable />
          <OrderTable type="buy" />
        </div>
      </CardContent>
    </Card>
  );
}
