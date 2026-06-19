import CTAButton from "./CTAButton";

interface HeroProps {
  title: string;
  highlight?: string;
  subtitle: string;
  primaryCTA?: { label: string; href: string };
  secondaryCTA?: { label: string; href: string };
}

export default function Hero({ title, highlight, subtitle, primaryCTA, secondaryCTA }: HeroProps) {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center grid-bg overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
          {title}{" "}
          {highlight && <span className="gradient-text">{highlight}</span>}
        </h1>
        <p className="mt-6 text-lg md:text-xl text-text-secondary max-w-2xl mx-auto">
          {subtitle}
        </p>
        {(primaryCTA || secondaryCTA) && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {primaryCTA && <CTAButton label={primaryCTA.label} href={primaryCTA.href} />}
            {secondaryCTA && <CTAButton label={secondaryCTA.label} href={secondaryCTA.href} variant="secondary" />}
          </div>
        )}
      </div>
    </section>
  );
}
