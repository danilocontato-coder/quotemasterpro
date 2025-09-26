import { Skeleton } from "@/components/ui/skeleton";

interface PageLoaderProps {
  hasHeader?: boolean;
  hasMetrics?: boolean;
  hasSearch?: boolean;
  hasGrid?: boolean;
  hasTable?: boolean;
  gridColumns?: number;
  tableRows?: number;
  metricsCount?: number;
}

export function PageLoader({
  hasHeader = true,
  hasMetrics = false,
  hasSearch = false,
  hasGrid = false,
  hasTable = false,
  gridColumns = 3,
  tableRows = 5,
  metricsCount = 4
}: PageLoaderProps) {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      {hasHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      )}

      {/* Metrics Cards Skeleton */}
      {hasMetrics && (
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(metricsCount, 6)} gap-4`}>
          {Array.from({ length: metricsCount }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      )}

      {/* Search/Filters Skeleton */}
      {hasSearch && (
        <div className="p-6 border rounded-lg">
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-10 flex-1" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout Skeleton */}
      {hasGrid && (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${gridColumns} gap-6`}>
          {Array.from({ length: gridColumns * 2 }).map((_, index) => (
            <div key={index} className="border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-12" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table Layout Skeleton */}
      {hasTable && (
        <div className="border rounded-lg">
          <div className="p-6 border-b">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <th key={index} className="p-4 text-left">
                        <Skeleton className="h-4 w-20" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: tableRows }).map((_, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                      {Array.from({ length: 6 }).map((_, colIndex) => (
                        <td key={colIndex} className="p-4">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}