import { addPropertyControls, ControlType } from "framer";
import { type CSSProperties, type ReactNode } from "react";

interface TabItemProps {
  tabName?: string;
  content?: ReactNode;
  style?: CSSProperties;
}

/**
 * Named content item for the Tabs component.
 * Link instances of this component to Tabs → Content items.
 *
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 420
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function TabItem(props: TabItemProps) {
  const { tabName = "Tab", content, style } = props;

  return (
    <div
      data-tab-name={tabName}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
      }}
    >
      {content ?? (
        <div
          style={{
            width: "100%",
            height: "100%",
            minHeight: 180,
            display: "grid",
            placeItems: "center",
            border: "1px dashed #D7D7D1",
            borderRadius: 12,
            color: "#8A8A84",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            boxSizing: "border-box",
          }}
        >
          Link the content for “{tabName}”
        </div>
      )}
    </div>
  );
}

addPropertyControls(TabItem, {
  tabName: {
    type: ControlType.String,
    title: "Name",
    description: "This label is read automatically by Tabs.",
    defaultValue: "Tab",
  },
  content: {
    type: ControlType.Slot,
    title: "Content",
    maxCount: 1,
  },
});

TabItem.displayName = "Tab Item";
