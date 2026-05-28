"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pandaclock/ui";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Имя query-параметра для страницы (по умолчанию "page"). */
  pageKey?: string;
  /** Имя query-параметра для размера (по умолчанию "pageSize"). */
  pageSizeKey?: string;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

export function TablePagination({
  page,
  pageSize,
  total,
  pageKey = "page",
  pageSizeKey = "pageSize",
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}: TablePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function hrefFor(p: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete(pageKey);
    else params.set(pageKey, String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function changePageSize(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(pageSizeKey, next);
    params.delete(pageKey);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  // Сборка номеров страниц с эллипсами вокруг текущей.
  const pages = buildPageList(page, totalPages);

  return (
    <div className="border-border flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
      <div className="text-muted-foreground text-xs">
        Показано{" "}
        <span className="text-foreground font-semibold">
          {start}–{end}
        </span>{" "}
        из <span className="text-foreground font-semibold">{total}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>Строк на странице:</span>
          <Select value={String(pageSize)} onValueChange={changePageSize}>
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={hrefFor(Math.max(1, page - 1))}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {pages.map((p, idx) =>
                p === "..." ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink href={hrefFor(p)} isActive={p === page}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href={hrefFor(Math.min(totalPages, page + 1))}
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}

/** Делает список вида [1, "...", 4, 5, 6, "...", 20] вокруг текущей страницы. */
function buildPageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const result: (number | "...")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) result.push("...");
  for (let i = left; i <= right; i++) result.push(i);
  if (right < total - 1) result.push("...");
  result.push(total);
  return result;
}
