import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer";
import { AnimatePresence, motion } from "framer-motion";
import {
  Children,
  isValidElement,
  startTransition,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

interface TabName {
  name: string;
}

interface WrapperStyle {
  fill: string;
  padding: string;
  gap: string;
  radius: string;
  borderWidth: number;
  borderColor: string;
}

interface TabStyle {
  font: any;
  padding: string;
  gap: string;
  radius: string;
  activeFill: string;
  activeText: string;
  inactiveFill: string;
  inactiveText: string;
  hoverFill: string;
  borderWidth: number;
  activeBorder: string;
  inactiveBorder: string;
}

interface PanelStyle {
  fill: string;
  padding: string;
  radius: string;
  overflow: "visible" | "hidden";
}

interface MotionState {
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  blur: number;
}

interface TabsProps {
  tabNames?: TabName[];
  label1?: string;
  label2?: string;
  label3?: string;
  label4?: string;
  label5?: string;
  label6?: string;
  label7?: string;
  label8?: string;
  label9?: string;
  label10?: string;
  label11?: string;
  label12?: string;
  contents?: ReactNode;
  initialTab?: number;
  alignment?: "start" | "center" | "end" | "stretch";
  contentGap?: string;
  tabWidth?: "hug" | "fill";
  animatePanels?: boolean;
  enterState?: MotionState;
  enterTransition?: Record<string, unknown>;
  exitState?: MotionState;
  exitTransition?: Record<string, unknown>;
  presenceMode?: "wait" | "sync";
  wrapperStyle?: WrapperStyle;
  tabStyle?: TabStyle;
  panelStyle?: PanelStyle;
  style?: CSSProperties;
}

const defaultNames: TabName[] = [{ name: "Tab 1" }, { name: "Tab 2" }, { name: "Tab 3" }];

const defaultWrapper: WrapperStyle = {
  fill: "#FFFFFF",
  padding: "4px",
  gap: "4px",
  radius: "999px",
  borderWidth: 1,
  borderColor: "#E7E7E2",
};

const defaultTab: TabStyle = {
  font: {
    fontFamily: "Inter",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "1em",
    letterSpacing: "-0.01em",
  },
  padding: "9px 14px",
  gap: "0px",
  radius: "999px",
  activeFill: "#23AC55",
  activeText: "#FFFFFF",
  inactiveFill: "rgba(255,255,255,0)",
  inactiveText: "#676762",
  hoverFill: "#F2F3EE",
  borderWidth: 0,
  activeBorder: "#23AC55",
  inactiveBorder: "rgba(0,0,0,0)",
};

const defaultPanel: PanelStyle = {
  fill: "rgba(255,255,255,0)",
  padding: "0px",
  radius: "0px",
  overflow: "visible",
};

const defaultEnter: MotionState = {
  opacity: 0,
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  blur: 0,
};

const defaultExit: MotionState = {
  opacity: 0,
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  blur: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getLinkedName(panel: ReactNode) {
  if (!isValidElement(panel)) return undefined;
  const panelProps: unknown = Reflect.get(panel, "props");
  if (!isRecord(panelProps)) return undefined;
  const candidates = [
    panelProps.tabName,
    panelProps.name,
    panelProps.title,
    panelProps["aria-label"],
  ];
  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );
}

function getManualName(tabNames: TabName[], index: number) {
  const name = tabNames[index]?.name;
  return typeof name === "string" && name.trim().length > 0 ? name.trim() : undefined;
}

const TAB_LABEL_KEYS: readonly (keyof TabsProps)[] = [
  "label1",
  "label2",
  "label3",
  "label4",
  "label5",
  "label6",
  "label7",
  "label8",
  "label9",
  "label10",
  "label11",
  "label12",
];

function getLabelOverride(props: TabsProps, index: number) {
  const key = TAB_LABEL_KEYS[index];
  const label = key ? props[key] : undefined;
  return typeof label === "string" && label.trim().length > 0 ? label.trim() : undefined;
}

function getLinkedItemCount(props: Partial<TabsProps>) {
  return Children.count(props.contents);
}

function motionValues(state: MotionState) {
  return {
    opacity: state.opacity,
    x: state.x,
    y: state.y,
    scale: state.scale,
    rotate: state.rotate,
    filter: `blur(${state.blur}px)`,
  };
}

/**
 * Accessible tabs with arbitrary Framer content slots.
 * The number of tabs follows the linked content items. A linked Tab Item can
 * provide its own name; manual names remain available as a fallback.
 *
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 480
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-auto
 */
export default function Tabs(props: TabsProps) {
  const {
    tabNames = defaultNames,
    contents,
    initialTab = 0,
    alignment = "center",
    contentGap = "24px",
    tabWidth = "hug",
    animatePanels = true,
    enterState = defaultEnter,
    enterTransition = { type: "spring", stiffness: 300, damping: 30 },
    exitState = defaultExit,
    exitTransition = { type: "tween", duration: 0.18, ease: "easeOut" },
    presenceMode = "wait",
    wrapperStyle = defaultWrapper,
    tabStyle = defaultTab,
    panelStyle = defaultPanel,
    style,
  } = props;

  const panels = Children.toArray(contents);
  const itemCount = panels.length > 0 ? panels.length : Math.max(tabNames.length, 1);
  const baseId = useId().replace(/:/g, "");
  const labels = Array.from({ length: itemCount }, (_, index) => ({
    id: `${baseId}-tab-${index}`,
    name:
      getLabelOverride(props, index) ??
      getLinkedName(panels[index]) ??
      getManualName(tabNames, index) ??
      `Tab ${index + 1}`,
  }));
  const maximumIndex = Math.max(0, labels.length - 1);
  const clampedInitial = Math.min(Math.max(0, initialTab), maximumIndex);
  const [activeIndex, setActiveIndex] = useState(clampedInitial);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isStatic = useIsStaticRenderer();

  useEffect(() => {
    const nextIndex = Math.min(Math.max(0, initialTab), maximumIndex);
    startTransition(() => setActiveIndex(nextIndex));
  }, [initialTab, maximumIndex]);

  function selectTab(index: number, focus = false) {
    const nextIndex = Math.min(Math.max(0, index), maximumIndex);
    startTransition(() => {
      setActiveIndex(nextIndex);
    });
    if (focus && typeof window !== "undefined") {
      window.requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus());
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (activeIndex + 1) % labels.length;
    if (event.key === "ArrowLeft") nextIndex = (activeIndex - 1 + labels.length) % labels.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = labels.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    selectTab(nextIndex, true);
  }

  const justifyContent =
    alignment === "start" ? "flex-start" : alignment === "end" ? "flex-end" : "center";

  const wrapper = { ...defaultWrapper, ...wrapperStyle };
  const tab = { ...defaultTab, ...tabStyle };
  const panel = { ...defaultPanel, ...panelStyle };
  const currentPanel = panels[activeIndex];

  const initialMotion = motionValues({ ...defaultEnter, ...enterState });
  const exitMotion = motionValues({ ...defaultExit, ...exitState });
  const animateMotion = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
    filter: "blur(0px)",
  };

  const panelContent = currentPanel ?? (
    <div
      style={{
        minHeight: 180,
        display: "grid",
        placeItems: "center",
        color: "#8A8A84",
        border: "1px dashed #D7D7D1",
        borderRadius: 12,
        fontFamily: "Inter, sans-serif",
        fontSize: 13,
      }}
    >
      Add content to slot {activeIndex + 1}
    </div>
  );

  return (
    <div
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: contentGap,
      }}
    >
      <div style={{ display: "flex", width: "100%", justifyContent }}>
        <div
          role="tablist"
          aria-label="Content tabs"
          style={{
            display: "flex",
            width: alignment === "stretch" || tabWidth === "fill" ? "100%" : "fit-content",
            maxWidth: "100%",
            overflowX: "auto",
            scrollbarWidth: "none",
            background: wrapper.fill,
            padding: wrapper.padding,
            gap: wrapper.gap,
            borderRadius: wrapper.radius,
            border: `${wrapper.borderWidth}px solid ${wrapper.borderColor}`,
            boxSizing: "border-box",
          }}
        >
          {labels.map((item, index) => {
            const isActive = index === activeIndex;
            const isHovered = index === hoveredIndex;
            return (
              <button
                key={item.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                id={item.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`${baseId}-panel-${index}`}
                tabIndex={isActive ? 0 : -1}
                onClick={isStatic ? undefined : () => selectTab(index)}
                onKeyDown={isStatic ? undefined : handleKeyDown}
                onMouseEnter={isStatic ? undefined : () => setHoveredIndex(index)}
                onMouseLeave={isStatic ? undefined : () => setHoveredIndex(null)}
                style={{
                  ...tab.font,
                  flex: tabWidth === "fill" ? "1 1 0" : "0 0 auto",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: tab.gap,
                  padding: tab.padding === "0px" ? "9px 14px" : tab.padding,
                  borderRadius: tab.radius,
                  border: `${tab.borderWidth}px solid ${isActive ? tab.activeBorder : tab.inactiveBorder}`,
                  background: isActive
                    ? tab.activeFill
                    : isHovered
                      ? tab.hoverFill
                      : tab.inactiveFill,
                  color: isActive ? tab.activeText : tab.inactiveText,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                  transition:
                    "background-color 160ms ease, color 160ms ease, border-color 160ms ease",
                  boxSizing: "border-box",
                }}
              >
                {item.name || `Tab ${index + 1}`}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`${baseId}-panel-${activeIndex}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeIndex}`}
        tabIndex={0}
        style={{
          position: "relative",
          width: "100%",
          minHeight: 0,
          flex: "1 1 auto",
          background: panel.fill,
          padding: panel.padding,
          borderRadius: panel.radius,
          overflow: panel.overflow,
          boxSizing: "border-box",
        }}
      >
        {isStatic || !animatePanels ? (
          <div style={{ width: "100%", height: "100%" }}>{panelContent}</div>
        ) : (
          <AnimatePresence mode={presenceMode} initial={false}>
            <motion.div
              key={activeIndex}
              initial={initialMotion}
              animate={{ ...animateMotion, transition: enterTransition }}
              exit={{ ...exitMotion, transition: exitTransition }}
              style={{ width: "100%", height: "100%" }}
            >
              {panelContent}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

addPropertyControls(Tabs, {
  tabNames: {
    type: ControlType.Array,
    title: "Tab names",
    description: "Fallback labels for linked layers that are not Tab Item instances.",
    hidden: true,
    control: {
      type: ControlType.Object,
      controls: {
        name: {
          type: ControlType.String,
          title: "Name",
          defaultValue: "Tab",
        },
      },
    },
    defaultValue: defaultNames,
    maxCount: 12,
  },
  contents: {
    type: ControlType.Slot,
    title: "Content items",
    description:
      "The linked item count defines the number of tabs. Use Tab Item for automatic names.",
    maxCount: 12,
  },
  label1: {
    type: ControlType.String,
    title: "Label 1",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 1,
  },
  label2: {
    type: ControlType.String,
    title: "Label 2",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 2,
  },
  label3: {
    type: ControlType.String,
    title: "Label 3",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 3,
  },
  label4: {
    type: ControlType.String,
    title: "Label 4",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 4,
  },
  label5: {
    type: ControlType.String,
    title: "Label 5",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 5,
  },
  label6: {
    type: ControlType.String,
    title: "Label 6",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 6,
  },
  label7: {
    type: ControlType.String,
    title: "Label 7",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 7,
  },
  label8: {
    type: ControlType.String,
    title: "Label 8",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 8,
  },
  label9: {
    type: ControlType.String,
    title: "Label 9",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 9,
  },
  label10: {
    type: ControlType.String,
    title: "Label 10",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 10,
  },
  label11: {
    type: ControlType.String,
    title: "Label 11",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 11,
  },
  label12: {
    type: ControlType.String,
    title: "Label 12",
    defaultValue: "",
    placeholder: "Automatic",
    hidden: (props) => getLinkedItemCount(props) < 12,
  },
  initialTab: {
    type: ControlType.Number,
    title: "Initial tab",
    defaultValue: 0,
    min: 0,
    max: 11,
    step: 1,
    displayStepper: true,
  },
  alignment: {
    type: ControlType.Enum,
    title: "Alignment",
    options: ["start", "center", "end", "stretch"],
    optionTitles: ["Start", "Center", "End", "Stretch"],
    defaultValue: "center",
    displaySegmentedControl: true,
  },
  contentGap: {
    type: ControlType.Gap,
    title: "Content gap",
    defaultValue: "24px",
  },
  tabWidth: {
    type: ControlType.Enum,
    title: "Tab width",
    options: ["hug", "fill"],
    optionTitles: ["Hug", "Fill"],
    defaultValue: "hug",
    displaySegmentedControl: true,
  },
  animatePanels: {
    type: ControlType.Boolean,
    title: "Animate",
    defaultValue: true,
  },
  enterState: {
    type: ControlType.Object,
    title: "Enter from",
    icon: "effect",
    controls: {
      opacity: {
        type: ControlType.Number,
        title: "Opacity",
        defaultValue: 0,
        min: 0,
        max: 1,
        step: 0.01,
      },
      x: { type: ControlType.Number, title: "X", defaultValue: 0, min: -400, max: 400, unit: "px" },
      y: { type: ControlType.Number, title: "Y", defaultValue: 0, min: -400, max: 400, unit: "px" },
      scale: {
        type: ControlType.Number,
        title: "Scale",
        defaultValue: 1,
        min: 0,
        max: 2,
        step: 0.01,
      },
      rotate: {
        type: ControlType.Number,
        title: "Rotate",
        defaultValue: 0,
        min: -180,
        max: 180,
        unit: "deg",
      },
      blur: {
        type: ControlType.Number,
        title: "Blur",
        defaultValue: 0,
        min: 0,
        max: 40,
        unit: "px",
      },
    },
    defaultValue: defaultEnter,
    hidden: ({ animatePanels }) => !animatePanels,
  },
  enterTransition: {
    type: ControlType.Transition,
    title: "Enter transition",
    defaultValue: { type: "spring", stiffness: 300, damping: 30 },
    hidden: ({ animatePanels }) => !animatePanels,
  },
  exitState: {
    type: ControlType.Object,
    title: "Exit to",
    icon: "effect",
    controls: {
      opacity: {
        type: ControlType.Number,
        title: "Opacity",
        defaultValue: 0,
        min: 0,
        max: 1,
        step: 0.01,
      },
      x: { type: ControlType.Number, title: "X", defaultValue: 0, min: -400, max: 400, unit: "px" },
      y: { type: ControlType.Number, title: "Y", defaultValue: 0, min: -400, max: 400, unit: "px" },
      scale: {
        type: ControlType.Number,
        title: "Scale",
        defaultValue: 1,
        min: 0,
        max: 2,
        step: 0.01,
      },
      rotate: {
        type: ControlType.Number,
        title: "Rotate",
        defaultValue: 0,
        min: -180,
        max: 180,
        unit: "deg",
      },
      blur: {
        type: ControlType.Number,
        title: "Blur",
        defaultValue: 0,
        min: 0,
        max: 40,
        unit: "px",
      },
    },
    defaultValue: defaultExit,
    hidden: ({ animatePanels }) => !animatePanels,
  },
  exitTransition: {
    type: ControlType.Transition,
    title: "Exit transition",
    defaultValue: { type: "tween", duration: 0.18, ease: "easeOut" },
    hidden: ({ animatePanels }) => !animatePanels,
  },
  presenceMode: {
    type: ControlType.Enum,
    title: "Timing",
    options: ["wait", "sync"],
    optionTitles: ["Exit, then enter", "Together"],
    defaultValue: "wait",
    hidden: ({ animatePanels }) => !animatePanels,
  },
  wrapperStyle: {
    type: ControlType.Object,
    title: "Wrapper",
    controls: {
      fill: { type: ControlType.Color, title: "Fill", defaultValue: defaultWrapper.fill },
      padding: {
        type: ControlType.Padding,
        title: "Padding",
        defaultValue: defaultWrapper.padding,
      },
      gap: { type: ControlType.Gap, title: "Gap", defaultValue: defaultWrapper.gap },
      radius: {
        type: ControlType.BorderRadius,
        title: "Radius",
        defaultValue: defaultWrapper.radius,
      },
      borderWidth: {
        type: ControlType.Number,
        title: "Border",
        defaultValue: defaultWrapper.borderWidth,
        min: 0,
        max: 12,
        unit: "px",
      },
      borderColor: {
        type: ControlType.Color,
        title: "Border color",
        defaultValue: defaultWrapper.borderColor,
      },
    },
    defaultValue: defaultWrapper,
  },
  tabStyle: {
    type: ControlType.Object,
    title: "Tabs",
    controls: {
      font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: defaultTab.font,
      },
      padding: { type: ControlType.Padding, title: "Padding", defaultValue: defaultTab.padding },
      gap: { type: ControlType.Gap, title: "Gap", defaultValue: defaultTab.gap },
      radius: { type: ControlType.BorderRadius, title: "Radius", defaultValue: defaultTab.radius },
      activeFill: {
        type: ControlType.Color,
        title: "Active fill",
        defaultValue: defaultTab.activeFill,
      },
      activeText: {
        type: ControlType.Color,
        title: "Active text",
        defaultValue: defaultTab.activeText,
      },
      inactiveFill: {
        type: ControlType.Color,
        title: "Inactive fill",
        defaultValue: defaultTab.inactiveFill,
      },
      inactiveText: {
        type: ControlType.Color,
        title: "Inactive text",
        defaultValue: defaultTab.inactiveText,
      },
      hoverFill: {
        type: ControlType.Color,
        title: "Hover fill",
        defaultValue: defaultTab.hoverFill,
      },
      borderWidth: {
        type: ControlType.Number,
        title: "Border",
        defaultValue: defaultTab.borderWidth,
        min: 0,
        max: 12,
        unit: "px",
      },
      activeBorder: {
        type: ControlType.Color,
        title: "Active border",
        defaultValue: defaultTab.activeBorder,
      },
      inactiveBorder: {
        type: ControlType.Color,
        title: "Inactive border",
        defaultValue: defaultTab.inactiveBorder,
      },
    },
    defaultValue: defaultTab,
  },
  panelStyle: {
    type: ControlType.Object,
    title: "Panel",
    controls: {
      fill: { type: ControlType.Color, title: "Fill", defaultValue: defaultPanel.fill },
      padding: { type: ControlType.Padding, title: "Padding", defaultValue: defaultPanel.padding },
      radius: {
        type: ControlType.BorderRadius,
        title: "Radius",
        defaultValue: defaultPanel.radius,
      },
      overflow: {
        type: ControlType.Enum,
        title: "Overflow",
        options: ["visible", "hidden"],
        optionTitles: ["Visible", "Hidden"],
        defaultValue: defaultPanel.overflow,
        displaySegmentedControl: true,
      },
    },
    defaultValue: defaultPanel,
  },
});

Tabs.displayName = "Tabs";
