import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** className concatenator + tailwind-merge — точная копия web версии. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
