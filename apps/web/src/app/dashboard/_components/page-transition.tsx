"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Лёгкая обёртка для перехода между маршрутами в dashboard.
 * Использует Next.js pathname как ключ — каждое изменение
 * pathname триггерит анимацию.
 *
 * mode="wait" — старая страница уходит, потом приходит новая
 * (без overlap, чтобы не дёргалась раскладка).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Stagger-контейнер: дети с motion.div + variants={staggerItem}
 * появятся последовательно. Используется для KPI-карточек.
 */
export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};
