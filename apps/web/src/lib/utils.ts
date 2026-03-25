import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// WHY: cn() merges Tailwind classes safely — clsx handles conditionals,
// twMerge deduplicates conflicting classes (e.g. "px-2 px-4" → "px-4").
// This is the standard pattern used by shadcn/ui.
// See: https://ui.shadcn.com/docs/installation/manual
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
