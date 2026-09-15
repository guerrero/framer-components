import type { ReactNode } from "react";

import FadeIn from "@/components/FadeIn";
import PillButton from "@/components/PillButton";
import { Frame, getPropertyControls } from "@/mock";
import { withHoverLift } from "@/overrides/withHoverLift";
import { withPointer } from "@/overrides/withPointer";

function DemoCard() {
  return (
    <Frame style={{ padding: 24, borderRadius: 16, backgroundColor: "#FEF3C7" }}>Hover me</Frame>
  );
}

const InteractiveCard = withPointer(withHoverLift(DemoCard));

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p style={{ margin: "4px 0 0", color: "#4b5563" }}>{description}</p>
      </header>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        {children}
      </div>
    </section>
  );
}

function controlType(control: unknown): string {
  if (
    typeof control === "object" &&
    control !== null &&
    "type" in control &&
    typeof control.type === "string"
  ) {
    return control.type;
  }
  return "unknown";
}

function ControlList({ component, name }: { component: unknown; name: string }) {
  const controls = getPropertyControls(component);

  if (!controls) return null;

  return (
    <div style={{ minWidth: 220 }}>
      <h3 style={{ margin: "0 0 8px" }}>{name}</h3>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {Object.entries(controls).map(([key, control]) => (
          <li key={key} style={{ marginBottom: 4 }}>
            <code>{key}</code> <small style={{ color: "#6b7280" }}>{controlType(control)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <main>
      <header>
        <h1 style={{ marginBottom: 4 }}>Framer components playground</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Components render locally against <code>src/mock</code>, which stands in for the Framer
          Framer runtime.
        </p>
      </header>

      <Section title="PillButton" description="Default props, custom props and disabled state.">
        <PillButton />
        <PillButton label="Custom label" tint="#111827" />
        <PillButton label="Disabled" disabled />
      </Section>

      <Section title="FadeIn" description="framer-motion reveal driven by a Slot control.">
        <FadeIn>
          <div style={{ padding: 24, borderRadius: 16, background: "#EEF2FF" }}>
            Scroll me into view
          </div>
        </FadeIn>
      </Section>

      <Section
        title="Overrides"
        description="withPointer(withHoverLift(DemoCard)) — hover the card."
      >
        <InteractiveCard />
      </Section>

      <Section
        title="Registered property controls"
        description="What the playground reads back from the mock."
      >
        <ControlList component={PillButton} name="PillButton" />
        <ControlList component={FadeIn} name="FadeIn" />
      </Section>
    </main>
  );
}
