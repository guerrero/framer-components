import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer";
import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface FadeInProps {
  /** Content rendered inside the component (Framer Slot control). */
  children?: ReactNode;
  /** Seconds to wait before the reveal starts. */
  delay?: number;
  /** Reveal duration in seconds. */
  duration?: number;
  /** Vertical travel distance in pixels. */
  distance?: number;
}

/**
 * Fades and slides its children in when they enter the viewport.
 * Renders fully visible on the canvas and in static exports.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function FadeIn({
  children,
  delay = 0,
  duration = 0.6,
  distance = 24,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const isStatic = useIsStaticRenderer();
  const visible = isStatic || inView;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : distance }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}

addPropertyControls(FadeIn, {
  children: {
    type: ControlType.Slot,
    title: "Content",
  },
  delay: {
    type: ControlType.Number,
    title: "Delay",
    defaultValue: 0,
    min: 0,
    max: 5,
    step: 0.1,
    unit: "s",
  },
  duration: {
    type: ControlType.Number,
    title: "Duration",
    defaultValue: 0.6,
    min: 0.1,
    max: 5,
    step: 0.1,
    unit: "s",
  },
  distance: {
    type: ControlType.Number,
    title: "Distance",
    defaultValue: 24,
    min: 0,
    max: 400,
    step: 1,
    unit: "px",
  },
});
