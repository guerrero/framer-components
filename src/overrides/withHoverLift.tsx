import type { CSSProperties, ComponentType, MouseEvent } from "react";
import { forwardRef, useState } from "react";

interface LayerProps {
  style?: CSSProperties;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
}

/**
 * Lifts the layer while it is hovered.
 *
 * Overrides are detected by Framer from their TypeScript types, so the
 * returned value must be typed as `ComponentType`, and `forwardRef` keeps
 * links and effects working on the overridden layer.
 */
export function withHoverLift(Component: ComponentType<any>): ComponentType {
  return forwardRef<unknown, LayerProps>(function WithHoverLift(props, ref) {
    const [lifted, setLifted] = useState(false);

    return (
      <Component
        ref={ref}
        {...props}
        style={{
          ...props.style,
          transition: "transform 180ms ease",
          transform: lifted ? "translateY(-6px)" : props.style?.transform,
        }}
        onMouseEnter={(event: MouseEvent) => {
          setLifted(true);
          props.onMouseEnter?.(event);
        }}
        onMouseLeave={(event: MouseEvent) => {
          setLifted(false);
          props.onMouseLeave?.(event);
        }}
      />
    );
  });
}
