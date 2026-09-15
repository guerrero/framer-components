import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer";
import * as React from "react";

type Slide = {
  id?: string;
  title: string;
  description: string;
  image?: { src: string; alt?: string };
  video?: string;
  link?: string;
  label?: string;
  tag?: string;
};
interface Props {
  slides?: Slide[];
  titleSlot?: React.ReactNode;
  descriptionSlot?: React.ReactNode;
  linkSlot?: React.ReactNode;
  tagSlot?: React.ReactNode;
  padding?: string;
  background?: string;
  style?: React.CSSProperties;
}
const slidesDefault: Slide[] = [
  {
    title: "Paperwork handled",
    description:
      "Handling enrollments, converting payments to EFTs, and posting them automatically, without delay.",
  },
  {
    title: "Keeps you in the loop",
    description:
      "Watch each step complete, asking for your input when needed on the most complex issues.",
  },
  {
    title: "And answers your questions",
    description:
      "Got a question about a claim? Want to see how your week is tracking? Help is always ready.",
  },
];

// Existing default cards receive new IDs when Framer updates their array.
// Keep their original media until a poster or video is explicitly supplied.
const migratedMedia: Record<string, number> = { spgnEg55z: 0, RS99SMLBe: 1, FbGbsPsKm: 2 };
const clamp = (v: number) => Math.max(0, Math.min(1, v));
// Props of a natively-styled Framer template element reached through a slot.
// Known fields are typed; any other runtime control key stays accessible.
interface TemplateElementProps {
  style?: React.CSSProperties;
  children?: React.ReactNode;
  [key: string]: unknown;
}
interface TemplateControlDefinition {
  type?: string;
  title?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/**
 * Reads `propertyControls` from a canvas slot's element type. Framer classes
 * and wrappers keep the control map on the component itself or on its
 * `type`/`render` members; each definition is validated before use because the
 * slot's runtime shape is not part of the public types.
 */
function readControlDefinitions(
  source: unknown,
): Record<string, TemplateControlDefinition> | undefined {
  if (source === null || (typeof source !== "object" && typeof source !== "function"))
    return undefined;
  const raw: unknown = Reflect.get(source, "propertyControls");
  if (!isRecord(raw)) return undefined;
  const controls: Record<string, TemplateControlDefinition> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    controls[key] = {
      ...(typeof value.type === "string" ? { type: value.type } : {}),
      ...(typeof value.title === "string" ? { title: value.title } : {}),
    };
  }
  return controls;
}
// A native Framer template exposes a string variable named Text. Its public
// property control supplies the runtime key, so the saved text style stays native.
function textTemplate(slot: React.ReactNode, text: string, variant: string): React.ReactNode {
  return React.Children.map(slot, (child) => {
    if (!React.isValidElement<TemplateElementProps>(child)) return child;
    // Canvas templates expose their string variable through
    // `propertyControls`; a different shape yields no key and the text is
    // passed as plain props.
    const controls = readControlDefinitions(child.type) ?? {};
    const key = Object.keys(controls).find(
      (k) =>
        controls[k]?.type === ControlType.String && (controls[k]?.title === "Text" || k === "text"),
    );
    const props: TemplateElementProps = {
      variant,
      style: { ...child.props.style, width: "100%", height: "auto", maxWidth: "100%" },
    };
    if (key) props[key] = text;
    else {
      props.text = text;
      props.GjNmVrQu0 = text;
      props.MfbGWMPFc = text;
    }
    if (child.props.children) props.children = textTemplate(child.props.children, text, variant);
    return React.cloneElement(child, props);
  });
}

// Resolve the exposed Label and Link controls on a connected native component.
// Canvas slots may wrap it in layout elements, so preserve and traverse children.
function labelTemplate(slot: React.ReactNode, label: string, link?: string): React.ReactNode {
  return React.Children.map(slot, (child) => {
    if (!React.isValidElement<TemplateElementProps>(child)) return child;
    // Connected native components expose Label/Link on the component itself
    // or on its type/render wrappers; a different shape only yields no key.
    const definition: unknown = child.type;
    const controls: Record<string, TemplateControlDefinition> =
      readControlDefinitions(definition) ??
      readControlDefinitions(isRecord(definition) ? definition.type : undefined) ??
      readControlDefinitions(isRecord(definition) ? definition.render : undefined) ??
      {};
    const find = (name: string) =>
      Object.keys(controls).find((key) => (controls[key]?.title || key).toLowerCase() === name);
    const props: TemplateElementProps = {};
    if (typeof child.type !== "string") {
      props[find("label") || "label"] = label;
      if (link !== undefined) props[find("link") || "link"] = link;
    }
    if (child.props.children) props.children = labelTemplate(child.props.children, label, link);
    return React.cloneElement(child, props);
  });
}
const css = `
.ph-features,.ph-features *{box-sizing:border-box}
.ph-features{container-type:inline-size;isolation:isolate;-webkit-font-smoothing:antialiased;--stage-height:600px}
.ph-feature-track{position:relative;height:calc(var(--stage-height) + var(--travel))}
.ph-feature-stage{position:sticky;top:max(24px,calc((100svh - var(--stage-height))/2));width:100%;height:var(--stage-height)}
.ph-feature-layer{position:absolute;inset:0;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:16px;align-items:center}
.ph-feature-copy{grid-column:1/span 2;min-width:0;padding-right:40px;align-self:center;display:flex;flex-direction:column;gap:21px}
.ph-feature-tag{align-self:flex-start;max-width:100%}
.ph-features[data-compact=true] .ph-feature-tag{align-self:center}
.ph-feature-copy[data-tagged=true]{gap:16px}
.ph-feature-copy[data-tagged=true] .ph-feature-link,.ph-feature-copy[data-tagged=true] .ph-feature-link-slot{margin-top:16px}
.ph-feature-title,.ph-feature-body{width:100%;min-width:0}
.ph-feature-title{max-width:269px}
.ph-feature-body{max-width:238px}
.ph-feature-title h3.ph-fallback{margin:0;font:500 20px/1.3 "Alpes Unlicensed Trial",Arial,sans-serif;letter-spacing:-.6px}
.ph-feature-body p.ph-fallback{margin:0;font:400 16px/1.3 "ABC Otto Trial",Georgia,serif;letter-spacing:-.48px}
.ph-feature-title [data-framer-component-type="RichTextContainer"] *, .ph-feature-body [data-framer-component-type="RichTextContainer"] *{text-align:left!important}
.ph-feature-link{align-self:flex-start;margin-top:11px;font:500 14px/1.3 "Alpes Unlicensed Trial",Arial,sans-serif;letter-spacing:-.42px;color:inherit;text-decoration:none;padding:0}
.ph-feature-link-slot{align-self:flex-start;max-width:100%;margin-top:11px}
.ph-features[data-compact=true] .ph-feature-link-slot{align-self:center;margin-top:8px}
.ph-feature-link:hover{text-decoration:underline;text-underline-offset:4px}
.ph-feature-link:focus-visible{outline:2px solid currentColor;outline-offset:5px;border-radius:2px}
.ph-feature-media{grid-column:3/span 4;grid-row:1;width:100%;aspect-ratio:1.35;position:relative;overflow:hidden;border-radius:48px;background:transparent}
.ph-feature-media img,.ph-feature-media video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
 .ph-features[data-compact=true] .ph-feature-layer{display:flex;flex-direction:column;justify-content:center;gap:32px}
 .ph-features[data-compact=true] .ph-feature-copy{width:100%;max-width:320px;padding:0;gap:16px;align-items:center;text-align:center}
 .ph-features[data-compact=true] .ph-feature-title{max-width:234px}
 .ph-features[data-compact=true] .ph-feature-body{max-width:188px}
 .ph-features[data-compact=true] .ph-feature-title [data-framer-component-type="RichTextContainer"] *, .ph-features[data-compact=true] .ph-feature-body [data-framer-component-type="RichTextContainer"] *{text-align:center!important}
 .ph-features[data-compact=true] .ph-feature-body p.ph-fallback{line-height:1.6}
 .ph-features[data-compact=true] .ph-feature-link{align-self:center;margin-top:8px}
 .ph-features[data-compact=true] .ph-feature-media{width:100%;max-width:640px;flex-shrink:0;border-radius:32px}

@container(max-width:500px){.ph-feature-media{border-radius:24px}}
.ph-features[data-static=true] .ph-feature-track{height:var(--stage-height)}
.ph-features[data-static=true] .ph-feature-stage{position:relative;top:0}
.ph-features[data-reduced=true] .ph-feature-track,.ph-features[data-reduced=true] .ph-feature-stage{height:auto}
.ph-features[data-reduced=true] .ph-feature-stage{position:relative;top:0;display:grid;gap:80px}
.ph-features[data-reduced=true] .ph-feature-layer{position:relative;opacity:1!important;visibility:visible!important;transform:none!important}
`;
/**
 * @framerIntrinsicWidth 1440
 * @framerIntrinsicHeight 650
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function FeatureScroll({
  slides = slidesDefault,
  titleSlot,
  descriptionSlot,
  linkSlot,
  tagSlot,
  padding = "64px",
  background = "#F9F8F5",
  style,
}: Props) {
  const root = React.useRef<HTMLElement>(null);
  const track = React.useRef<HTMLDivElement>(null);
  const stage = React.useRef<HTMLDivElement>(null);
  const isStatic = useIsStaticRenderer();
  const [reduced, setReduced] = React.useState(false);
  const [compact, setCompact] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  React.useEffect(() => {
    const el = root.current,
      tr = track.current,
      st = stage.current;
    if (!el || !tr || !st) return undefined;
    const layers = Array.from(st.querySelectorAll<HTMLElement>(".ph-feature-layer"));
    const videos = layers.map((l) => l.querySelector<HTMLVideoElement>("video"));
    let raf = 0,
      last = 0,
      current = 0,
      target = 0,
      visible = true;
    const render = (progress: number) => {
      const position = progress * Math.max(1, layers.length - 1);
      const index = Math.min(layers.length - 1, Math.floor(position));
      const blend = clamp((position - index - 0.6) / 0.4);
      const eased = blend * blend * (3 - 2 * blend);
      const active = eased > 0.5 ? Math.min(index + 1, layers.length - 1) : index;
      layers.forEach((l, i) => {
        const opacity = reduced ? 1 : i === index ? 1 - eased : i === index + 1 ? eased : 0;
        l.style.opacity = String(opacity);
        l.style.visibility = opacity > 0 ? "visible" : "hidden";
        l.style.transform = reduced
          ? "none"
          : `translate3d(0,${i === index ? -24 * eased : 24 * (1 - eased)}px,0)`;
        const interactive = reduced || i === active;
        l.style.pointerEvents = interactive ? "auto" : "none";
        l.setAttribute("aria-hidden", String(!interactive));
        l.querySelectorAll<HTMLAnchorElement>("a").forEach(
          (a) => (a.tabIndex = interactive ? 0 : -1),
        );
        const video = videos[i];
        if (video) {
          if (i === active && visible && !isStatic && !reduced) {
            if (video.paused) video.play().catch(() => {});
          } else video.pause();
        }
      });
    };
    const tick = (t: number) => {
      const dt = last ? Math.min(t - last, 64) : 16;
      last = t;
      current += (target - current) * (1 - Math.exp(-dt / 80));
      if (Math.abs(target - current) < 0.0001) current = target;
      render(current);
      raf = current !== target ? requestAnimationFrame(tick) : 0;
    };
    const measure = () => {
      const fullWidth = Math.abs(el.clientWidth - document.documentElement.clientWidth) < 1;
      setCompact(
        el.getBoundingClientRect().width +
          (fullWidth ? window.innerWidth - document.documentElement.clientWidth : 0) <
          1200,
      );
      const height = Math.max(
        ...layers.map((l) => {
          const media = l.querySelector<HTMLElement>(".ph-feature-media");
          const copy = l.querySelector<HTMLElement>(".ph-feature-copy");
          const stacked = getComputedStyle(l).display === "flex";
          return stacked
            ? (media?.offsetHeight || 0) + (copy?.offsetHeight || 0) + 32
            : Math.max(media?.offsetHeight || 0, copy?.offsetHeight || 0);
        }),
        0,
      );
      el.style.setProperty("--stage-height", `${Math.ceil(height + 32)}px`);
      const sticky = Math.max(24, (window.innerHeight - st.clientHeight) / 2);
      target =
        isStatic || reduced || layers.length <= 1
          ? 0
          : clamp(
              (sticky - tr.getBoundingClientRect().top) /
                Math.max(1, tr.clientHeight - st.clientHeight),
            );
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    layers.forEach((l) => {
      const c = l.querySelector(".ph-feature-copy");
      const m = l.querySelector(".ph-feature-media");
      if (c) ro.observe(c);
      if (m) ro.observe(m);
    });
    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (!first) return;
      visible = first.isIntersecting;
      if (!visible) videos.forEach((v) => v?.pause());
      else measure();
    });
    io.observe(el);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      videos.forEach((v) => v?.pause());
    };
  }, [slides, isStatic, reduced, titleSlot, descriptionSlot, linkSlot, tagSlot]);
  if (!slides.length) return null;
  return (
    <section
      ref={root}
      className="ph-features"
      aria-label="Product features"
      data-static={isStatic || slides.length === 1}
      data-reduced={reduced}
      data-compact={compact}
      style={
        {
          ...style,
          position: "relative",
          width: "100%",
          height: "auto",
          padding,
          background,
          color: "#10181C",
          "--travel": `${Math.max(0, slides.length - 1) * 90}svh`,
        } as React.CSSProperties
      }
    >
      <style>{css}</style>
      <div className="ph-feature-track" ref={track}>
        <div className="ph-feature-stage" ref={stage}>
          {slides.map((item, i) => {
            const fallbackMediaIndex = item.id?.startsWith("default-item-")
              ? Number(item.id.slice(13))
              : item.id !== undefined && item.id in migratedMedia
                ? migratedMedia[item.id]
                : undefined;
            const fallback =
              fallbackMediaIndex === undefined ? undefined : slidesDefault[fallbackMediaIndex];
            const slide = {
              ...item,
              image: item.image?.src ? item.image : fallback?.image,
              video: item.video ?? (item.image?.src ? undefined : fallback?.video),
            };
            return (
              <article
                key={item.id || i}
                className="ph-feature-layer"
                aria-hidden={i !== 0}
                style={{
                  opacity: i === 0 ? 1 : 0,
                  visibility: i === 0 ? "visible" : "hidden",
                  pointerEvents: i === 0 ? "auto" : "none",
                }}
              >
                <div className="ph-feature-copy" data-tagged={Boolean(slide.tag?.trim())}>
                  {slide.tag?.trim() && (
                    <div className="ph-feature-tag">
                      {React.Children.count(tagSlot) ? (
                        labelTemplate(tagSlot, slide.tag)
                      ) : (
                        <span>{slide.tag}</span>
                      )}
                    </div>
                  )}
                  <div className="ph-feature-title">
                    {React.Children.count(titleSlot) ? (
                      textTemplate(titleSlot, slide.title, compact ? "RoPNo050Q" : "rcGbsF4NI")
                    ) : (
                      <h3 className="ph-fallback">{slide.title}</h3>
                    )}
                  </div>
                  <div className="ph-feature-body">
                    {React.Children.count(descriptionSlot) ? (
                      textTemplate(
                        descriptionSlot,
                        slide.description,
                        compact ? "L8zJDJinP" : "NWe2vN8MN",
                      )
                    ) : (
                      <p className="ph-fallback">{slide.description}</p>
                    )}
                  </div>
                  {slide.link &&
                    (React.Children.count(linkSlot) ? (
                      <div className="ph-feature-link-slot">
                        {labelTemplate(linkSlot, slide.label ?? "Discover more →", slide.link)}
                      </div>
                    ) : (
                      <a className="ph-feature-link" href={slide.link} tabIndex={i === 0 ? 0 : -1}>
                        {slide.label ?? "Discover more →"}
                      </a>
                    ))}
                </div>
                <div className="ph-feature-media">
                  {slide.image?.src && (
                    <img src={slide.image.src} alt={slide.image.alt || slide.title} />
                  )}{" "}
                  {slide.video && (
                    <video
                      src={slide.video}
                      muted
                      playsInline
                      loop
                      preload="metadata"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
FeatureScroll.displayName = "Feature Scroll";
addPropertyControls(FeatureScroll, {
  slides: {
    type: ControlType.Array,
    title: "Cards",
    defaultValue: slidesDefault,
    control: {
      type: ControlType.Object,
      controls: {
        tag: { type: ControlType.String, title: "Tag", defaultValue: "" },
        title: { type: ControlType.String, title: "Title" },
        description: { type: ControlType.String, title: "Description", displayTextArea: true },
        image: { type: ControlType.ResponsiveImage, title: "Poster" },
        video: { type: ControlType.File, title: "Video", allowedFileTypes: ["mp4", "webm"] },
        link: { type: ControlType.Link, title: "Link" },
        label: { type: ControlType.String, title: "Label", defaultValue: "Discover more →" },
      },
    },
  },
  titleSlot: { type: ControlType.Slot, title: "Title template", maxCount: 1 },
  descriptionSlot: { type: ControlType.Slot, title: "Body template", maxCount: 1 },
  linkSlot: { type: ControlType.Slot, title: "Link template", maxCount: 1 },
  tagSlot: { type: ControlType.Slot, title: "Tag template", maxCount: 1 },
  padding: { type: ControlType.Padding, title: "Padding", defaultValue: "64px" },
  background: { type: ControlType.Color, title: "Background", defaultValue: "#F9F8F5" },
});
