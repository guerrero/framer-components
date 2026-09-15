import { addPropertyControls, ControlType } from "framer";

interface PillButtonProps {
  /** Text shown inside the button. */
  label?: string;
  /** Background color. */
  tint?: string;
  /** Label color. */
  textColor?: string;
  /** Corner radius. */
  radius?: number;
  /** Disables interaction and lowers opacity. */
  disabled?: boolean;
}

/**
 * A minimal, accessible button.
 *
 * @framerSupportedLayoutWidth auto-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function PillButton({
  label = "Click me",
  tint = "#0055FF",
  textColor = "#FFFFFF",
  radius = 999,
  disabled = false,
}: PillButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        appearance: "none",
        border: "none",
        borderRadius: radius,
        backgroundColor: tint,
        color: textColor,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        font: "600 16px/1.2 system-ui, sans-serif",
        opacity: disabled ? 0.5 : 1,
        padding: "12px 22px",
      }}
    >
      {label}
    </button>
  );
}

addPropertyControls(PillButton, {
  label: {
    type: ControlType.String,
    title: "Label",
    defaultValue: "Click me",
  },
  tint: {
    type: ControlType.Color,
    title: "Tint",
    defaultValue: "#0055FF",
  },
  textColor: {
    type: ControlType.Color,
    title: "Text Color",
    defaultValue: "#FFFFFF",
  },
  radius: {
    type: ControlType.Number,
    title: "Radius",
    defaultValue: 999,
    min: 0,
    max: 999,
    step: 1,
  },
  disabled: {
    type: ControlType.Boolean,
    title: "Disabled",
    defaultValue: false,
  },
});
