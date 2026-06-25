import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useGameStore } from "@/store";
import { DeltaFlash } from "../DeltaFlash";

describe("DeltaFlash", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.setState({ resourceDeltas: {} });
  });

  it("renders nothing when there is no delta for the key", () => {
    const { container } = render(<DeltaFlash resourceKey="cpu" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a formatted gain in green", () => {
    useGameStore.setState({ resourceDeltas: { cpu: { value: 500, ts: 1 } } });
    render(<DeltaFlash resourceKey="cpu" />);
    const el = screen.getByText("+500");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("text-green-400");
  });

  it("shows a formatted loss in red", () => {
    useGameStore.setState({ resourceDeltas: { cpu: { value: -500, ts: 2 } } });
    render(<DeltaFlash resourceKey="cpu" />);
    const el = screen.getByText("-500");
    expect(el.className).toContain("text-red-400");
  });

  it("applies the HUD's sci formatting to large deltas (the consistency fix)", () => {
    useGameStore.setState({ resourceDeltas: { cpu: { value: 1234567, ts: 3 } } });
    render(<DeltaFlash resourceKey="cpu" />);
    expect(screen.getByText("+1.23e6")).toBeInTheDocument();
  });
});
