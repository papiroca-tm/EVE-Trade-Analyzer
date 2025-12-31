'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Zap } from 'lucide-react';

const formSchema = z.object({
  regionId: z.coerce.number().int().positive("Region ID must be a positive number."),
  typeId: z.coerce.number().int().positive("Type ID must be a positive number."),
  brokerBuyFeePercent: z.coerce.number().min(0).max(100, "Must be between 0-100"),
  brokerSellFeePercent: z.coerce.number().min(0).max(100, "Must be between 0-100"),
  salesTaxPercent: z.coerce.number().min(0).max(100, "Must be between 0-100"),
  desiredNetMarginPercent: z.coerce.number().min(0, "Must be positive").max(1000, "Margin too high"),
  timeHorizonDays: z.coerce.number().int().positive().min(1, "Must be at least 1 day").max(365, "Max 365 days"),
  optionalTargetVolume: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
      Analyze Market
    </Button>
  );
}

export function InputForm({ formAction }: { formAction: (payload: FormData) => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      regionId: 10000002, // The Forge
      typeId: 34, // Tritanium
      brokerBuyFeePercent: 3.0,
      brokerSellFeePercent: 3.0,
      salesTaxPercent: 5.0,
      desiredNetMarginPercent: 5.0,
      timeHorizonDays: 90,
      optionalTargetVolume: "",
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Parameters</CardTitle>
        <CardDescription>Enter your analysis parameters. Defaults are set for Tritanium in The Forge.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form action={formAction}>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="regionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region ID</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 10000002" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="typeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Type ID</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 34" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brokerBuyFeePercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Broker Buy Fee %</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brokerSellFeePercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Broker Sell Fee %</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salesTaxPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sales Tax %</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="desiredNetMarginPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desired Margin %</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeHorizonDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Horizon</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 90" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">Days for historical analysis.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="optionalTargetVolume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Volume</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Optional" {...field} />
                  </FormControl>
                   <FormDescription className="text-xs">For execution time estimate.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
