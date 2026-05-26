import { NavBar } from "@/components/nav-bar";
import { Hero } from "@/components/hero";
import { Problem } from "@/components/problem";
import { ValueProps } from "@/components/value-props";
import { Industries } from "@/components/industries";
import { Pricing } from "@/components/pricing";
import { Faq } from "@/components/faq";
import { FinalCta } from "@/components/cta";
import { Footer } from "@/components/footer";

export default function MarketingHome() {
  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <Problem />
        <ValueProps />
        <Industries />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
