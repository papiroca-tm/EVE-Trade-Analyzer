'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

export function WarningsPanel({ warnings }: { warnings: string[] }) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <CardTitle>Предупреждения</CardTitle>
        </div>
        <CardDescription>
            При анализе были выявлены следующие потенциальные проблемы.
        </CardDescription>
      </CardHeader>
      <CardContent>
          <ScrollArea className="h-40">
            <ul className="space-y-2 text-sm">
                {warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <span>{warning}</span>
                    </li>
                ))}
            </ul>
          </ScrollArea>
      </CardContent>
    </Card>
  );
}
