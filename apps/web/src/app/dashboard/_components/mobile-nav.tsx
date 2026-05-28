"use client";

import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  Button,
} from "@pandaclock/ui";
import { useUiStore } from "@/lib/stores/ui-store";
import { Sidebar } from "./sidebar";

/**
 * Mobile-кнопка hamburger + drawer с навигацией.
 * Виден только на < md.
 */
export function MobileNav() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Открыть меню"
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 max-w-[80vw] p-0">
        <SheetTitle className="sr-only">Меню</SheetTitle>
        <SheetDescription className="sr-only">Основная навигация по приложению</SheetDescription>
        <Sidebar variant="drawer" onItemClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
