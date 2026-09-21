"use client";

import { FC } from "react";
import { motion, MotionProps, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export type AnimationType = "text" | "word" | "character" | "line";
export type AnimationVariant =
  | "fadeIn"
  | "blurIn"
  | "blurInUp"
  | "blurInDown"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleUp"
  | "scaleDown";

export interface TextAnimateProps extends MotionProps {
  children: string;
  className?: string;
  delay?: number;
  duration?: number;
  variants?: Variants;
  as?: React.ElementType;
  by?: AnimationType;
  startOnView?: boolean;
  once?: boolean;
  animation?: AnimationVariant;
}

const defaultItemVariants: Record<AnimationVariant, Variants> = {
  fadeIn: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.3 } },
  },
  blurIn: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    show: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.4 } },
  },
  blurInUp: {
    hidden: { opacity: 0, filter: "blur(10px)", y: 20 },
    show: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.4 } },
  },
  blurInDown: {
    hidden: { opacity: 0, filter: "blur(10px)", y: -20 },
    show: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.4 } },
  },
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  },
  slideDown: {
    hidden: { opacity: 0, y: -20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  },
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  },
  scaleUp: {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
  },
  scaleDown: {
    hidden: { opacity: 0, scale: 1.2 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
  },
};

export const TextAnimate: FC<TextAnimateProps> = ({
  children,
  delay = 0,
  duration = 0.35,
  variants,
  className,
  as: Component = "p",
  by = "word",
  startOnView = true,
  once = true,
  animation = "blurInUp",
  ...props
}) => {
  const MotionComponent = motion(Component);

  let segments: string[] = [];
  if (by === "character") {
    segments = Array.from(children);
  } else if (by === "word") {
    segments = children.split(" ");
  } else if (by === "line") {
    segments = children.split("\n");
  } else {
    segments = [children];
  }

  const activeItemVariants = variants || defaultItemVariants[animation];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: by === "character" ? 0.02 : 0.06,
        delayChildren: delay,
      },
    },
  };

  return (
    <MotionComponent
      variants={containerVariants}
      initial="hidden"
      whileInView={startOnView ? "show" : undefined}
      animate={startOnView ? undefined : "show"}
      viewport={{ once, margin: "-40px" }}
      className={cn("whitespace-pre-wrap", className)}
      {...props}
    >
      {segments.map((segment, i) => (
        <motion.span
          key={`${segment}-${i}`}
          variants={activeItemVariants}
          transition={{ duration }}
          className={cn(
            "inline-block",
            by === "word" && "mr-[0.25em]",
            by === "character" && ""
          )}
        >
          {segment}
        </motion.span>
      ))}
    </MotionComponent>
  );
};

export default TextAnimate;
