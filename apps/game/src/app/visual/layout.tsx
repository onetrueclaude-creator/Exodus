import { notFound } from "next/navigation";
import { isVisualRouteBlocked } from "@/lib/visualTest";

/**
 * Dev-only visual-regression harness routes. They mount real components with
 * deterministic data for screenshot baselines and MUST NOT exist in production.
 */
export default function VisualLayout({ children }: { children: React.ReactNode }) {
  if (isVisualRouteBlocked()) notFound();
  return <div data-visual-harness>{children}</div>;
}
