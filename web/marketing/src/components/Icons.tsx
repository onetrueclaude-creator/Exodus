// src/components/Icons.tsx
import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, className, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {children}
    </svg>
  );
}

export function CpuIcon(props: IconProps) {
  return (<Icon {...props}><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" /></Icon>);
}

export function BrainIcon(props: IconProps) {
  return (<Icon {...props}><path d="M12 2a6 6 0 0 0-6 6c0 2.5 1.5 4.5 3 5.5V16h6v-2.5c1.5-1 3-3 3-5.5a6 6 0 0 0-6-6z" /><path d="M9 16v2a3 3 0 0 0 6 0v-2" /><path d="M12 2v4M8 6l2 2M16 6l-2 2" /></Icon>);
}

export function SearchIcon(props: IconProps) {
  return (<Icon {...props}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></Icon>);
}

export function DiamondIcon(props: IconProps) {
  return (<Icon {...props}><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M2 9h20" /><path d="M12 21L8 9l4-6 4 6z" /></Icon>);
}

export function ShieldIcon(props: IconProps) {
  return (<Icon {...props}><path d="M12 2l8 4v6c0 5.25-3.5 9.75-8 11-4.5-1.25-8-5.75-8-11V6z" /></Icon>);
}

export function LockIcon(props: IconProps) {
  return (<Icon {...props}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>);
}

export function VoteIcon(props: IconProps) {
  return (<Icon {...props}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 17 5 21 1" /></Icon>);
}

export function NetworkIcon(props: IconProps) {
  return (<Icon {...props}><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7v4M7.5 17.5L10.5 13M16.5 17.5L13.5 13" /><circle cx="12" cy="12" r="1.5" /></Icon>);
}

export function LayersIcon(props: IconProps) {
  return (<Icon {...props}><polygon points="12 2 2 7 12 12 22 7" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></Icon>);
}

export function RocketIcon(props: IconProps) {
  return (<Icon {...props}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></Icon>);
}

export function CheckCircleIcon(props: IconProps) {
  return (<Icon {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>);
}

export function ClockIcon(props: IconProps) {
  return (<Icon {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>);
}

export function ZapIcon(props: IconProps) {
  return (<Icon {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10" /></Icon>);
}
