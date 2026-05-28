"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@pandaclock/ui";
import { NAV_FLAT } from "./nav-config";

interface PageBreadcrumbsProps {
  /** Опциональное переопределение последнего сегмента (для динамических страниц). */
  current?: string;
  /** Список доп. сегментов: добавляются после автоматических. */
  extra?: { label: string; href?: string }[];
}

/**
 * Авто-breadcrumbs из текущего pathname. Маппинг сегментов берётся из NAV_FLAT.
 * Для динамических страниц передавайте current="Имя сотрудника" — он отрисуется
 * как последний (неактивный) элемент.
 */
export function PageBreadcrumbs({ current, extra }: PageBreadcrumbsProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean); // [dashboard, employees, abc]

  // Собираем путь по сегментам
  const items: { label: string; href?: string }[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const nav = NAV_FLAT.find((n) => n.href === acc);
    if (nav) {
      items.push({ label: nav.label, href: acc });
    } else if (acc === "/dashboard") {
      items.push({ label: "Дашборд", href: "/dashboard" });
    } else {
      // Динамический сегмент — пропускаем (заменим на current если есть)
      // или выводим сам сегмент в плейн.
      // Делаем последним только если current не задан.
    }
  }

  if (extra) items.push(...extra);
  if (current) items.push({ label: current });

  // Если получилась всего одна крошка (только Dashboard) — не показываем.
  if (items.length <= 1) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" aria-label="Дашборд">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.slice(1).map((item, idx, arr) => {
          const isLast = idx === arr.length - 1;
          return (
            <React.Fragment key={`${item.href ?? item.label}-${idx}`}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
