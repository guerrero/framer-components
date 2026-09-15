import { forwardRef, type CSSProperties, type ReactNode } from "react";

/**
 * Minimal local runtime for the `framer` module.
 *
 * The real `framer` package on npm only ships type definitions (the runtime is
 * injected by the Framer editor). Locally we alias `framer` to this module in
 * Vite and Vitest so code components and overrides can be rendered, tested and
 * previewed outside of Framer.
 *
 * Only the pieces our code actually uses are implemented. Extend this file as
 * you adopt more of the Framer API — keep the runtime values in sync with the
 * real types in `framer`.
 */

type UnknownProps = Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* Property controls                                                          */
/* -------------------------------------------------------------------------- */

/** Runtime values of `ControlType` (must match the real `framer` enum). */
export const ControlType = {
  Boolean: "boolean",
  Number: "number",
  String: "string",
  FusedNumber: "fusednumber",
  Enum: "enum",
  SegmentedEnum: "segmentedenum",
  Color: "color",
  Image: "image",
  ResponsiveImage: "responsiveimage",
  File: "file",
  ComponentInstance: "componentinstance",
  Slot: "slot",
  Array: "array",
  EventHandler: "eventhandler",
  Transition: "transition",
  BoxShadow: "boxshadow",
  Link: "link",
  Date: "date",
  Object: "object",
  Font: "font",
  Border: "border",
  Cursor: "cursor",
  Padding: "padding",
  BorderRadius: "borderradius",
  Gap: "gap",
  TrackingId: "trackingid",
} as const;

export type ControlType = (typeof ControlType)[keyof typeof ControlType];

const propertyControls = new WeakMap<object, UnknownProps>();

function isWeakKey(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

/** Records the controls so the playground can display them. */
export function addPropertyControls(component: unknown, controls: UnknownProps): void {
  if (isWeakKey(component)) propertyControls.set(component, controls);
}

/** Read the controls registered for a component (playground/tests only). */
export function getPropertyControls(component: unknown): UnknownProps | undefined {
  return isWeakKey(component) ? propertyControls.get(component) : undefined;
}

/* -------------------------------------------------------------------------- */
/* Render targets                                                             */
/* -------------------------------------------------------------------------- */

let staticRenderer = false;

/** Toggle the static-renderer state from tests or the playground. */
export function setStaticRenderer(value: boolean): void {
  staticRenderer = value;
}

export function isStaticRenderer(): boolean {
  return staticRenderer;
}

export function useIsStaticRenderer(): boolean {
  return isStaticRenderer();
}

export function useIsOnFramerCanvas(): boolean {
  return false;
}

export const RenderTarget = {
  canvas: "CANVAS",
  export: "EXPORT",
  thumbnail: "THUMBNAIL",
  preview: "PREVIEW",
  current: () => (staticRenderer ? "CANVAS" : "PREVIEW"),
  hasRestrictions: () => staticRenderer,
} as const;

/* -------------------------------------------------------------------------- */
/* Layout primitives                                                          */
/* -------------------------------------------------------------------------- */

const DOM_PROP = /^(data-|aria-)|^(className|id|role|title|tabIndex|hidden|on[A-Z])/;

/** Keep only props that React can safely render on a DOM element. */
function domProps(props: UnknownProps): UnknownProps {
  const output: UnknownProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (DOM_PROP.test(key)) output[key] = value;
  }
  return output;
}

type SizeValue = number | string | { width?: number | string; height?: number | string };

function expandSize(size: SizeValue | undefined): [SizeValue | undefined, SizeValue | undefined] {
  if (size === undefined) return [undefined, undefined];
  if (typeof size === "object") return [size.width, size.height];
  return [size, size];
}

export interface FrameProps {
  children?: ReactNode;
  style?: CSSProperties;
  size?: SizeValue;
  width?: number | string;
  height?: number | string;
  background?: string;
  radius?: number | string;
  padding?: number | string;
  visible?: boolean;
}

export const Frame = forwardRef<HTMLDivElement, FrameProps>(function Frame(
  { children, style, size, width, height, background, radius, padding, visible = true, ...rest },
  ref,
) {
  const [sizeWidth, sizeHeight] = expandSize(size);
  return (
    <div
      ref={ref}
      {...domProps({ ...rest })}
      style={{
        position: "relative",
        width: width ?? (typeof sizeWidth === "object" ? undefined : sizeWidth),
        height: height ?? (typeof sizeHeight === "object" ? undefined : sizeHeight),
        background,
        borderRadius: radius,
        padding,
        display: visible ? undefined : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
});

export interface StackProps {
  children?: ReactNode;
  style?: CSSProperties;
  size?: SizeValue;
  direction?: "row" | "column";
  gap?: number | string;
  align?: CSSProperties["alignItems"];
  distribution?: CSSProperties["justifyContent"];
  padding?: number | string;
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  {
    children,
    style,
    size,
    direction = "column",
    gap = 10,
    align = "center",
    distribution = "start",
    padding = 0,
    ...rest
  },
  ref,
) {
  const [sizeWidth, sizeHeight] = expandSize(size);
  return (
    <div
      ref={ref}
      {...domProps({ ...rest })}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: direction,
        alignItems: align,
        justifyContent: distribution,
        gap,
        width: typeof sizeWidth === "object" ? undefined : sizeWidth,
        height: typeof sizeHeight === "object" ? undefined : sizeHeight,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
});

export interface LinkProps {
  children?: ReactNode;
  style?: CSSProperties;
  href?: string;
  target?: string;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { children, style, href, ...rest },
  ref,
) {
  return (
    <a ref={ref} href={href} {...domProps({ ...rest })} style={{ position: "relative", ...style }}>
      {children}
    </a>
  );
});

/* -------------------------------------------------------------------------- */
/* Locale stubs                                                               */
/* -------------------------------------------------------------------------- */

export function useLocaleCode(): string {
  return "en-US";
}
