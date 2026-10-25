"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useFx } from "./use-fx";

function Word({ progress, range, children }: { progress: MotionValue<number>; range: [number, number]; children: string }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <>
      <motion.span style={{ opacity }}>{children}</motion.span>{" "}
    </>
  );
}

/** A paragraph whose words light up one by one as it scrolls through the viewport. */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const fx = useFx();
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.92", "end 0.6"] });
  const words = text.split(" ");

  return (
    <p ref={ref} className={className}>
      {fx ? (
        <>
          <span className="sr-only">{text}</span>
          <span aria-hidden>
            {words.map((w, i) => (
              <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
                {w}
              </Word>
            ))}
          </span>
        </>
      ) : (
        text
      )}
    </p>
  );
}
