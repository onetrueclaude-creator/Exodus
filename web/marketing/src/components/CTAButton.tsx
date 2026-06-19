import Link from "next/link";

interface CTAButtonProps {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
}

export default function CTAButton({ label, href, variant = "primary" }: CTAButtonProps) {
  const base = "inline-block px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300";
  const variants = {
    primary:
      "bg-gradient-to-r from-accent-cyan to-accent-purple text-white shadow-glow hover:shadow-glow-lg hover:scale-105",
    secondary:
      "border border-accent-cyan text-accent-cyan hover:bg-accent-cyan/10 hover:shadow-glow",
  };

  return (
    <Link href={href} className={`${base} ${variants[variant]}`}>
      {label}
    </Link>
  );
}
