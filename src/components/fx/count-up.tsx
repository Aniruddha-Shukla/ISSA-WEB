"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { useFx } from "./use-fx";

const format = (v: number) => Math.round(v).toLocaleString("en-IN");

/** Counts up to `value` the first time it scrolls into view. */
export function CountUp({ value }: { value: number }) {
  const fx = useFx();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const count = useMotionValue(0);
  const text = useTransform(count, format);

  useEffect(() => {
    if (!fx || !inView) return;
    const controls = animate(count, value, { duration: 1.6, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [fx, inView, value, count]);

  return (
    <span ref={ref}>
      {fx ? (
        <>
          <span className="sr-only">{format(value)}</span>
          <motion.span aria-hidden>{text}</motion.span>
        </>
      ) : (
        format(value)
      )}
    </span>
  );
}
