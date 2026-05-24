import { NavBar } from "@/components/nav-bar";
import { Hero } from "@/components/hero";
import { ValueProps } from "@/components/value-props";
import { FinalCta } from "@/components/cta";
import { Footer } from "@/components/footer";

export default function MarketingHome() {
  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <ValueProps />
        {/* TODO Sprint 4: добавить секции Problem, Features (детально), Industries, Pricing, FAQ */}
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
