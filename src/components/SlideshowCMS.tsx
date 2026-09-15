import { addPropertyControls, ControlType, RenderTarget } from "framer";
import {
  useId,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

// Dot easing presets — picked by dotAnimation prop.
const dotEasings: Record<string, string> = {
  none: "linear",
  smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  bounce: "cubic-bezier(.34,1.56,.64,1)",
  ease: "ease-in-out",
  snappy: "cubic-bezier(0.2, 0.9, 0.3, 1)",
};

const dotDurations: Record<string, string> = {
  none: "0s",
  smooth: ".25s",
  bounce: ".3s",
  ease: ".25s",
  snappy: ".2s",
};

function makeTransition(animKey: string): string {
  if (animKey === "none") return "none";
  const ease = dotEasings[animKey] ?? dotEasings.smooth;
  const dur = dotDurations[animKey] ?? dotDurations.smooth;
  return `all ${dur} ${ease}`;
}

// Optional dimension controls override each preset independently.
interface DotDimensions {
  activeWidth: number;
  activeHeight: number;
  inactiveWidth: number;
  inactiveHeight: number;
}

type DotDimensionKey = keyof DotDimensions;

const DOT_DIMENSION_KEYS: readonly DotDimensionKey[] = [
  "activeWidth",
  "activeHeight",
  "inactiveWidth",
  "inactiveHeight",
];

const FALLBACK_DOT_DIMENSIONS: DotDimensions = {
  activeWidth: 12,
  activeHeight: 12,
  inactiveWidth: 10,
  inactiveHeight: 10,
};

const dotSizePresets: Record<string, DotDimensions> = {
  circle: {
    activeWidth: 12,
    activeHeight: 12,
    inactiveWidth: 10,
    inactiveHeight: 10,
  },
  pill: {
    activeWidth: 28,
    activeHeight: 10,
    inactiveWidth: 10,
    inactiveHeight: 10,
  },
  dash: {
    activeWidth: 25,
    activeHeight: 3.5,
    inactiveWidth: 15,
    inactiveHeight: 3.5,
  },
  ring: {
    activeWidth: 12,
    activeHeight: 12,
    inactiveWidth: 10,
    inactiveHeight: 10,
  },
  square: {
    activeWidth: 12,
    activeHeight: 12,
    inactiveWidth: 10,
    inactiveHeight: 10,
  },
  diamond: {
    activeWidth: 10.2,
    activeHeight: 10.2,
    inactiveWidth: 8.5,
    inactiveHeight: 8.5,
  },
};
function resolveDotDimensions(style: string, overrides: Partial<DotDimensions>): DotDimensions {
  const preset = dotSizePresets[style] ?? dotSizePresets.circle ?? FALLBACK_DOT_DIMENSIONS;
  const dimensions: DotDimensions = { ...preset };
  for (const key of DOT_DIMENSION_KEYS) {
    const override = overrides[key];
    if (typeof override === "number" && Number.isFinite(override)) {
      dimensions[key] = Math.max(1, override);
    }
  }
  return dimensions;
}

interface DotStyle {
  width: number;
  height: number;
  borderRadius: string | number;
  background: string;
  border: string;
  padding: number;
  opacity: number;
  transition: string;
  transform?: string;
  boxSizing?: "border-box";
}

type DotRenderer = (
  active: boolean,
  fill: string,
  op: number,
  currentOp: number,
  width: number,
  height: number,
  anim: string,
) => DotStyle;

const fallbackDotRenderer: DotRenderer = (active, fill, op, currentOp, width, height, anim) => ({
  width,
  height,
  borderRadius: "50%",
  background: fill,
  border: "none",
  padding: 0,
  opacity: active ? currentOp : op,
  transition: makeTransition(anim),
});

const dotRenderers: Record<string, DotRenderer> = {
  circle: fallbackDotRenderer,
  pill: (active, fill, op, currentOp, width, height, anim) => ({
    width,
    height,
    borderRadius: Math.max(width, height),
    background: fill,
    border: "none",
    padding: 0,
    opacity: active ? currentOp : op,
    transition: makeTransition(anim),
  }),
  dash: (active, fill, op, currentOp, width, height, anim) => ({
    width,
    height,
    borderRadius: Math.max(width, height),
    background: fill,
    border: "none",
    padding: 0,
    opacity: active ? currentOp : op,
    transition: makeTransition(anim),
  }),
  ring: (active, fill, op, currentOp, width, height, anim) => ({
    width,
    height,
    borderRadius: "50%",
    background: active ? fill : "transparent",
    border: `${Math.min(2, width / 2, height / 2)}px solid ${fill}`,
    padding: 0,
    opacity: active ? currentOp : op,
    boxSizing: "border-box",
    transition: makeTransition(anim),
  }),
  square: (active, fill, op, currentOp, width, height, anim) => ({
    width,
    height,
    borderRadius: active ? Math.min(width, height) * 0.3 : Math.min(width, height) * 0.15,
    background: fill,
    border: "none",
    padding: 0,
    opacity: active ? currentOp : op,
    transition: makeTransition(anim),
  }),
  diamond: (active, fill, op, currentOp, width, height, anim) => ({
    width,
    height,
    borderRadius: Math.min(width, height) * 0.15,
    background: fill,
    border: "none",
    padding: 0,
    opacity: active ? currentOp : op,
    transform: "rotate(45deg)",
    transition: makeTransition(anim),
  }),
};

function mod(x: number, n: number): number {
  return ((x % n) + n) % n;
}

// `EventTarget` is not necessarily an `Element` per the DOM typings.
function targetElement(target: EventTarget | null): Element | null {
  return target instanceof Element ? target : null;
}

// Framer rewrites links inside CMS item anchors as spans carrying
// data-nested-link / role=link. Match the nearest explicit link first,
// then exclude the Collection List's outer item anchor.
function contentLink(target: Element | null) {
  const copy = target?.closest(".ss-copy");
  if (!target || !copy) return null;
  const list = target.closest("[data-ss-items]") || copy.firstElementChild;
  if (!list || !copy.contains(list)) return null;
  let item: Element | null = target;
  while (item && item.parentElement !== list) item = item.parentElement;
  if (!item) return null;
  const link = target.closest('a[href], [data-nested-link="true"], [role="link"]');
  return link && link !== item && item.contains(link) ? link : null;
}

// Static identities for the marquee clones; `numCopies` never exceeds three.
const COPY_KEYS = ["ss-copy-a", "ss-copy-b", "ss-copy-c"] as const;

// useLayoutEffect on the client (so we can fix positions BEFORE paint),
// plain useEffect during SSR to avoid React warnings.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface FourSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Parses a "10px" / "10px 20px" / "10px 20px 30px" / "10px 20px 30px 40px" string
// into {top, right, bottom, left}. Used for both Padding and BorderRadius prop controls.
function parseFourSides(value: unknown): FourSides {
  if (typeof value === "string") {
    const parts = value.replace(/px/g, "").trim().split(/\s+/).map(Number);

    if (parts.length === 1)
      return {
        top: parts[0] ?? 0,
        right: parts[0] ?? 0,
        bottom: parts[0] ?? 0,
        left: parts[0] ?? 0,
      };
    if (parts.length === 2)
      return {
        top: parts[0] ?? 0,
        right: parts[1] ?? 0,
        bottom: parts[0] ?? 0,
        left: parts[1] ?? 0,
      };
    if (parts.length === 3)
      return {
        top: parts[0] ?? 0,
        right: parts[1] ?? 0,
        bottom: parts[2] ?? 0,
        left: parts[1] ?? 0,
      };
    if (parts.length >= 4)
      return {
        top: parts[0] ?? 0,
        right: parts[1] ?? 0,
        bottom: parts[2] ?? 0,
        left: parts[3] ?? 0,
      };
  }
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

interface SlideshowTransition {
  type?: string | boolean;
  duration?: number;
  bounce?: number;
  stiffness?: number;
  damping?: number;
  ease?: string | number[];
}

interface ClippingOptions {
  overflow?: string;
  fade?: boolean;
  fadeWidth?: number;
  fadeInset?: number;
  fadeOpacity?: number;
}

interface ArrowsOptions {
  show?: boolean;
  fill?: string;
  blur?: number;
  color?: string;
  size?: number;
  iconSize?: number;
  radius?: number;
  fadeIn?: boolean;
  grouped?: boolean;
  position?: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  arrowGap?: number;
  inset?: number;
  followCursor?: boolean;
  iconStyle?: string;
  iconDuration?: number;
  visibilityDuration?: number;
  previousIcon?: string;
  nextIcon?: string;
  linkIcon?: string;
  showProgress?: boolean;
  progressColor?: string;
  progressWidth?: number;
}

interface DotsOptions {
  show?: boolean;
  align?: string;
  sideInset?: number;
  dotStyle?: string;
  inset?: number;
  gap?: number;
  padding?: number;
  fill?: string;
  backdrop?: string;
  radius?: number;
  opacity?: number;
  current?: number;
  blur?: number;
  limitVisible?: boolean;
  maxVisible?: number;
  animation?: string;
  activeWidth?: number;
  activeHeight?: number;
  inactiveWidth?: number;
  inactiveHeight?: number;
}

interface SlideshowCMSProps {
  children?: ReactNode;
  itemsPerView?: number;
  gap?: number;
  padding?: string;
  transition?: SlideshowTransition | null;
  autoplay?: boolean;
  autoplayMode?: string;
  autoplayInterval?: number;
  autoplaySpeed?: number;
  scrollDirection?: string;
  autoplayOnHoverOnly?: boolean;
  pauseOnHover?: boolean;
  draggable?: boolean;
  loop?: boolean;
  align?: string;
  clipRadius?: string;
  clipping?: ClippingOptions;
  arrows?: ArrowsOptions;
  dots?: DotsOptions;
  style?: CSSProperties;
}

/**
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
function SlideshowCMS(props: SlideshowCMSProps) {
  const {
    children,
    itemsPerView = 1,
    gap = 16,
    padding: paddingProp = "0px",
    transition = { type: "tween", duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
    autoplay = false,
    autoplayMode = "interval",
    autoplayInterval = 3,
    autoplaySpeed = 30,
    scrollDirection = "left",
    autoplayOnHoverOnly = false,
    pauseOnHover = true,
    draggable = true,
    loop: propLoop = true,
    align = "center",
    clipRadius: clipRadiusProp = "0px",
    clipping = {},
    arrows = {},
    dots = {},
    style,
  } = props;

  const isCanvas = RenderTarget.current() === RenderTarget.canvas;
  const isContinuous = autoplay && autoplayMode === "continuous";

  const {
    overflow: clipOverflow = "hidden",
    fade: clipFade = false,
    fadeWidth = 25,
    fadeInset = 0,
    fadeOpacity = 0,
  } = clipping;

  const {
    show: arrowShow = true,
    fill: arrowFill = "rgba(0,0,0,0.5)",
    blur: arrowBlur = 0,
    color: arrowColor = "#fff",
    size: arrowSize = 40,
    iconSize: arrowIconSize = 20,
    radius: arrowRadius = 40,
    fadeIn: arrowFade = false,
    grouped: arrowGrouped = false,
    position: arrowPos = "center-right",
    top: arrowTop = 0,
    bottom: arrowBottom = -50,
    left: arrowLeft = 12,
    right: arrowRight = 10,
    arrowGap = 10,
    inset: arrowInset = 0,
    followCursor = false,
    iconStyle = "chevron",
    iconDuration = 0.2,
    visibilityDuration = 0.2,
    previousIcon,
    nextIcon,
    linkIcon,
    showProgress = false,
    progressColor = "#22B34B",
    progressWidth = 2,
  } = arrows;

  const {
    show: dotShow = true,
    align: dotAlign = "center",
    sideInset: dotSideInset = 24,
    dotStyle = "circle",
    inset: dotInset = -40,
    gap: dotGap = 10,
    padding: dotPad = 8,
    fill: dotFill = "#fff",
    backdrop: dotBg = "#1a1a2e",
    radius: dotRadius = 50,
    opacity: dotOpacity = 0.5,
    current: dotCurrent = 1,
    blur: dotBlur = 0,
    limitVisible = false,
    maxVisible = 5,
    animation: dotAnimation = "smooth",
  } = dots;

  const {
    activeWidth: dotActiveWidth,
    activeHeight: dotActiveHeight,
    inactiveWidth: dotInactiveWidth,
    inactiveHeight: dotInactiveHeight,
  } = resolveDotDimensions(dotStyle, dots);

  const [cursor, setCursor] = useState({
    x: 0,
    y: 0,
    next: true,
    visible: false,
    link: false,
  });
  const [autoplayProgress, setAutoplayProgress] = useState(0);
  const [touchInput, setTouchInput] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState(false);
  const gesture = useRef({ id: -1, active: false, moved: false, dx: 0 });
  useEffect(() => {
    const media = window.matchMedia("(hover: none)");
    const update = () => setTouchInput(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const autoplayElapsed = useRef(0);
  const pointerClick = useRef({ x: 0, y: 0, moved: false, armed: false });

  const pad = useMemo(() => parseFourSides(paddingProp), [paddingProp]);
  const cornerRadius = useMemo(() => parseFourSides(clipRadiusProp), [clipRadiusProp]);
  const borderRadiusStr = `${cornerRadius.top}px ${cornerRadius.right}px ${cornerRadius.bottom}px ${cornerRadius.left}px`;

  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyARef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragStartTime = useRef(0);
  const dragStartContOffset = useRef(0);
  const continuousRaf = useRef<number | null>(null);
  const recountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpRaf = useRef<number | null>(null);
  const itemsPathRef = useRef<number[] | null>(null); // child-index path to the real items container (preview wrapper fix)
  // Stable per-instance scope for the generated CSS. useId (rather than a
  // random ref read during render) keeps the value stable and SSR-safe.
  const scope = `sscms-${useId().replace(/[^a-zA-Z0-9-_]/g, "")}`;

  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [containerSize, setContainerSize] = useState(0);
  const [total, setTotal] = useState(0);
  const [contOffset, setContOffset] = useState(0);
  const [anim, setAnim] = useState(true);
  const [hasEnteredView, setHasEnteredView] = useState(
    isCanvas || typeof IntersectionObserver === "undefined",
  );

  // ── Items-container marking (preview wrapper fix) ───
  // Framer's preview can hydrate the collection with an extra wrapper div
  // around it. The static CSS targets slides at a fixed depth
  // (.ss-copy > * > *), so that extra wrapper used to receive the slide
  // sizing instead — shrinking the cards and cramming several CMS items
  // into one slide width. When the recount detects that the real items
  // container sits behind a pure single-child wrapper chain, it stores
  // the path and this function tags the right nodes in EVERY copy with
  // data-ss-items / data-ss-wrap so the attribute CSS (emitted after the
  // static rules, same specificity → wins) restores correct sizing.
  // In the normal structure nothing gets tagged and rendering is
  // byte-identical to before.
  const applyMarks = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const path = itemsPathRef.current;
    const copies = track.children;

    for (const copy of copies) {
      // Clear any previous marks first.
      copy.removeAttribute("data-ss-items");

      const oldItems = copy.querySelectorAll("[data-ss-items]");
      for (const oldItem of oldItems) oldItem.removeAttribute("data-ss-items");

      const oldWraps = copy.querySelectorAll("[data-ss-wrap]");
      for (const oldWrap of oldWraps) oldWrap.removeAttribute("data-ss-wrap");

      if (!path) continue;

      if (path.length === 0) {
        copy.setAttribute("data-ss-items", "");
        continue;
      }

      let node: Element | null = copy;
      let ok = true;

      for (let d = 0; d < path.length; d++) {
        const childIndex: number | undefined = path[d];
        if (childIndex === undefined) {
          ok = false;
          break;
        }
        const next: Element | null = node?.children[childIndex] ?? null;

        if (!next) {
          ok = false;
          break;
        }

        if (d < path.length - 1) next.setAttribute("data-ss-wrap", "");
        node = next;
      }

      if (ok && node) node.setAttribute("data-ss-items", "");
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setContainerSize(w);
    };

    measure();

    const t1 = setTimeout(measure, 50);
    const t2 = setTimeout(measure, 200);
    const t3 = setTimeout(measure, 500);

    const ro = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width;
      if (w !== undefined && w > 0) setContainerSize(w);
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    if (isCanvas) return undefined;

    const el = containerRef.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === "undefined") return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasEnteredView(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1 },
    );

    io.observe(el);

    return () => io.disconnect();
  }, [isCanvas]);

  useEffect(() => {
    const el = copyARef.current;

    if (!el) {
      setTotal(0);
      return undefined;
    }

    const doRecount = () => {
      let bestCount = 0;
      let bestNode: Element | null = null;

      const visit = (node: Element) => {
        const kids = node.children;

        if (kids.length >= 2) {
          const widths: number[] = [];

          for (const kid of kids) {
            const r = kid.getBoundingClientRect();
            if (r.width > 0) widths.push(r.width);
          }

          if (widths.length === kids.length) {
            const min = Math.min(...widths);
            const max = Math.max(...widths);

            if (max > 0 && min / max > 0.85) {
              if (kids.length > bestCount) {
                bestCount = kids.length;
                bestNode = node;
              }
            }
          }
        }

        for (const kid of kids) visit(kid);
      };

      visit(el);

      if (bestCount === 0) {
        let node: Element | null = el;

        while (node && node.children.length === 1) {
          node = node.children[0] ?? null;
        }

        bestCount = node ? node.children.length : 0;
        bestNode = bestCount > 0 ? node : null;
      }

      // ── Locate the items container relative to the copy root ──
      let path: number[] | null = null;

      if (bestNode) {
        if (bestNode === el) {
          path = [];
        } else {
          const p: number[] = [];
          let n: Element | null = bestNode;
          let reachedRoot = false;

          while (n && n !== el) {
            const parent: Element | null = n.parentElement;
            if (!parent) break;

            p.unshift(Array.prototype.indexOf.call(parent.children, n));

            n = parent;
            if (n === el) reachedRoot = true;
          }

          if (reachedRoot) path = p;
        }
      }

      // Only apply attribute marking when the structure deviates
      // from the expected depth (1) AND is a pure single-child
      // wrapper chain — the preview-wrapper signature. Anything
      // else falls back to the static CSS exactly as before.
      let mark: number[] | null = null;

      if (path && path.length !== 1) {
        if (path.length === 0) {
          mark = path;
        } else {
          let node: Element | null = el;
          let pure = true;

          for (let d = 0; d < path.length; d++) {
            const childIndex = path[d];
            if (!node || node.children.length !== 1 || childIndex === undefined) {
              pure = false;
              break;
            }
            node = node.children[childIndex] ?? null;
          }

          if (pure) mark = path;
        }
      }

      itemsPathRef.current = mark;
      applyMarks();

      setTotal(bestCount);
    };

    const scheduleRecount = () => {
      if (recountTimer.current) clearTimeout(recountTimer.current);
      recountTimer.current = setTimeout(doRecount, 60);
    };

    doRecount();

    const t1 = setTimeout(doRecount, 50);
    const t2 = setTimeout(doRecount, 200);
    const t3 = setTimeout(doRecount, 600);

    // Observe the whole track (not just copy A) so late-mounting clone
    // copies also trigger a recount + re-mark. Attribute changes from
    // applyMarks don't retrigger this (childList only).
    const mo = new MutationObserver(scheduleRecount);
    mo.observe(trackRef.current || el, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (recountTimer.current) clearTimeout(recountTimer.current);
    };
  }, [children, applyMarks]);

  const perView = Math.max(1, Math.min(itemsPerView, total || 1));
  const maxIdx = Math.max(0, total - perView);

  const slideSize = useMemo(() => {
    if (containerSize <= 0) return 0;
    return (containerSize - (perView - 1) * gap) / perView;
  }, [containerSize, gap, perView]);

  const step = slideSize + gap;

  const alignMap: Record<string, string> = {
    top: "flex-start",
    center: "center",
    bottom: "flex-end",
  };
  const flexAlign = alignMap[align] || "center";

  // ── Loop eligibility ────────────────────────────────
  // perView is clamped to total, so when the CMS count equals (or is
  // below) Items per view, `total > perView` is never true — which used
  // to silently kill the loop AND interval autoplay in that setup.
  // canLoopAll re-enables the true-loop when autoplay needs motion even
  // though every item is already visible. Without autoplay, behavior is
  // identical to before.
  const canLoopAll = autoplay && total > 1;
  const trueLoop = propLoop && !isContinuous && (total > perView || canLoopAll) && !isCanvas;
  const numCopies = trueLoop || isContinuous ? 3 : 1;
  const pages = trueLoop ? total : maxIdx + 1;

  const displayIdx = trueLoop ? mod(idx, total) : Math.min(Math.max(idx, 0), maxIdx);

  // Snap back into the middle copy when looping (re)engages or the item
  // count changes. `idx` is deliberately not a dependency: idx-driven exits
  // from the middle copy are rebased seamlessly by the layout effect below
  // (preserving the in-flight animation), while this effect only corrects
  // the index when the loop configuration itself changes.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!trueLoop) return;

    // idx must not retrigger this snap (see above).
    if (idx < total || idx >= 2 * total) {
      // eslint-disable-next-line react/set-state-in-effect
      setAnim(false);
      setIdx(total);

      if (jumpRaf.current) cancelAnimationFrame(jumpRaf.current);

      jumpRaf.current = requestAnimationFrame(() => {
        jumpRaf.current = requestAnimationFrame(() => setAnim(true));
      });
    }
  }, [trueLoop, total]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const { cssEase, cssDur } = useMemo(() => {
    if (
      !transition ||
      transition.type === false ||
      transition.type === "none" ||
      transition.duration === 0
    ) {
      return { cssEase: "linear", cssDur: 0 };
    }

    const type = transition.type || "tween";

    const dur =
      transition.duration !== undefined ? transition.duration : type === "spring" ? 0.5 : 0.4;

    let easeStr = "cubic-bezier(0.25, 0.1, 0.25, 1)";

    if (type === "spring") {
      if (transition.bounce !== undefined) {
        const b = transition.bounce;
        const y1 = 1 + b * 3;
        easeStr = `cubic-bezier(0.25, ${y1}, 0.5, 1)`;
      } else if (transition.stiffness !== undefined) {
        const stiff = transition.stiffness || 500;
        const damp = transition.damping || 25;
        const ratio = damp / (2 * Math.sqrt(stiff));
        const over = ratio < 1 ? 1 + (1 - ratio) * 2.5 : 1;
        easeStr = `cubic-bezier(0.25, ${over}, 0.5, 1)`;
      } else {
        easeStr = `cubic-bezier(0.25, 1.5, 0.5, 1)`;
      }
    } else {
      const ease = transition.ease;

      if (Array.isArray(ease) && ease.length === 4) {
        easeStr = `cubic-bezier(${ease.join(",")})`;
      } else if (typeof ease === "string") {
        const easeMap: Record<string, string> = {
          linear: "linear",
          easeIn: "ease-in",
          easeOut: "ease-out",
          easeInOut: "ease-in-out",
          circIn: "cubic-bezier(0.55,0,1,0.45)",
          circOut: "cubic-bezier(0,0.55,0.45,1)",
          circInOut: "cubic-bezier(0.85,0,0.15,1)",
          anticipate: "cubic-bezier(0.36,0,0.66,-0.56)",
        };

        easeStr = easeMap[ease] ?? easeStr;
      }
    }

    return { cssEase: easeStr, cssDur: dur };
  }, [transition]);

  const go = useCallback(
    (target: number) => {
      setAnim(true);

      if (!trueLoop) {
        setIdx(Math.max(0, Math.min(target, maxIdx)));
        return;
      }

      setIdx((curr) => {
        const currLogical = mod(curr, total);
        let delta = target - currLogical;

        if (delta > total / 2) delta -= total;
        if (delta < -total / 2) delta += total;

        return curr + delta;
      });
    },
    [trueLoop, maxIdx, total],
  );

  const next = useCallback(() => {
    setAnim(true);

    if (trueLoop) {
      setIdx((p) => p + 1);
    } else {
      setIdx((p) => (propLoop ? (p >= maxIdx ? 0 : p + 1) : Math.min(p + 1, maxIdx)));
    }
  }, [trueLoop, maxIdx, propLoop]);

  const prev = useCallback(() => {
    setAnim(true);

    if (trueLoop) {
      setIdx((p) => p - 1);
    } else {
      setIdx((p) => (propLoop ? (p <= 0 ? maxIdx : p - 1) : Math.max(p - 1, 0)));
    }
  }, [trueLoop, maxIdx, propLoop]);

  // ── Seamless rebase for true infinite loop ──────────
  // The moment idx leaves the middle copy we re-anchor it back by a
  // whole copy length — WITHOUT touching what's on screen. The copies
  // repeat every total*step pixels, so we read the track's CURRENT
  // animated position from getComputedStyle (mid-transition aware),
  // shift it by exactly one copy onto identical pixels with transition
  // disabled, force a reflow so the browser accepts that as the new
  // starting point, restore the transition, and let React commit the
  // equivalently-shifted target. The in-flight animation continues
  // toward the rebased target with the SAME remaining distance, so
  // nothing visible happens — no snap, no animation cut, no waiting for
  // the transition to end. And because the rebase runs in a layout
  // effect (before paint) on every exit from the middle copy, idx can
  // never drift toward the edge of the 3 rendered copies — blank cards
  // are impossible no matter how fast the arrows are clicked.
  useIsoLayoutEffect(() => {
    if (!trueLoop || dragging || total === 0) return;
    if (idx >= total && idx < 2 * total) return;

    // Map idx back into the middle copy [total, 2*total).
    const newIdx = mod(idx, total) + total;
    const shift = (idx - newIdx) * step; // whole copies, in px

    const track = trackRef.current;

    if (track && cssDur > 0 && step > 0 && shift !== 0) {
      // Where the track visually is RIGHT NOW (even mid-transition).
      let tx = -(idx * step);
      const t = getComputedStyle(track).transform;

      if (t && t !== "none") {
        const m = t.match(/matrix(?:3d)?\(([^)]+)\)/);

        if (m) {
          const groups = m[1];
          if (groups !== undefined) {
            const v = groups.split(",").map(parseFloat);
            const parsed = v.length === 16 ? v[12] : v[4];
            if (parsed !== undefined && Number.isFinite(parsed)) tx = parsed;
          }
        }
      }

      // Jump to the identical-looking position one copy over.
      track.style.transition = "none";
      track.style.transform = `translateX(${tx + shift}px)`;
      track.getBoundingClientRect(); // force reflow to lock it in

      // Restore the live transition so the remaining motion resumes
      // toward the rebased target React commits right after this.
      track.style.transition = !anim ? "none" : `transform ${cssDur}s ${cssEase}`;
    }

    // Flushed synchronously (layout effect), so the rebased target is
    // committed before the browser paints a single frame.
    setIdx(newIdx);
  }, [idx, trueLoop, total, dragging, cssDur, cssEase, step, anim]);

  // Clamp the index when the page count shrinks while looping is off.
  // Done during render (the React-endorsed derived-state pattern) so no
  // effect — and no cascading render — is needed for this adjustment.
  const [prevMaxIdx, setPrevMaxIdx] = useState(maxIdx);
  if (!propLoop && prevMaxIdx !== maxIdx) {
    setPrevMaxIdx(maxIdx);
    if (idx > maxIdx) setIdx(maxIdx);
  }

  // A single clock drives navigation and the progress ring, preserving elapsed
  // time while either hover-based autoplay mode pauses it.
  useEffect(() => {
    autoplayElapsed.current = 0;
    // The progress ring shares the autoplay clock: reset both together when
    // the slide or autoplay settings change.
    // eslint-disable-next-line react/set-state-in-effect
    setAutoplayProgress(0);
  }, [displayIdx, autoplay, autoplayMode, autoplayInterval]);

  useEffect(() => {
    if (
      isCanvas ||
      !hasEnteredView ||
      !autoplay ||
      autoplayMode !== "interval" ||
      !(total > perView || trueLoop) ||
      (!propLoop && !trueLoop && displayIdx >= maxIdx) ||
      dragging ||
      (autoplayOnHoverOnly ? !hovered : pauseOnHover && hovered)
    )
      return undefined;
    let frame = 0;
    let last = 0;
    const duration = Math.max(0.5, autoplayInterval) * 1000;
    const tick = (time: number) => {
      if (document.hidden) {
        last = 0;
        frame = requestAnimationFrame(tick);
        return;
      }
      if (last) autoplayElapsed.current += time - last;
      last = time;
      if (autoplayElapsed.current >= duration) {
        autoplayElapsed.current = 0;
        next();
      }
      if (showProgress && arrowShow) setAutoplayProgress(autoplayElapsed.current / duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    autoplay,
    autoplayMode,
    autoplayInterval,
    next,
    total,
    perView,
    trueLoop,
    dragging,
    hovered,
    autoplayOnHoverOnly,
    pauseOnHover,
    isCanvas,
    hasEnteredView,
    showProgress,
    arrowShow,
    propLoop,
    displayIdx,
    maxIdx,
  ]);

  const oneCopyLen = total * step;

  useEffect(() => {
    if (!isContinuous) {
      // Reset the marquee offset when continuous mode turns off.
      // eslint-disable-next-line react/set-state-in-effect
      setContOffset(0);
      return;
    }

    if (oneCopyLen <= 0) return;

    setContOffset(oneCopyLen);
  }, [isContinuous, oneCopyLen]);

  // Continuous RAF — pauses on hover, on drag, and off-screen.
  // Guard is `total < 1` (not `total <= perView`): the 3-copy marquee
  // scrolls seamlessly even when every item fits in view, so continuous
  // autoplay now also works when the CMS count equals Items per view.
  useEffect(() => {
    if (
      !isContinuous ||
      total < 1 ||
      (autoplayOnHoverOnly ? !hovered : pauseOnHover && hovered) ||
      dragging ||
      isCanvas ||
      !hasEnteredView ||
      oneCopyLen <= 0
    ) {
      if (continuousRaf.current) cancelAnimationFrame(continuousRaf.current);
      return undefined;
    }

    const pxPerSec = autoplaySpeed;
    const dirSign = scrollDirection === "right" ? -1 : 1;

    let lastTime = 0;

    function tick(ts: number) {
      if (!lastTime) lastTime = ts;

      const dt = ts - lastTime;
      lastTime = ts;

      setContOffset((p) => {
        let n = p + dirSign * pxPerSec * (dt / 1000);

        // Use `while` instead of `if` so a huge frame delta can't escape the wrap.
        while (n >= 2 * oneCopyLen) n -= oneCopyLen;
        while (n < oneCopyLen) n += oneCopyLen;

        return n;
      });

      continuousRaf.current = requestAnimationFrame(tick);
    }

    continuousRaf.current = requestAnimationFrame(tick);

    return () => {
      if (continuousRaf.current) cancelAnimationFrame(continuousRaf.current);
    };
  }, [
    isContinuous,
    total,
    perView,
    autoplaySpeed,
    scrollDirection,
    hovered,
    autoplayOnHoverOnly,
    pauseOnHover,
    dragging,
    oneCopyLen,
    isCanvas,
    hasEnteredView,
  ]);

  useEffect(() => {
    if (!hovered && !focused) return undefined;

    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };

    window.addEventListener("keydown", h);

    return () => window.removeEventListener("keydown", h);
  }, [hovered, focused, next, prev]);

  // Drag is allowed whenever the track can actually move: more items
  // than fit in view (as before), OR the autoplay-enabled loop /
  // continuous marquee is active with all items visible.
  const canDrag = draggable && (total > perView || trueLoop || (isContinuous && total > 0));

  // ── Pointer drag ────────────────────────────────────
  // Works in BOTH interval AND continuous modes. In continuous mode the
  // RAF is automatically paused (dragging flag), and the drag delta is
  // applied to contOffset directly so the marquee resumes from where the
  // user left it.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !canDrag ||
      e.button !== 0 ||
      !e.isPrimary ||
      targetElement(e.target)?.closest("button,input,textarea,select,[contenteditable=true]")
    )
      return;
    gesture.current = { id: e.pointerId, active: true, moved: false, dx: 0 };
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragStartTime.current = Date.now();
    dragStartContOffset.current = contOffset;
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.active || e.pointerId !== g.id) return;
    let dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!g.moved) {
      if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) {
        g.active = false;
        return;
      }
      if (Math.abs(dx) <= 6) return;
      g.moved = true;
      setDragging(true);
      // Capture only after a drag starts: ordinary anchor clicks keep
      // their original target, modifiers, download and target behavior.
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    g.dx = dx;
    if (e.cancelable) e.preventDefault();
    if (isContinuous) {
      let offset = dragStartContOffset.current - dx;
      if (oneCopyLen > 0) {
        while (offset >= 2 * oneCopyLen) offset -= oneCopyLen;
        while (offset < oneCopyLen) offset += oneCopyLen;
      }
      setContOffset(offset);
    } else {
      if (!propLoop) {
        if (idx <= 0 && dx > 0) dx *= 0.3;
        if (idx >= maxIdx && dx < 0) dx *= 0.3;
      }
      setDrag(dx);
    }
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (e.pointerId !== g.id) return;
    g.active = false;
    setDragging(false);
    if (g.moved && e.type !== "pointercancel" && !isContinuous) {
      const velocity = Math.abs(g.dx) / Math.max(1, Date.now() - dragStartTime.current);
      if (Math.abs(g.dx) > slideSize * 0.25 || velocity > 0.5) {
        if (g.dx < 0) next();
        else prev();
      }
    }
    setDrag(0);
    // Keep moved until the subsequent click has been suppressed.
  };

  let transformValue;
  let transitionStr;

  if (isContinuous) {
    transformValue = `translateX(${-contOffset}px)`;
    transitionStr = "none";
  } else {
    const tOff = -(idx * step) + drag;

    transitionStr = !anim || dragging || cssDur === 0 ? "none" : `transform ${cssDur}s ${cssEase}`;

    transformValue = `translateX(${tOff}px)`;
  }

  if (!children) {
    return (
      <div
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#999",
          fontSize: 14,
          minHeight: 120,
          border: "1px dashed #ccc",
          borderRadius: 8,
          padding: 16,
          textAlign: "center",
        }}
      >
        Connect a Collection List -&gt;
      </div>
    );
  }

  const canNav = total > perView || trueLoop;
  const canPrev = trueLoop || propLoop || displayIdx > 0;
  const canNext = trueLoop || propLoop || displayIdx < maxIdx;
  const arrowsVisible = arrowGrouped || !arrowFade ? true : hovered;

  function getArrowPositionStyle(): CSSProperties | undefined {
    if (!arrowGrouped) return undefined;

    const b: CSSProperties = {
      position: "absolute",
      display: "flex",
      zIndex: 10,
      opacity: arrowsVisible ? 1 : 0,
      transition: "opacity .25s",
      pointerEvents: arrowsVisible ? "auto" : "none",
      flexDirection: "row",
      gap: arrowGap,
    };

    switch (arrowPos) {
      case "top-left":
        return { ...b, top: arrowTop, left: arrowLeft };
      case "top-center":
        return {
          ...b,
          top: arrowTop,
          left: "50%",
          transform: "translateX(-50%)",
        };
      case "top-right":
        return { ...b, top: arrowTop, right: arrowRight };
      case "center-left":
        return {
          ...b,
          top: "50%",
          left: arrowLeft,
          transform: "translateY(-50%)",
        };
      case "center":
        return {
          ...b,
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
        };
      case "center-right":
        return {
          ...b,
          top: "50%",
          right: arrowRight,
          transform: "translateY(-50%)",
        };
      case "bottom-left":
        return { ...b, bottom: arrowBottom, left: arrowLeft };
      case "bottom-center":
        return {
          ...b,
          bottom: arrowBottom,
          left: "50%",
          transform: "translateX(-50%)",
        };
      case "bottom-right":
        return { ...b, bottom: arrowBottom, right: arrowRight };
      default:
        return { ...b, bottom: arrowBottom, right: arrowRight };
    }
  }

  function spacedStyle(which: string): CSSProperties {
    const b: CSSProperties = {
      position: "absolute",
      zIndex: 10,
      opacity: arrowsVisible ? 1 : 0,
      transition: "opacity .25s",
      pointerEvents: arrowsVisible ? "auto" : "none",
    };

    return {
      ...b,
      top: "50%",
      transform: "translateY(-50%)",
      ...(which === "prev" ? { left: arrowLeft - arrowInset } : { right: arrowRight - arrowInset }),
    };
  }

  const arrowBtnStyle: CSSProperties = {
    width: arrowSize,
    height: arrowSize,
    borderRadius: arrowRadius,
    background: arrowFill,
    backdropFilter: arrowBlur > 0 ? `blur(${arrowBlur}px)` : undefined,
    WebkitBackdropFilter: arrowBlur > 0 ? `blur(${arrowBlur}px)` : undefined,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    transition: "opacity .2s, transform .15s",
  };

  const floatingActive =
    followCursor && cursor.visible && !isCanvas && arrowShow && canNav && !isContinuous;
  const progressActive = autoplay && autoplayMode === "interval" && arrowShow && showProgress;
  function progressRing() {
    if (!progressActive) return null;
    const stroke = Math.max(0.5, Math.min(progressWidth, arrowSize / 3));
    const radius = (arrowSize - stroke) / 2;
    const length = 2 * Math.PI * radius;
    return (
      <svg
        aria-hidden="true"
        width={arrowSize}
        height={arrowSize}
        viewBox={`0 0 ${arrowSize} ${arrowSize}`}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          transform: "rotate(-90deg)",
        }}
      >
        <circle
          data-autoplay-progress=""
          cx={arrowSize / 2}
          cy={arrowSize / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={stroke}
          strokeDasharray={length}
          strokeDashoffset={length * (1 - autoplayProgress)}
        />
      </svg>
    );
  }
  function renderIcon(which: string) {
    const custom = which === "link" ? linkIcon : which === "prev" ? previousIcon : nextIcon;
    if (custom)
      return (
        <span
          data-custom-icon={which}
          style={{
            display: "block",
            width: arrowIconSize,
            height: arrowIconSize,
            backgroundColor: arrowColor,
            maskImage: `url(${JSON.stringify(custom)})`,
            WebkitMaskImage: `url(${JSON.stringify(custom)})`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      );
    const link = which === "link";
    const path = link
      ? "M7 17 17 7 M7 7h10v10"
      : iconStyle === "arrow"
        ? "M5 12h14 M12 5l7 7-7 7"
        : iconStyle === "caret"
          ? "m9 5 7 7-7 7Z"
          : "m9 5 7 7-7 7";
    return (
      <svg
        data-arrow-icon={link ? "link" : iconStyle}
        width={arrowIconSize}
        height={arrowIconSize}
        viewBox="0 0 24 24"
        fill={!link && iconStyle === "caret" ? arrowColor : "none"}
        stroke={arrowColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transform: which === "prev" ? "rotate(180deg)" : undefined,
        }}
      >
        <path d={path} />
      </svg>
    );
  }
  function mkArrow(which: string, decorative = false) {
    const isPrev = which === "prev";
    const disabled = which === "link" ? false : isPrev ? !canPrev : !canNext;

    return (
      <button
        type="button"
        tabIndex={decorative ? -1 : 0}
        onClick={(e) => {
          e.stopPropagation();

          if (disabled) return;

          if (isPrev) prev();
          else next();
        }}
        aria-label={which === "link" ? "Open link" : isPrev ? "Previous slide" : "Next slide"}
        style={{
          ...arrowBtnStyle,
          position: "relative",
          opacity: disabled ? 0.3 : 1,
          pointerEvents: decorative || disabled ? "none" : "auto",
        }}
        onPointerDown={(e) => {
          if (disabled) return;

          e.currentTarget.style.transform = "scale(0.88)";
          e.currentTarget.style.opacity = "0.8";
        }}
        onPointerUp={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.opacity = disabled ? "0.3" : "1";
        }}
        onPointerLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.opacity = disabled ? "0.3" : "1";
        }}
      >
        {progressRing()}
        <span
          style={{
            position: "relative",
            width: arrowIconSize,
            height: arrowIconSize,
          }}
        >
          {["prev", "next", "link"].map((icon) => (
            <span
              key={icon}
              aria-hidden="true"
              data-icon-layer={icon}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: which === icon ? 1 : 0,
                transform: which === icon ? "scale(1)" : "scale(.8)",
                transition: `opacity ${Math.max(0, iconDuration)}s ease, transform ${Math.max(0, iconDuration)}s ease`,
                pointerEvents: "none",
              }}
            >
              {renderIcon(icon)}
            </span>
          ))}
        </span>
      </button>
    );
  }

  // dotStyle comes from a closed Enum control, so the lookup always hits; the
  // fallback keeps the type checker (and any stale saved value) happy.
  const getDot: DotRenderer = dotRenderers[dotStyle] ?? fallbackDotRenderer;
  const shouldShowDots = dotShow && canNav && !isContinuous;

  // ── Visible dots window ─────────────────────────────
  // Build a window of exactly `maxVisible` dots centered on displayIdx,
  // then slide it into [0, pages-1] without changing its width. This
  // guarantees the active dot is always inside the window — no defensive
  // patching needed.
  function getVisibleDots() {
    if (!limitVisible || pages <= maxVisible) {
      return Array.from({ length: pages }).map((_, i) => ({
        i,
        opacity: 1,
      }));
    }

    // Clamp displayIdx defensively in case it briefly exceeds pages
    // during a state transition (snap-back, count change).
    const activeI = Math.max(0, Math.min(displayIdx, pages - 1));

    // Center the window on activeI, fixed width = maxVisible.
    const half = Math.floor(maxVisible / 2);
    let start = activeI - half;
    let end = start + maxVisible - 1;

    // Slide the window into bounds without resizing it.
    if (start < 0) {
      end -= start; // end += -start, so end shifts right by the same amount
      start = 0;
    }
    if (end > pages - 1) {
      start -= end - (pages - 1);
      end = pages - 1;
    }

    // If maxVisible > pages somehow, final clamp (shouldn't happen due
    // to the early return above, but cheap insurance).
    start = Math.max(0, start);
    end = Math.min(pages - 1, end);

    const result: { i: number; opacity: number }[] = [];

    for (let i = start; i <= end; i++) {
      if (i === activeI) {
        result.push({ i, opacity: 1 });
        continue;
      }

      let op = 1;

      if (i === start && start > 0) op = 0.4;
      else if (i === start + 1 && start > 0) op = 0.7;

      if (i === end && end < pages - 1) op = 0.4;
      else if (i === end - 1 && end < pages - 1) op = 0.7;

      result.push({ i, opacity: op });
    }

    return result;
  }

  return (
    // Carousel viewport: a focusable region with arrow-key navigation per the
    // APG carousel pattern — tabIndex and the pointer/keyboard handlers below
    // are required for it.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      data-slideshow={scope}
      aria-roledescription="carousel"
      aria-label="Slideshow"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setFocused(false);
          setKeyboardInput(false);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setCursor((p) => ({ ...p, visible: false }));
        pointerClick.current.armed = false;
      }}
      onKeyDownCapture={() => {
        setKeyboardInput(true);
        setCursor((p) => ({ ...p, visible: false }));
      }}
      onPointerMoveCapture={(e) => {
        setTouchInput(e.pointerType !== "mouse");
        setKeyboardInput(false);
        if (Math.hypot(e.clientX - pointerClick.current.x, e.clientY - pointerClick.current.y) > 6)
          pointerClick.current.moved = true;
        if (!followCursor || e.pointerType !== "mouse" || !arrowShow || !canNav || isContinuous)
          return;
        const target = document.elementFromPoint(e.clientX, e.clientY) ?? targetElement(e.target);
        const interactive = target?.closest("button,input,textarea,select,[contenteditable=true]");
        const rect = e.currentTarget.getBoundingClientRect();
        setCursor({
          x: ((e.clientX - rect.left) * e.currentTarget.offsetWidth) / rect.width,
          y: ((e.clientY - rect.top) * e.currentTarget.offsetHeight) / rect.height,
          next: e.clientX >= window.innerWidth / 2,
          visible: !interactive,
          link: !!contentLink(target),
        });
        if (Math.hypot(e.clientX - pointerClick.current.x, e.clientY - pointerClick.current.y) > 6)
          pointerClick.current.moved = true;
      }}
      onPointerDownCapture={(e) => {
        gesture.current.moved = false;
        setKeyboardInput(false);
        setTouchInput(e.pointerType !== "mouse");
        if (e.pointerType !== "mouse") {
          setCursor((p) => ({ ...p, visible: false }));
          return;
        }
        const target = targetElement(e.target);
        pointerClick.current = {
          x: e.clientX,
          y: e.clientY,
          moved: false,
          armed:
            followCursor &&
            arrowShow &&
            canNav &&
            !isContinuous &&
            e.button === 0 &&
            !contentLink(target) &&
            !target?.closest("button,input,textarea,select,[contenteditable=true]"),
        };
      }}
      onPointerCancelCapture={() => {
        pointerClick.current.armed = false;
      }}
      onClickCapture={(e) => {
        if (gesture.current.moved && e.detail !== 0) {
          e.preventDefault();
          e.stopPropagation();
          pointerClick.current.armed = false;
          return;
        }
        const click = { ...pointerClick.current };
        pointerClick.current.armed = false;
        const target = targetElement(e.target);
        if (
          !click.armed ||
          click.moved ||
          !followCursor ||
          !arrowShow ||
          !canNav ||
          isContinuous ||
          contentLink(target) ||
          target?.closest("button,input,textarea,select,[contenteditable=true]")
        )
          return;
        e.preventDefault();
        e.stopPropagation();
        if (e.clientX >= window.innerWidth / 2) {
          if (canNext) next();
        } else if (canPrev) prev();
      }}
      style={{
        ...style,
        position: "relative",
        overflow: "visible",
        width: "100%",
        touchAction: "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        outline: "none",
        cursor: floatingActive ? "none" : undefined,
      }}
    >
      <style>{`
                ${floatingActive ? `[data-slideshow="${scope}"] .ss-copy, [data-slideshow="${scope}"] .ss-copy * { cursor: none !important; }` : ""}

                [data-slideshow="${scope}"] .ss-copy {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: ${flexAlign} !important;
                    gap: ${gap}px !important;
                    flex: 0 0 auto !important;
                }
                [data-slideshow="${scope}"] .ss-copy > * {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: ${flexAlign} !important;
                    gap: ${gap}px !important;
                    width: auto !important;
                    height: auto !important;
                }
                [data-slideshow="${scope}"] .ss-copy > * > * {
                    flex: 0 0 ${slideSize}px !important;
                    width: ${slideSize}px !important;
                    min-width: 0 !important;
                    max-width: none !important;
                    border-radius: ${borderRadiusStr};
                    overflow: ${clipOverflow === "show" ? "visible" : "hidden"};
                }
                [data-slideshow="${scope}"] .ss-copy > * > * > * {
                    width: 100% !important;
                }

                /* ── Depth-agnostic overrides (preview wrapper fix) ──
                   Only active when JS has tagged nodes because preview
                   inserted an extra wrapper around the collection. These
                   rules come AFTER the static ones with equal specificity,
                   so they win wherever both apply. */
                [data-slideshow="${scope}"] [data-ss-wrap] {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: ${flexAlign} !important;
                    gap: ${gap}px !important;
                    width: auto !important;
                    height: auto !important;
                    max-width: none !important;
                    flex: 0 0 auto !important;
                    overflow: visible !important;
                }
                [data-slideshow="${scope}"] [data-ss-items] {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: ${flexAlign} !important;
                    gap: ${gap}px !important;
                    width: auto !important;
                    height: auto !important;
                    max-width: none !important;
                    flex: 0 0 auto !important;
                }
                [data-slideshow="${scope}"] [data-ss-items] > * {
                    flex: 0 0 ${slideSize}px !important;
                    width: ${slideSize}px !important;
                    min-width: 0 !important;
                    max-width: none !important;
                    border-radius: ${borderRadiusStr};
                    overflow: ${clipOverflow === "show" ? "visible" : "hidden"};
                }
                [data-slideshow="${scope}"] [data-ss-items] > * > * {
                    width: 100% !important;
                }
            `}</style>

      <div
        ref={containerRef}
        data-clip-ref
        aria-live="polite"
        style={{
          overflow: clipFade ? "hidden" : clipOverflow === "show" ? "visible" : "hidden",
          borderRadius: borderRadiusStr,
          paddingTop: pad.top,
          paddingRight: pad.right,
          paddingBottom: pad.bottom,
          paddingLeft: pad.left,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {clipFade && (
          <style>{`
                        [data-slideshow="${scope}"] [data-clip-ref] {
                            -webkit-mask-image: linear-gradient(
                                to right,
                                rgba(0,0,0,${fadeOpacity}) ${fadeInset}%,
                                rgba(0,0,0,1) ${fadeInset + fadeWidth}%,
                                rgba(0,0,0,1) ${100 - fadeInset - fadeWidth}%,
                                rgba(0,0,0,${fadeOpacity}) ${100 - fadeInset}%
                            );
                            mask-image: linear-gradient(
                                to right,
                                rgba(0,0,0,${fadeOpacity}) ${fadeInset}%,
                                rgba(0,0,0,1) ${fadeInset + fadeWidth}%,
                                rgba(0,0,0,1) ${100 - fadeInset - fadeWidth}%,
                                rgba(0,0,0,${fadeOpacity}) ${100 - fadeInset}%
                            );
                        }
                    `}</style>
        )}

        <div
          ref={trackRef}
          onPointerDownCapture={onPointerDown}
          onPointerMoveCapture={onPointerMove}
          onPointerUpCapture={onPointerUp}
          onPointerCancelCapture={onPointerUp}
          onLostPointerCapture={(e) => {
            if (gesture.current.active) onPointerUp(e);
          }}
          onDragStartCapture={(e) => {
            if (draggable || followCursor) e.preventDefault();
          }}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: flexAlign,
            gap: isContinuous || trueLoop ? gap : 0,
            transform: transformValue,
            transition: transitionStr,
            cursor: floatingActive
              ? "none"
              : canDrag
                ? dragging
                  ? "grabbing"
                  : "grab"
                : "default",
            willChange: "transform",
          }}
        >
          {COPY_KEYS.slice(0, numCopies).map((copyKey, i) => (
            <div
              key={copyKey}
              ref={i === 0 ? copyARef : undefined}
              className="ss-copy"
              aria-hidden={i === 0 ? undefined : "true"}
            >
              {children}
            </div>
          ))}
        </div>
      </div>

      {arrowShow &&
        canNav &&
        !isContinuous &&
        (followCursor && !isCanvas && !touchInput && !(focused && keyboardInput) ? (
          <div
            aria-hidden="true"
            data-floating-arrow=""
            style={{
              position: "absolute",
              zIndex: 20,
              left: cursor.x,
              top: cursor.y,
              opacity: floatingActive ? 1 : 0,
              transform: `translate(-50%, -50%) scale(${floatingActive ? 1 : 0.8})`,
              transition: `opacity ${Math.max(0, visibilityDuration)}s ease, transform ${Math.max(0, visibilityDuration)}s ease`,
              pointerEvents: "none",
            }}
          >
            {mkArrow(cursor.link ? "link" : cursor.next ? "next" : "prev", true)}
          </div>
        ) : arrowGrouped ? (
          <div style={getArrowPositionStyle()}>
            {mkArrow("prev")}
            {mkArrow("next")}
          </div>
        ) : (
          <>
            <div style={spacedStyle("prev")}>{mkArrow("prev")}</div>
            <div style={spacedStyle("next")}>{mkArrow("next")}</div>
          </>
        ))}

      {shouldShowDots && (
        <div
          style={{
            position: "absolute",
            bottom: dotInset,
            ...(dotAlign === "left"
              ? { left: dotSideInset }
              : dotAlign === "right"
                ? { right: dotSideInset }
                : { left: "50%", transform: "translateX(-50%)" }),
            flexDirection: "row",
            display: "flex",
            gap: dotGap,
            padding: dotPad,
            background: dotBg,
            borderRadius: dotRadius,
            zIndex: 10,
            backdropFilter: dotBlur > 0 ? `blur(${dotBlur}px)` : undefined,
            WebkitBackdropFilter: dotBlur > 0 ? `blur(${dotBlur}px)` : undefined,
            overflow: "hidden",
          }}
        >
          {getVisibleDots().map(({ i, opacity: edgeOp }) => {
            const clampedActive = Math.max(0, Math.min(displayIdx, pages - 1));
            const isActive = clampedActive === i;

            const base = getDot(
              isActive,
              dotFill,
              dotOpacity,
              dotCurrent,
              isActive ? dotActiveWidth : dotInactiveWidth,
              isActive ? dotActiveHeight : dotInactiveHeight,
              dotAnimation,
            );

            return (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={isActive ? "true" : undefined}
                style={{
                  ...base,
                  flexShrink: 0,
                  cursor: "pointer",
                  opacity: isActive ? base.opacity : base.opacity * edgeOp,
                }}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

const isCont = (p: SlideshowCMSProps): boolean =>
  p.autoplay === true && p.autoplayMode === "continuous";

addPropertyControls(SlideshowCMS, {
  children: {
    type: ControlType.ComponentInstance,
    title: "Collection",
    description: "Connect a Collection List from the canvas. Each CMS record becomes one slide.",
  },
  itemsPerView: {
    type: ControlType.Number,
    title: "Items",
    defaultValue: 1,
    min: 1,
    max: 10,
    step: 1,
    displayStepper: true,
  },
  gap: {
    type: ControlType.Number,
    title: "Gap",
    defaultValue: 16,
    min: 0,
    max: 100,
    step: 1,
  },
  padding: {
    type: ControlType.Padding,
    title: "Padding",
    defaultValue: "0px",
  },
  align: {
    type: ControlType.Enum,
    title: "Align",
    options: ["top", "center", "bottom"],
    optionTitles: ["Top", "Center", "Bottom"],
    defaultValue: "center",
    displaySegmentedControl: true,
  },
  clipRadius: {
    type: ControlType.BorderRadius,
    title: "Radius",
    defaultValue: "0px",
  },
  draggable: {
    type: ControlType.Boolean,
    title: "Draggable",
    defaultValue: true,
    enabledTitle: "Yes",
    disabledTitle: "No",
    // Always visible — drag works in continuous mode too (pauses RAF while held).
  },
  loop: {
    type: ControlType.Boolean,
    title: "Loop",
    defaultValue: true,
    enabledTitle: "On",
    disabledTitle: "Off",
    hidden(p) {
      return isCont(p);
    },
  },
  transition: {
    type: ControlType.Transition,
    title: "Transition",
    hidden(p) {
      return isCont(p);
    },
  },
  autoplay: {
    type: ControlType.Boolean,
    title: "Auto Play",
    defaultValue: false,
    enabledTitle: "Yes",
    disabledTitle: "No",
  },
  autoplayMode: {
    type: ControlType.Enum,
    title: "Scroll Type",
    options: ["interval", "continuous"],
    optionTitles: ["Interval", "Continuous"],
    defaultValue: "interval",
    displaySegmentedControl: true,
    hidden(p) {
      return !p.autoplay;
    },
  },
  autoplayInterval: {
    type: ControlType.Number,
    title: "Interval",
    defaultValue: 3,
    min: 0.5,
    max: 15,
    step: 0.5,
    unit: "s",
    displayStepper: true,
    hidden(p) {
      return !p.autoplay || p.autoplayMode !== "interval";
    },
  },
  autoplaySpeed: {
    type: ControlType.Number,
    title: "Speed",
    defaultValue: 30,
    min: 5,
    max: 300,
    step: 5,
    unit: "px/s",
    hidden(p) {
      return !p.autoplay || p.autoplayMode !== "continuous";
    },
  },
  scrollDirection: {
    type: ControlType.Enum,
    title: "Direction",
    options: ["left", "right"],
    optionTitles: ["Left", "Right"],
    defaultValue: "left",
    displaySegmentedControl: true,
    hidden(p) {
      return !p.autoplay || p.autoplayMode !== "continuous";
    },
  },
  autoplayOnHoverOnly: {
    type: ControlType.Boolean,
    title: "Only on Hover",
    defaultValue: false,
    enabledTitle: "Yes",
    disabledTitle: "No",
    hidden(p) {
      return !p.autoplay;
    },
  },
  pauseOnHover: {
    type: ControlType.Boolean,
    title: "Pause on Hover",
    defaultValue: true,
    enabledTitle: "Yes",
    disabledTitle: "No",
    hidden(p) {
      return !p.autoplay || p.autoplayOnHoverOnly === true;
    },
  },
  arrows: {
    type: ControlType.Object,
    title: "Arrows",
    hidden(p) {
      return isCont(p);
    },
    controls: {
      show: {
        type: ControlType.Boolean,
        title: "Show",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
      },
      followCursor: {
        type: ControlType.Boolean,
        title: "Follow Cursor",
        defaultValue: false,
        description:
          "Mouse only. Previous on the left half of the viewport; Next on the right. Touch and keyboard keep regular arrows.",
        hidden(p) {
          return !p.show;
        },
      },
      showProgress: {
        type: ControlType.Boolean,
        title: "Show Progress",
        defaultValue: false,
        hidden(p, rootProps) {
          return !p.show || !rootProps.autoplay;
        },
      },
      progressColor: {
        type: ControlType.Color,
        title: "Progress Color",
        defaultValue: "#22B34B",
        hidden(p, rootProps) {
          return !p.show || !rootProps.autoplay || !p.showProgress;
        },
      },
      progressWidth: {
        type: ControlType.Number,
        title: "Progress Width",
        defaultValue: 2,
        min: 0.5,
        max: 12,
        step: 0.5,
        unit: "px",
        displayStepper: true,
        hidden(p, rootProps) {
          return !p.show || !rootProps.autoplay || !p.showProgress;
        },
      },
      grouped: {
        type: ControlType.Boolean,
        title: "Grouped",
        defaultValue: false,
        enabledTitle: "Yes",
        disabledTitle: "No",
        hidden(p) {
          return !p.show;
        },
      },
      fadeIn: {
        type: ControlType.Boolean,
        title: "Auto Hide",
        defaultValue: false,
        enabledTitle: "Yes",
        disabledTitle: "No",
        hidden(p) {
          return !p.show || p.grouped;
        },
      },
      position: {
        type: ControlType.Enum,
        title: "Position",
        options: [
          "top-left",
          "top-center",
          "top-right",
          "center-left",
          "center",
          "center-right",
          "bottom-left",
          "bottom-center",
          "bottom-right",
        ],
        optionTitles: [
          "Top Left",
          "Top Center",
          "Top Right",
          "Center Left",
          "Center",
          "Center Right",
          "Bottom Left",
          "Bottom Center",
          "Bottom Right",
        ],
        defaultValue: "bottom-right",
        hidden(p) {
          return !p.show || !p.grouped;
        },
      },
      arrowGap: {
        type: ControlType.Number,
        title: "Gap",
        defaultValue: 10,
        min: 0,
        max: 40,
        step: 1,
        displayStepper: true,
        hidden(p) {
          return !p.show || !p.grouped;
        },
      },
      top: {
        type: ControlType.Number,
        title: "Top",
        defaultValue: 0,
        min: -200,
        max: 200,
        step: 1,
        displayStepper: true,
        hidden(p) {
          if (!p.show) return true;
          if (p.grouped) return !["top-left", "top-center", "top-right"].includes(p.position);
          return true;
        },
      },
      bottom: {
        type: ControlType.Number,
        title: "Bottom",
        defaultValue: -50,
        min: -200,
        max: 200,
        step: 1,
        displayStepper: true,
        hidden(p) {
          if (!p.show) return true;
          if (p.grouped)
            return !["bottom-left", "bottom-center", "bottom-right"].includes(p.position);
          return true;
        },
      },
      inset: {
        type: ControlType.Number,
        title: "Inset",
        defaultValue: 0,
        min: -500,
        max: 500,
        step: 1,
        displayStepper: true,
        hidden(p) {
          return !p.show || p.grouped;
        },
      },
      left: {
        type: ControlType.Number,
        title: "Left",
        defaultValue: 12,
        min: -200,
        max: 200,
        step: 1,
        displayStepper: true,
        hidden(p) {
          if (!p.show) return true;
          if (p.grouped) return !["top-left", "center-left", "bottom-left"].includes(p.position);
          return !p.grouped;
        },
      },
      right: {
        type: ControlType.Number,
        title: "Right",
        defaultValue: 10,
        min: -200,
        max: 200,
        step: 1,
        displayStepper: true,
        hidden(p) {
          if (!p.show) return true;
          if (p.grouped) return !["top-right", "center-right", "bottom-right"].includes(p.position);
          return !p.grouped;
        },
      },
      fill: {
        type: ControlType.Color,
        title: "Fill",
        defaultValue: "rgba(0,0,0,0.5)",
        hidden(p) {
          return !p.show;
        },
      },
      blur: {
        type: ControlType.Number,
        title: "Blur",
        defaultValue: 0,
        min: 0,
        max: 40,
        step: 1,
        unit: "px",
        displayStepper: true,
        hidden(p) {
          return !p.show;
        },
      },
      iconStyle: {
        type: ControlType.Enum,
        title: "Icon Style",
        options: ["chevron", "arrow", "caret"],
        optionTitles: ["Chevron", "Arrow", "Caret"],
        defaultValue: "chevron",
        hidden: (p) => !p.show,
      },
      iconDuration: {
        type: ControlType.Number,
        title: "Icon Transition",
        defaultValue: 0.2,
        min: 0,
        max: 2,
        step: 0.05,
        unit: "s",
        displayStepper: true,
        hidden: (p) => !p.show || !p.followCursor,
        description: "Duration when switching between Previous, Next and Link icons.",
      },
      visibilityDuration: {
        type: ControlType.Number,
        title: "Fade Transition",
        defaultValue: 0.2,
        min: 0,
        max: 2,
        step: 0.05,
        unit: "s",
        displayStepper: true,
        hidden: (p) => !p.show || !p.followCursor,
        description: "Duration when the floating button appears or disappears. Set 0 for instant.",
      },
      previousIcon: {
        type: ControlType.File,
        title: "Previous Icon",
        allowedFileTypes: ["svg"],
        hidden: (p) => !p.show,
        description: "Optional SVG. Uses Icon Color. Clear to use Icon Style.",
      },
      nextIcon: {
        type: ControlType.File,
        title: "Next Icon",
        allowedFileTypes: ["svg"],
        hidden: (p) => !p.show,
      },
      linkIcon: {
        type: ControlType.File,
        title: "Link Icon",
        allowedFileTypes: ["svg"],
        hidden: (p) => !p.show || !p.followCursor,
      },
      color: {
        type: ControlType.Color,
        title: "Icon Color",
        defaultValue: "#ffffff",
        hidden(p) {
          return !p.show;
        },
      },
      size: {
        type: ControlType.Number,
        title: "Size",
        defaultValue: 40,
        min: 20,
        max: 100,
        step: 1,
        displayStepper: true,
        hidden(p) {
          return !p.show;
        },
      },
      iconSize: {
        type: ControlType.Number,
        title: "Icon Size",
        defaultValue: 20,
        min: 8,
        max: 60,
        step: 1,
        displayStepper: true,
        hidden(p) {
          return !p.show;
        },
      },
      radius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 40,
        min: 0,
        max: 999,
        step: 1,
        hidden(p) {
          return !p.show;
        },
      },
    },
  },
  dots: {
    type: ControlType.Object,
    title: "Dots",
    hidden(p) {
      return isCont(p);
    },
    controls: {
      show: {
        type: ControlType.Boolean,
        title: "Show",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
      },
      animation: {
        type: ControlType.Enum,
        title: "Animation",
        options: ["none", "smooth", "ease", "snappy", "bounce"],
        optionTitles: ["None", "Smooth", "Ease", "Snappy", "Bounce"],
        defaultValue: "smooth",
        hidden(p) {
          return !p.show;
        },
      },
      limitVisible: {
        type: ControlType.Boolean,
        title: "Limit Visible",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden(p) {
          return !p.show;
        },
      },
      maxVisible: {
        type: ControlType.Number,
        title: "Max Visible",
        defaultValue: 5,
        min: 3,
        max: 15,
        step: 1,
        displayStepper: true,
        description: "Edge dots fade when total exceeds this number",
        hidden(p) {
          return !p.show || !p.limitVisible;
        },
      },
      align: {
        type: ControlType.Enum,
        title: "Align",
        options: ["left", "center", "right"],
        optionTitles: ["Left", "Center", "Right"],
        defaultValue: "center",
        displaySegmentedControl: true,
        hidden(p) {
          return !p.show;
        },
      },
      sideInset: {
        type: ControlType.Number,
        title: "Side Inset",
        defaultValue: 24,
        min: -100,
        max: 200,
        step: 1,
        displayStepper: true,
        hidden(p) {
          return !p.show || p.align === "center";
        },
      },
      inset: {
        type: ControlType.Number,
        title: "Bottom Inset",
        defaultValue: -40,
        min: -200,
        max: 200,
        step: 1,
        displayStepper: true,
        hidden(p) {
          return !p.show;
        },
      },
      dotStyle: {
        type: ControlType.Enum,
        title: "Style",
        options: ["circle", "pill", "dash", "ring", "square", "diamond"],
        optionTitles: ["Circle", "Pill", "Dash", "Ring", "Square", "Diamond"],
        defaultValue: "circle",
        hidden(p) {
          return !p.show;
        },
      },
      activeWidth: {
        type: ControlType.Number,
        title: "Active Width",
        optional: true,
        description:
          "Auto uses the Style preset. Set a value to override; clear it to restore Auto.",
        min: 1,
        max: 200,
        step: 0.1,
        unit: "px",
        displayStepper: true,
        hidden(p) {
          return !p.show;
        },
      },
      activeHeight: {
        type: ControlType.Number,
        title: "Active Height",
        optional: true,
        description:
          "Auto uses the Style preset. Set a value to override; clear it to restore Auto.",
        min: 1,
        max: 200,
        step: 0.1,
        unit: "px",
        displayStepper: true,
        hidden(p) {
          return !p.show;
        },
      },
      inactiveWidth: {
        type: ControlType.Number,
        title: "Default Width",
        optional: true,
        description:
          "Auto uses the Style preset. Set a value to override; clear it to restore Auto.",
        min: 1,
        max: 200,
        step: 0.1,
        unit: "px",
        displayStepper: true,
        hidden(p) {
          return !p.show;
        },
      },
      inactiveHeight: {
        type: ControlType.Number,
        title: "Default Height",
        optional: true,
        description:
          "Auto uses the Style preset. Set a value to override; clear it to restore Auto.",
        min: 1,
        max: 200,
        step: 0.1,
        unit: "px",
        displayStepper: true,
        hidden(p) {
          return !p.show;
        },
      },
      gap: {
        type: ControlType.Number,
        title: "Gap",
        defaultValue: 10,
        min: 0,
        max: 30,
        step: 1,
        displayStepper: true,
        hidden(p) {
          return !p.show;
        },
      },
      padding: {
        type: ControlType.Number,
        title: "Padding",
        defaultValue: 8,
        min: 0,
        max: 30,
        step: 1,
        displayStepper: true,
        hidden(p) {
          return !p.show;
        },
      },
      fill: {
        type: ControlType.Color,
        title: "Fill",
        defaultValue: "#ffffff",
        hidden(p) {
          return !p.show;
        },
      },
      backdrop: {
        type: ControlType.Color,
        title: "Backdrop",
        defaultValue: "#1a1a2e",
        hidden(p) {
          return !p.show;
        },
      },
      radius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 50,
        min: 0,
        max: 100,
        step: 1,
        hidden(p) {
          return !p.show;
        },
      },
      opacity: {
        type: ControlType.Number,
        title: "Opacity",
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        hidden(p) {
          return !p.show;
        },
      },
      current: {
        type: ControlType.Number,
        title: "Current Opacity",
        defaultValue: 1,
        min: 0,
        max: 1,
        step: 0.05,
        hidden(p) {
          return !p.show;
        },
      },
      blur: {
        type: ControlType.Number,
        title: "Blur",
        defaultValue: 0,
        min: 0,
        max: 20,
        step: 1,
        displayStepper: true,
        hidden(p) {
          return !p.show;
        },
      },
    },
  },
  // Kept last and never hidden so the credit below it is always visible,
  // including when continuous autoplay hides the Arrows/Dots sections.
  clipping: {
    type: ControlType.Object,
    title: "Clipping",
    description: "Component by [Visuvate Studio](https://www.visuvate.com)",
    controls: {
      fade: {
        type: ControlType.Boolean,
        title: "Fade",
        defaultValue: false,
        enabledTitle: "Yes",
        disabledTitle: "No",
      },
      overflow: {
        type: ControlType.Enum,
        title: "Overflow",
        options: ["hidden", "show"],
        optionTitles: ["Hide", "Show"],
        defaultValue: "hidden",
        displaySegmentedControl: true,
        hidden(p) {
          return p.fade;
        },
      },
      fadeWidth: {
        type: ControlType.Number,
        title: "Width",
        defaultValue: 25,
        min: 1,
        max: 50,
        step: 1,
        unit: "%",
        hidden(p) {
          return !p.fade;
        },
      },
      fadeInset: {
        type: ControlType.Number,
        title: "Inset",
        defaultValue: 0,
        min: 0,
        max: 40,
        step: 1,
        unit: "%",
        hidden(p) {
          return !p.fade;
        },
      },
      fadeOpacity: {
        type: ControlType.Number,
        title: "Opacity",
        defaultValue: 0,
        min: 0,
        max: 1,
        step: 0.05,
        hidden(p) {
          return !p.fade;
        },
      },
    },
  },
});
export default SlideshowCMS;
