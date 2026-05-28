"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Маленький хук для синхронизации одного UI-стейта с URL searchParam.
 *
 * Пример:
 *   const [search, setSearch] = useQueryState("q", "");
 *   <input value={search} onChange={e => setSearch(e.target.value)} />
 *
 * Опции:
 *   - debounce: задержка в мс перед записью в URL (полезно для текстовых полей)
 *   - resetPage: имя param-а для страницы, который надо сбросить при изменении
 *     (по умолчанию "page" — обнуляется когда меняется любой фильтр)
 */
export function useQueryState(
  key: string,
  defaultValue: string = "",
  options: { debounce?: number; resetPage?: string | false } = {},
) {
  const { debounce = 0, resetPage = "page" } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlValue = searchParams.get(key) ?? defaultValue;
  const [localValue, setLocalValue] = React.useState(urlValue);

  // Sync URL → local when URL changes externally (back button, etc.)
  React.useEffect(() => {
    setLocalValue(urlValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlValue]);

  const writeToUrl = React.useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next && next !== defaultValue) {
        params.set(key, next);
      } else {
        params.delete(key);
      }
      if (resetPage && resetPage !== key) {
        params.delete(resetPage);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [key, defaultValue, resetPage, pathname, router, searchParams],
  );

  // Debounce запись в URL.
  React.useEffect(() => {
    if (localValue === urlValue) return;
    if (debounce === 0) {
      writeToUrl(localValue);
      return;
    }
    const t = setTimeout(() => writeToUrl(localValue), debounce);
    return () => clearTimeout(t);
  }, [localValue, urlValue, debounce, writeToUrl]);

  return [localValue, setLocalValue] as const;
}

/**
 * Очистить все указанные query-параметры. Удобно для "Сбросить все фильтры".
 */
export function useResetQueryState(keys: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((k) => params.delete(k));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [keys, pathname, router, searchParams]);
}
