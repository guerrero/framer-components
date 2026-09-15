import type { CSSProperties, ComponentType } from "react";
import { forwardRef } from "react";

interface LayerProps {
  style?: CSSProperties;
}

/** Shows a pointer cursor while the layer is hovered. */
export function withPointer(Component: ComponentType<any>): ComponentType {
  return forwardRef<unknown, LayerProps>(function WithPointer(props, ref) {
    return <Component ref={ref} {...props} style={{ ...props.style, cursor: "pointer" }} />;
  });
}
