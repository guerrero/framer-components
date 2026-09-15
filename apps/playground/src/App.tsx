import type { ComponentType, ReactNode } from "react";

import FadeIn from "@/components/FadeIn";
import FeatureScroll from "@/components/FeatureScroll";
import PillButton from "@/components/PillButton";
import SlideshowCMS from "@/components/SlideshowCMS";
import TabItem from "@/components/TabItem";
import Tabs from "@/components/Tabs";
import { Frame, getPropertyControls } from "@/mock";
import { withHoverLift } from "@/overrides/withHoverLift";
import { withNavbarScrollVariant } from "@/overrides/withNavbarScrollVariant";
import { withPointer } from "@/overrides/withPointer";

function DemoCard() {
  return (
    <Frame style={{ padding: 24, borderRadius: 16, backgroundColor: "#FEF3C7" }}>Hover me</Frame>
  );
}

const InteractiveCard = withPointer(withHoverLift(DemoCard));

function NavbarProbe({ variant }: { variant?: string }) {
  return (
    <Frame style={{ padding: 16, borderRadius: 12, backgroundColor: "#E0E7FF" }}>
      Navbar variant: {variant ?? "unset"} (scroll the page)
    </Frame>
  );
}

const ScrollNavbarProbe: ComponentType<{ variant?: string }> = withNavbarScrollVariant(NavbarProbe);

const demoSlides = [
  { title: "Paperwork", description: "Handles your paperwork." },
  { title: "In the loop", description: "Always up to date." },
];

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

      <Section title="Tabs" description="TabItem layers linked through the Content items slot.">
        <div style={{ height: 320, width: "100%" }}>
          <Tabs
            contents={[
              <TabItem
                key="first"
                tabName="First"
                content={
                  <div style={{ padding: 24, borderRadius: 16, background: "#F2F3EE" }}>
                    First panel
                  </div>
                }
              />,
              <TabItem
                key="second"
                tabName="Second"
                content={
                  <div style={{ padding: 24, borderRadius: 16, background: "#FFF7DB" }}>
                    Second panel
                  </div>
                }
              />,
            ]}
          />
        </div>
      </Section>

      <Section title="FeatureScroll" description="Scroll-driven feature cards (static preview).">
        <div style={{ width: "100%" }}>
          <FeatureScroll slides={demoSlides} />
        </div>
      </Section>

      <Section title="SlideshowCMS" description="Carousel over connected collection items.">
        <div style={{ width: "100%", maxWidth: 640 }}>
          <SlideshowCMS>
            {["#F2F3EE", "#FFF7DB", "#EEF2FF"].map((fill, index) => (
              <div
                key={fill}
                style={{
                  padding: 48,
                  borderRadius: 24,
                  background: fill,
                  textAlign: "center",
                }}
              >
                Slide {index + 1}
              </div>
            ))}
          </SlideshowCMS>
        </div>
      </Section>

      <Section
        title="Overrides"
        description="withPointer(withHoverLift(DemoCard)) — hover the card."
      >
        <InteractiveCard />
      </Section>

      <Section
        title="Navbar scroll variant"
        description="withNavbarScrollVariant(NavbarProbe) — scroll the page past 1px."
      >
        <ScrollNavbarProbe variant="Desktop" />
      </Section>

      <Section
        title="Registered property controls"
        description="What the playground reads back from the mock."
      >
        <ControlList component={PillButton} name="PillButton" />
        <ControlList component={FadeIn} name="FadeIn" />
        <ControlList component={Tabs} name="Tabs" />
        <ControlList component={TabItem} name="Tab Item" />
        <ControlList component={FeatureScroll} name="Feature Scroll" />
        <ControlList component={SlideshowCMS} name="CMS Slideshow" />
      </Section>
    </main>
  );
}
