import { describe, it, expect } from "vitest";
import { DISCLOSURES } from "@/lib/disclosures";

describe("canonical disclosure snippets (verbatim)", () => {
  it("testnet token snippet is value-neutral and verbatim", () => {
    expect(DISCLOSURES.testnetToken).toContain("valueless token");
    expect(DISCLOSURES.testnetToken).toContain("is not an investment");
    expect(DISCLOSURES.testnetToken).toContain("earned through work");
    // never markets value (note: "yield" appears in a negation/disclaimer — excluded from check)
    expect(DISCLOSURES.testnetToken.toLowerCase()).not.toMatch(/\b(roi|apy|profit|price target)\b/);
  });

  it("zk rung-status snippet states the rung honestly", () => {
    expect(DISCLOSURES.zkRungStatus).toContain("raw-Merkle possession proof");
    expect(DISCLOSURES.zkRungStatus).toContain("not yet zero-knowledge");
    expect(DISCLOSURES.zkRungStatus).toContain("SimulatedZKProof");
  });

  it("built-with-AI notice is quarantined from financial claims", () => {
    expect(DISCLOSURES.builtWithAi).toContain("autonomous AI agent");
    expect(DISCLOSURES.builtWithAi).toContain("not a financial representation");
  });
});
