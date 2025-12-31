import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
            <div>
                <Skeleton className="h-6 w-1/4 mb-2" />
                <Skeleton className="h-64 w-full" />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <Skeleton className="h-8 w-1/2" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
        </CardHeader>
        <CardContent className="flex gap-4">
            <Skeleton className="h-64 w-1/2" />
            <Skeleton className="h-64 w-1/2" />
        </CardContent>
      </Card>
    </div>
  );
}
