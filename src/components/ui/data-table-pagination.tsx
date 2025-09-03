import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { PaginationResult } from '@/hooks/usePagination';

interface DataTablePaginationProps<T> extends PaginationResult<T> {
  className?: string;
  showCard?: boolean;
}

export function DataTablePagination<T>({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  startIndex,
  endIndex,
  hasNextPage,
  hasPreviousPage,
  pageSizeOptions,
  setCurrentPage,
  setPageSize,
  goToFirstPage,
  goToLastPage,
  goToNextPage,
  goToPreviousPage,
  className,
  showCard = true
}: DataTablePaginationProps<T>) {
  const paginationControls = (
    <PaginationControls
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      totalItems={totalItems}
      startIndex={startIndex}
      endIndex={endIndex}
      hasNextPage={hasNextPage}
      hasPreviousPage={hasPreviousPage}
      pageSizeOptions={pageSizeOptions}
      onPageChange={setCurrentPage}
      onPageSizeChange={setPageSize}
      onFirstPage={goToFirstPage}
      onLastPage={goToLastPage}
      onNextPage={goToNextPage}
      onPreviousPage={goToPreviousPage}
      className={className}
    />
  );

  if (showCard) {
    return (
      <Card>
        <CardContent className="p-4">
          {paginationControls}
        </CardContent>
      </Card>
    );
  }

  return paginationControls;
}