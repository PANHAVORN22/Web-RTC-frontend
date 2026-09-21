"use client";

import { ComponentPropsWithoutRef, FC, ReactNode, useRef } from "react";
import { motion, MotionValue, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TextRevealProps extends ComponentPropsWithoutRef<"div"> {
  text: string;
}

export const TextReveal: FC<TextRevealProps> = ({ text, className }) => {
  const targetRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start 0.8", "end 0.2"],
  });
  const words = text.split(" ");

  return (
    <div ref={targetRef} className={cn("relative z-0 min-h-[140vh]", className)}>
      <div className="sticky top-0 mx-auto flex h-[50vh] max-w-5xl items-center justify-center bg-transparent px-4 py-16">
        <p className="flex flex-wrap justify-center text-center text-2xl font-bold text-white/15 sm:text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight">
          {words.map((word, i) => {
            const start = i / words.length;
            const end = start + 1 / words.length;
            return (
              <Word key={i} progress={scrollYProgress} range={[start, end]}>
                {word}
              </Word>
            );
          })}
        </p>
      </div>
    </div>
  );
};

interface WordProps {
  children: ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
}

const Word: FC<WordProps> = ({ children, progress, range }) => {
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <span className="relative mx-1 sm:mx-1.5 lg:mx-2 my-1 inline-block">
      <span className="absolute opacity-15 select-none text-zinc-500">{children}</span>
      <motion.span
        style={{ opacity: opacity }}
        className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]"
      >
        {children}
      </motion.span>
    </span>
  );
};

export default TextReveal;
