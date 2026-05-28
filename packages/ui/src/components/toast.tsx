"use client";

/**
 * Toaster на базе sonner — единая точка для всех уведомлений приложения.
 *
 * Использование:
 *   // в layout (один раз):
 *   import { Toaster } from "@pandaclock/ui";
 *   ...
 *   <Toaster />
 *
 *   // в коде:
 *   import { toast } from "@pandaclock/ui";
 *   toast.success("Сохранено");
 *   toast.error("Ошибка");
 */
import { Toaster as SonnerToaster, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-md",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary-500 group-[.toast]:text-white group-[.toast]:rounded-sm",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-sm",
        },
      }}
      {...props}
    />
  );
}

export { toast };
