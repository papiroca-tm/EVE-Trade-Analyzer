
'use client';

import { useEffect, useState } from 'react';
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
import type { Region, ItemType } from '@/lib/types';

const formSchema = z.object({
  regionId: z.coerce.number().int().positive("Необходимо выбрать регион."),
  typeId: z.coerce.number().int().positive("Необходимо выбрать предмет."),
  brokerBuyFeePercent: z.coerce.number().min(0).max(100, "Должно быть между 0-100"),
  brokerSellFeePercent: z.coerce.number().min(0).max(100, "Должно быть между 0-100"),
  salesTaxPercent: z.coerce.number().min(0).max(100, "Должно быть между 0-100"),
  desiredNetMarginPercent: z.coerce.number().min(0, "Должно быть положительным").max(1000, "Слишком большая маржа"),
  timeHorizonDays: z.coerce.number().int().positive().min(1, "Минимум 1 день").max(365, "Максимум 365 дней"),
  optionalTargetVolume: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
      Анализировать рынок
    </Button>
  );
}

export function InputForm({ formAction }: { formAction: (payload: FormData) => void }) {
  const [initialData, setInitialData] = useState<{ regions: Region[], itemTypes: ItemType[] }>({ regions: [], itemTypes: [] });
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  const [openItemPopover, setOpenItemPopover] = useState(false);
  const [openRegionPopover, setOpenRegionPopover] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      regionId: 10000002, // The Forge
      typeId: 34, // Tritanium
      brokerBuyFeePercent: 0.5,
      brokerSellFeePercent: 1.33,
      salesTaxPercent: 3.37,
      desiredNetMarginPercent: 5.0,
      timeHorizonDays: 90,
      optionalTargetVolume: "",
    },
  });

  useEffect(() => {
    async function fetchData() {
      setLoadingInitialData(true);
      try {
        const data = await getInitialData();
        setInitialData(data);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setLoadingInitialData(false);
      }
    }
    fetchData();
  }, []);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Параметры рынка</CardTitle>
        <CardDescription>Введите параметры для анализа. По умолчанию установлены значения для Tritanium в The Forge.</CardDescription>
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
                  <FormLabel>Регион</FormLabel>
                   <Popover open={openRegionPopover} onOpenChange={setOpenRegionPopover}>
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
                            ? initialData.regions.find(
                                (region) => region.region_id === field.value
                              )?.name
                            : "Выберите регион"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[26rem] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Поиск региона..."
                         />
                        <CommandList>
                        <CommandEmpty>Регион не найден.</CommandEmpty>
                        <CommandGroup>
                          {initialData.regions.map((region) => (
                            <CommandItem
                              value={region.name}
                              key={region.region_id}
                              onSelect={() => {
                                form.setValue("regionId", region.region_id)
                                setOpenRegionPopover(false);
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
                  <FormLabel>Тип предмета</FormLabel>
                   <Popover open={openItemPopover} onOpenChange={setOpenItemPopover}>
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
                           {initialData.itemTypes.find(item => item.type_id === field.value)?.name ?? "Выберите предмет"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[26rem] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Поиск предмета..."
                        />
                        <CommandList>
                          <CommandEmpty>Предмет не найден.</CommandEmpty>
                          <CommandGroup>
                            {initialData.itemTypes.map((item) => (
                              <CommandItem
                                value={item.name}
                                key={item.type_id}
                                onSelect={() => {
                                  form.setValue("typeId", item.type_id)
                                  setOpenItemPopover(false);
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
                  <FormLabel>Комиссия брокера (покупка) %</FormLabel>
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
                  <FormLabel>Комиссия брокера (продажа) %</FormLabel>
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
                  <FormLabel>Налог с продаж %</FormLabel>
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
                  <FormLabel>Желаемая чистая маржа %</FormLabel>
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
                    <FormLabel>Временной горизонт (дни)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Количество дней для анализа исторических данных (макс. 365).</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="optionalTargetVolume"
                render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                    <FormLabel>Опционально: Целевой объем</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="например, 1000000" {...field} />
                    </FormControl>
                    <FormDescription>Если установлено, будет оценено время для покупки/продажи этого объема.</FormDescription>
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
