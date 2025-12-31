
'use client';

import { useEffect, useState, useMemo } from 'react';
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
  regionId: z.coerce.number().int().positive("Region must be selected."),
  typeId: z.coerce.number().int().positive("Item must be selected."),
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
  const [initialItemTypes, setInitialItemTypes] = useState<ItemType[]>([]);
  const [searchedItemTypes, setSearchedItemTypes] = useState<ItemType[]>([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  const [itemSearch, setItemSearch] = useState('');
  const [isSearchingItems, setIsSearchingItems] = useState(false);

  const debouncedItemSearch = useDebounce(itemSearch, 300);

  useEffect(() => {
    async function fetchData() {
      setLoadingInitialData(true);
      try {
        const { regions, itemTypes: initialItems } = await getInitialData();
        setRegions(regions);
        setInitialItemTypes(initialItems);
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
      setSearchedItemTypes([]);
      setIsSearchingItems(false);
      return;
    }

    const search = async () => {
      setIsSearchingItems(true);
      try {
        const results = await searchItemTypes(debouncedItemSearch);
        setSearchedItemTypes(results);
      } catch (error) {
        console.error("Failed to search for item types:", error);
        setSearchedItemTypes([]);
      } finally {
        setIsSearchingItems(false);
      }
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

  const displayedItems = useMemo(() => {
    const combined = new Map<number, ItemType>();
    initialItemTypes.forEach(item => combined.set(item.type_id, item));
    searchedItemTypes.forEach(item => combined.set(item.type_id, item));
    
    // Also ensure the currently selected item is in the list, even if it's not in the search results
    const selectedTypeId = form.watch('typeId');
    if(selectedTypeId && !combined.has(selectedTypeId)) {
        const allItems = [...initialItemTypes, ...searchedItemTypes];
        const selectedItem = allItems.find(i => i.type_id === selectedTypeId);
        if (selectedItem) {
            combined.set(selectedTypeId, selectedItem);
        }
    }
    
    return Array.from(combined.values()).sort((a,b)=> a.name.localeCompare(b.name));
  }, [initialItemTypes, searchedItemTypes, form.watch('typeId')]);


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
                    <div className="space-y-2 sm:col-span-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2 sm:col-span-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                </>
            ) : (
             <>
            <FormField
              control={form.control}
              name="regionId"
              render={({ field }) => (
                <FormItem className="flex flex-col sm:col-span-2">
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
                         />
                        <CommandEmpty>No region found.</CommandEmpty>
                        <CommandList>
                        <CommandGroup>
                          {regions.map((region) => (
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
                <FormItem className="flex flex-col sm:col-span-2">
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
                            ? displayedItems.find(item => item.type_id === field.value)?.name ?? 'Select item'
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
                          {isSearchingItems && <CommandItem className='flex items-center gap-2'><Loader2 className="h-4 w-4 animate-spin" />Searching...</CommandItem>}
                          <CommandEmpty>
                            {!isSearchingItems && 'No item found.'}
                          </CommandEmpty>
                          <CommandGroup>
                            {displayedItems.map((item) => (
                              <CommandItem
                                value={item.name}
                                key={item.type_id}
                                onSelect={() => {
                                  form.setValue("typeId", item.type_id)
                                  if (!initialItemTypes.some(i => i.type_id === item.type_id)) {
                                    setInitialItemTypes(prev => [...prev, item]);
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
                  <FormLabel>Desired Net Margin %</FormLabel>
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
                    <FormItem className="sm:col-span-2">
                    <FormLabel>Time Horizon (Days)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>How many days of historical data to analyze (max 365).</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="optionalTargetVolume"
                render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                    <FormLabel>Optional: Target Volume</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="e.g., 1000000" {...field} />
                    </FormControl>
                    <FormDescription>If set, estimates time to buy/sell this volume.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <input type="hidden" {...form.register('regionId')} />
            <input type="hidden" {...form.register('typeId')} />

          </CardContent>
          <CardFooter>
             <SubmitButton />
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
