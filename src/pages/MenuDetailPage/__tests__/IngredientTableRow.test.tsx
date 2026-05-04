import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const updateMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: (fields: unknown) => {
        updateMock(fields);
        return { eq: () => Promise.resolve({ error: null }) };
      },
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/pages/MenuDetailPage/AgribalyseSearch", () => ({
  AgribalyseSearch: () => <div data-testid="agribalyse-search" />,
}));

vi.mock("@/pages/MenuDetailPage/unitMultiplier", () => ({
  resolveUnitMultiplier: vi.fn().mockResolvedValue(1000),
}));

import { IngredientTableRow } from "../IngredientTableRow";
import type { IngredientRow } from "../types";

const baseIngredient: IngredientRow = {
  id: "ing1",
  name: "Pâtes",
  quantity: 100,
  unit: "g",
  unit_multiplier: 1,
  agribalyse_food_id: null,
  agribalyse_name: null,
  changement_climatique: null,
};

function renderRow(opts: { ingredient?: Partial<IngredientRow>; isOwner?: boolean } = {}) {
  const ingredient = { ...baseIngredient, ...opts.ingredient };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <table>
        <tbody>
          <IngredientTableRow
            ingredient={ingredient}
            isOwner={opts.isOwner ?? true}
            menuId="m1"
          />
        </tbody>
      </table>
    </QueryClientProvider>,
  );
}

describe("IngredientTableRow combined quantity + unit input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the quantity input with the current quantity value", () => {
    renderRow({ ingredient: { quantity: 100, unit: "g" } });
    // First spinbutton is the quantity (the unit_multiplier input is the second).
    expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(100);
  });

  it("renders a clickable unit-change suffix as a combobox with the proper aria-label", () => {
    renderRow({ ingredient: { unit: "kg" } });
    const trigger = screen.getByRole("combobox", { name: /changer l'unité/i });
    expect(trigger).toBeInTheDocument();
  });

  it("calls the update mutation with the new quantity when the input changes", async () => {
    renderRow({ ingredient: { quantity: 100 } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "250" } });
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ quantity: 250 }));
    });
  });

  it("does not call the update mutation when the typed quantity is below min", async () => {
    renderRow({ ingredient: { quantity: 100 } });
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "-5" } });
    // Wait a tick to make sure no mutation is fired.
    await new Promise((r) => setTimeout(r, 0));
    expect(updateMock).not.toHaveBeenCalledWith(expect.objectContaining({ quantity: -5 }));
  });

  it("renders quantity and unit as plain text for non-owners (no inputs)", () => {
    renderRow({ isOwner: false, ingredient: { quantity: 200, unit: "ml" } });
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("200 ml")).toBeInTheDocument();
  });
});
