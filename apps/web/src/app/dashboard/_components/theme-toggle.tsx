"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@pandaclock/ui";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Чтобы избежать гидратационных мерцаний — рендерим placeholder
  // одинакового размера до mount.
  const showDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Переключить тему">
          {showDark ? (
            <Moon className="text-muted-foreground h-4 w-4" />
          ) : (
            <Sun className="text-muted-foreground h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Тема</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => setTheme("light")}
          className={theme === "light" ? "bg-accent text-accent-foreground" : undefined}
        >
          <Sun className="h-4 w-4" /> Светлая
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setTheme("dark")}
          className={theme === "dark" ? "bg-accent text-accent-foreground" : undefined}
        >
          <Moon className="h-4 w-4" /> Тёмная
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setTheme("system")}
          className={theme === "system" ? "bg-accent text-accent-foreground" : undefined}
        >
          <Monitor className="h-4 w-4" /> Системная
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
