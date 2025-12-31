
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, Loader2, Zap } from 'lucide-react';
import { getInitialData } from '@/lib/actions';
import { searchItemTypes } from '@/lib/eve-esi';
import type { Region, ItemType } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';


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
  const [regions, setRegions] = useState<Region[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  const [regionSearch, setRegionSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [isSearchingItems, setIsSearchingItems] = useState(false);

  const debouncedItemSearch = useDebounce(itemSearch, 300);

  useEffect(() => {
    async function fetchData() {
      setLoadingInitialData(true);
      try {
        const { regions, itemTypes } = await getInitialData();
        setRegions(regions);
        setItemTypes(itemTypes);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setLoadingInitialData(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (debouncedItemSearch.length < 3) {
      if(itemTypes.length > 1) setIsSearchingItems(false);
      return;
    };

    const search = async () => {
      setIsSearchingItems(true);
      const results = await searchItemTypes(debouncedItemSearch);
      setItemTypes(results);
      setIsSearchingItems(false);
    };

    search();
  }, [debouncedItemSearch]);


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

  const filteredRegions = regions.filter(region => region.name.toLowerCase().includes(regionSearch.toLowerCase()));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Parameters</CardTitle>
        <CardDescription>Enter your analysis parameters. Defaults are set for Tritanium in The Forge.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form action={formAction}>
          <CardContent className="grid grid-cols-1 gap-y-4 gap-x-2 sm:grid-cols-2">
            {loadingInitialData ? (
                <>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                </>
            ) : (
             <>
            <FormField
              control={form.control}
              name="regionId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Region</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? regions.find(
                                (region) => region.region_id === field.value
                              )?.name
                            : "Select region"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[26rem] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search region..."
                          value={regionSearch}
                          onValueChange={setRegionSearch}
                         />
                        <CommandEmpty>No region found.</CommandEmpty>
                        <CommandList>
                        <CommandGroup>
                          {filteredRegions.map((region) => (
                            <CommandItem
                              value={region.name}
                              key={region.region_id}
                              onSelect={() => {
                                form.setValue("regionId", region.region_id)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  region.region_id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {region.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="typeId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Item Type</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? itemTypes.find(
                                (item) => item.type_id === field.value
                              )?.name ?? 'Select item'
                            : "Select item"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[26rem] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search item (3+ chars)..."
                          value={itemSearch}
                          onValueChange={setItemSearch}
                        />
                        <CommandList>
                          {isSearchingItems && <CommandEmpty>Searching...</CommandEmpty>}
                          {!isSearchingItems && itemTypes.length === 0 && <CommandEmpty>No item found.</CommandEmpty>}
                          <CommandGroup>
                            {itemTypes.map((item) => (
                              <CommandItem
                                value={item.name}
                                key={item.type_id}
                                onSelect={() => {
                                  form.setValue("typeId", item.type_id)
                                  // Keep the selected item in the list for UX
                                  if (!itemTypes.find(i => i.type_id === item.type_id)) {
                                    setItemTypes(prev => [...prev, item]);
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    item.type_id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {item.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            </>
            )}

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
