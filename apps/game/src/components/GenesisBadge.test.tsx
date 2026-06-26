import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useGameStore } from "@/store";
import GenesisBadge from "./GenesisBadge";

describe("GenesisBadge", () => {
  beforeEach(() => { useGameStore.getState().reset(); });

  it("renders nothing when the user is not in a Genesis batch", () => {
    useGameStore.setState({ genesisCohortBatch: null });
    const { container } = render(<GenesisBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a permanent Genesis badge with the batch number", () => {
    useGameStore.setState({ genesisCohortBatch: 2 });
    render(<GenesisBadge />);
    expect(screen.getByText(/genesis/i)).toBeInTheDocument();
    expect(screen.getByText(/batch 2/i)).toBeInTheDocument();
  });
});
