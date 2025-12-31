'use client';
import type { DataIntegrityOutput } from '@/ai/flows/data-integrity-analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, Bot } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

export function DataIntegrityPanel({ data }: { data: DataIntegrityOutput }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <CardTitle>AI Data Integrity Analysis</CardTitle>
        </div>
        <CardDescription>Generative AI assessment of data reliability.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex justify-between text-sm font-medium">
            <span>Data Reliability Score</span>
            <span>{data.dataReliabilityScore}/100</span>
          </div>
          <Progress value={data.dataReliabilityScore} aria-label={`Data reliability score: ${data.dataReliabilityScore} out of 100`} />
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="report">
            <AccordionTrigger>View Full Analysis Report</AccordionTrigger>
            <AccordionContent>
                <ScrollArea className="h-40">
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{data.analysisReport}</p>
                </ScrollArea>
            </AccordionContent>
          </AccordionItem>
          {data.warnings && data.warnings.length > 0 && (
             <AccordionItem value="warnings">
                <AccordionTrigger>
                    <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        Warnings ({data.warnings.length})
                    </span>
                </AccordionTrigger>
                <AccordionContent>
                    <ul className="space-y-2 text-sm text-destructive">
                        {data.warnings.map((warning, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{warning}</span>
                            </li>
                        ))}
                    </ul>
                </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
