import { create } from "zustand";
import { ECONOMY_DEFAULTS, type EconomyParams } from "@/lib/economyDefaults";
import { getParams } from "@/services/testnetApi";

interface ParamsState {
  economy: EconomyParams;
  loaded: boolean;
  hydrate: () => Promise<void>;
}
export const useParamsStore = create<ParamsState>((set) => ({
  economy: ECONOMY_DEFAULTS,
  loaded: false,
  hydrate: async () => {
    try {
      const { economy } = await getParams();
      if (economy) set({ economy, loaded: true });
    } catch { /* offline / Mock — keep defaults */ }
  },
}));
