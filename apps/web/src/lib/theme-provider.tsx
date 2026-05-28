"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Обёртка над next-themes — храним тему в localStorage под ключом `pcl_theme`,
 * по умолчанию используем системную (`system`), переключаем через класс `dark`
 * на <html> (соответствует tailwind darkMode: ["class"]).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="pcl_theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
