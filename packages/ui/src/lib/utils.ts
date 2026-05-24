import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Объединяет Tailwind-классы, разруливая конфликты. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
