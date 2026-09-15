import type { ComponentType } from "react";
import { forwardRef, useEffect, useState } from "react";

type NavbarProps = {
  variant?: string;
  $control__variant?: string;
  [key: string]: unknown;
};

type VariantPair = {
  top: string;
  scrolled: string;
};

const DESKTOP: VariantPair = {
  top: "IelcRifD8",
  scrolled: "KQ__xtisV",
};

const PHONE: VariantPair = {
  top: "gRk2pQ9PN",
  scrolled: "Tq7fe3nBv",
};

const PHONE_OPEN: VariantPair = {
  top: "IehzXKxtC",
  scrolled: "Av_TCtoJx",
};

const variantPairs: Record<string, VariantPair> = {
  Desktop: DESKTOP,
  IelcRifD8: DESKTOP,
  "Desktop Light": DESKTOP,
  sTZleRFJO: DESKTOP,
  "Desktop Black": DESKTOP,
  WTm2MGzB0: DESKTOP,
  "Desktop Scrolled": DESKTOP,
  KQ__xtisV: DESKTOP,

  Phone: PHONE,
  gRk2pQ9PN: PHONE,
  "Phone Light": PHONE,
  tPgW7NgUq: PHONE,
  "Phone Black": PHONE,
  SIDoDonxA: PHONE,
  "Phone Scrolled": PHONE,
  Tq7fe3nBv: PHONE,

  "Phone Open": PHONE_OPEN,
  IehzXKxtC: PHONE_OPEN,
  "Phone Open Light": PHONE_OPEN,
  pOM_7H6g3: PHONE_OPEN,
  "Phone Open Black": PHONE_OPEN,
  jFmUDNT81: PHONE_OPEN,
  "Phone Open Scrolled": PHONE_OPEN,
  Av_TCtoJx: PHONE_OPEN,
};

/**
 * Uses the configured navbar variant at scroll position 0 and its matching
 * Scrolled variant from the first vertical pixel onward.
 */
export function withNavbarScrollVariant(Component: ComponentType<any>): ComponentType<any> {
  return forwardRef<any, NavbarProps>(function NavbarWithScrollVariant(props, ref) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
      const updateScrollState = () => {
        const scrollTop =
          window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

        setIsScrolled(scrollTop >= 1);
      };

      updateScrollState();
      window.addEventListener("scroll", updateScrollState, {
        passive: true,
      });

      return () => {
        window.removeEventListener("scroll", updateScrollState);
      };
    }, []);

    const configuredVariant = props.variant ?? props.$control__variant;
    const pair =
      typeof configuredVariant === "string" ? variantPairs[configuredVariant] : undefined;
    const targetVariant = pair ? (isScrolled ? pair.scrolled : pair.top) : configuredVariant;

    return (
      <Component {...props} ref={ref} variant={targetVariant} $control__variant={targetVariant} />
    );
  });
}
