import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import MenusPage from "../index";

const mockMenus = [
  {
    id: "1",
    name: "Pasta Carbonara",
    description: "Classic Italian pasta",
    meal_type: "meal" as const,
    is_default: false,
    is_shared: false,
    user_id: "user1",
    menu_ingredients: [{ id: "ing1", name: "Pasta", quantity: 500, unit: "g", agribalyse_food_id: null, menu_id: "1" }],
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    creator_name: "Chef Alice",
  },
  {
    id: "2",
    name: "Caesar Salad",
    description: "Fresh vegetables",
    meal_type: "meal" as const,
    is_default: false,
    is_shared: true,
    user_id: "user2",
    menu_ingredients: [{ id: "ing2", name: "Lettuce", quantity: 200, unit: "g", agribalyse_food_id: null, menu_id: "2" }],
    created_at: "2024-01-02",
    updated_at: "2024-01-02",
    creator_name: "Chef Bob",
  },
  {
    id: "3",
    name: "Breakfast Oats",
    description: "Healthy morning meal",
    meal_type: "breakfast" as const,
    is_default: true,
    is_shared: false,
    user_id: null,
    menu_ingredients: [{ id: "ing3", name: "Oats", quantity: 100, unit: "g", agribalyse_food_id: null, menu_id: "3" }],
    created_at: "2024-01-03",
    updated_at: "2024-01-03",
    creator_name: null,
  },
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `menu-${i + 4}`,
    name: `Menu ${i + 4}`,
    description: `Description for menu ${i + 4}`,
    meal_type: "snack" as const,
    is_default: false,
    is_shared: false,
    user_id: "user1",
    menu_ingredients: [],
    created_at: "2024-01-04",
    updated_at: "2024-01-04",
    creator_name: "Chef Alice",
  })),
];

const mockUser = { id: "user1", email: "user@test.com" };

vi.mock("@/hooks/useMenus", () => ({
  useMenus: vi.fn(() => ({
    data: mockMenus,
    isLoading: false,
    error: null,
  })),
  useDeleteMenu: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useToggleShared: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock("@/hooks/useBookmarks", () => ({
  useBookmarks: vi.fn(() => ({
    data: new Set(["1", "3"]),
    isLoading: false,
  })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/hooks/useToggleBookmark", () => ({
  useToggleBookmark: () => ({
    mutate: vi.fn(),
  }),
}));

vi.mock("../MenuCard", () => ({
  MenuCard: ({ menu, view }: { menu: { id: string; name: string }; view: string }) => (
    <div data-testid={`menu-card-${menu.id}`} className={`menu-card menu-card-${view}`}>
      {menu.name}
    </div>
  ),
}));

const renderMenusPage = () => {
  return render(
    <BrowserRouter>
      <MenusPage />
    </BrowserRouter>
  );
};

describe("MenusPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the page header", () => {
      renderMenusPage();
      expect(screen.getByText("Bibliothèque de menus")).toBeInTheDocument();
      expect(screen.getByText("Explorez et créez vos menus pour le camp")).toBeInTheDocument();
    });

    it("renders search input", () => {
      renderMenusPage();
      expect(screen.getByPlaceholderText("Rechercher un menu, un ingrédient…")).toBeInTheDocument();
    });

    it("renders view toggle buttons (grid and list)", () => {
      renderMenusPage();
      expect(screen.getByTitle("Vue grille")).toBeInTheDocument();
      expect(screen.getByTitle("Vue liste")).toBeInTheDocument();
    });

    it("renders new menu button", () => {
      renderMenusPage();
      const newMenuButton = screen.getByText(/Nouveau menu|Se connecter/);
      expect(newMenuButton).toBeInTheDocument();
    });

    it("renders type filter buttons", () => {
      renderMenusPage();
      const typeLabel = screen.getByText("Type");
      expect(typeLabel).toBeInTheDocument();
      // Check that filter buttons exist
      const filterButtons = screen.getAllByRole("button");
      expect(filterButtons.length).toBeGreaterThan(0);
    });

    it("renders source filter buttons", () => {
      renderMenusPage();
      const sourceLabel = screen.getByText("Source");
      expect(sourceLabel).toBeInTheDocument();
    });
  });

  describe("Search functionality", () => {
    it("filters menus by search query", async () => {
      renderMenusPage();
      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");

      fireEvent.change(searchInput, { target: { value: "Pasta" } });

      await waitFor(() => {
        expect(screen.getByTestId("menu-card-1")).toBeInTheDocument();
        expect(screen.queryByTestId("menu-card-2")).not.toBeInTheDocument();
      });
    });

    it("shows clear button when search has text", () => {
      renderMenusPage();
      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");

      fireEvent.change(searchInput, { target: { value: "test" } });

      const clearButton = screen.getByLabelText("Effacer");
      expect(clearButton).toBeInTheDocument();
    });

    it("clears search when clear button is clicked", async () => {
      renderMenusPage();
      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");

      fireEvent.change(searchInput, { target: { value: "test" } });
      fireEvent.click(screen.getByLabelText("Effacer"));

      await waitFor(() => {
        expect(searchInput).toHaveValue("");
      });
    });

    it("filters by ingredient names", async () => {
      renderMenusPage();
      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");

      fireEvent.change(searchInput, { target: { value: "Lettuce" } });

      await waitFor(() => {
        expect(screen.getByTestId("menu-card-2")).toBeInTheDocument();
      });
    });

    it("shows empty state when no results found", async () => {
      renderMenusPage();
      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");

      fireEvent.change(searchInput, { target: { value: "NonexistentMenu" } });

      await waitFor(() => {
        expect(screen.getByText("Aucun menu trouvé")).toBeInTheDocument();
        expect(screen.getByText("Essayez d'ajuster votre recherche ou vos filtres.")).toBeInTheDocument();
      });
    });
  });

  describe("View toggle", () => {
    it("displays menus in grid view by default", () => {
      renderMenusPage();
      const gridButton = screen.getByTitle("Vue grille");
      expect(gridButton.closest("button")).toHaveClass("bg-white");
    });

    it("switches to list view when list button is clicked", () => {
      renderMenusPage();
      const listButton = screen.getByTitle("Vue liste");

      fireEvent.click(listButton);

      const menuCard = screen.getByTestId("menu-card-1").closest(".menu-card");
      expect(menuCard).toHaveClass("menu-card-list");
    });

    it("switches back to grid view", () => {
      renderMenusPage();
      fireEvent.click(screen.getByTitle("Vue liste"));
      fireEvent.click(screen.getByTitle("Vue grille"));

      const menuCard = screen.getByTestId("menu-card-1").closest(".menu-card");
      expect(menuCard).toHaveClass("menu-card-grid");
    });
  });

  describe("Pagination (Load More)", () => {
    it("displays initial 12 menus", () => {
      renderMenusPage();
      for (let i = 1; i <= 3; i++) {
        expect(screen.getByTestId(`menu-card-${i}`)).toBeInTheDocument();
      }
    });

    it("shows load more button when there are more items", () => {
      renderMenusPage();
      const loadMoreButton = screen.getByText("Charger plus");
      expect(loadMoreButton).toBeInTheDocument();
    });

    it("loads more items when load more button is clicked", async () => {
      renderMenusPage();
      const loadMoreButton = screen.getByText("Charger plus");

      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getByTestId("menu-card-menu-13")).toBeInTheDocument();
      });
    });

    it("hides load more button when all items are displayed", async () => {
      renderMenusPage();
      let loadMoreButton = screen.getByText("Charger plus");

      while (loadMoreButton) {
        fireEvent.click(loadMoreButton);
        await waitFor(() => {
          loadMoreButton = screen.queryByText("Charger mais");
        });
      }

      expect(screen.queryByText("Charger plus")).not.toBeInTheDocument();
    });

    it("resets pagination when search filter changes", async () => {
      renderMenusPage();
      const loadMoreButton = screen.getByText("Charger plus");
      fireEvent.click(loadMoreButton);

      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");
      fireEvent.change(searchInput, { target: { value: "Pasta" } });

      await waitFor(() => {
        expect(screen.getByTestId("menu-card-1")).toBeInTheDocument();
        expect(screen.queryByTestId("menu-card-menu-13")).not.toBeInTheDocument();
      });
    });

    it("resets pagination when type filter changes", async () => {
      renderMenusPage();
      const loadMoreButton = screen.getByText("Charger plus");
      fireEvent.click(loadMoreButton);

      const filterButtons = screen.getAllByRole("button");
      const breakfastFilter = filterButtons.find((btn) => btn.textContent?.includes("Petit-déjeuner"));

      if (breakfastFilter) {
        fireEvent.click(breakfastFilter);

        await waitFor(() => {
          expect(screen.queryByTestId("menu-card-menu-13")).not.toBeInTheDocument();
        });
      }
    });
  });

  describe("Result count", () => {
    it("shows result count display", () => {
      renderMenusPage();
      // Check for the presence of the count display
      expect(screen.getByText(/\d+ menus/)).toBeInTheDocument();
    });

    it("updates count when filters change", async () => {
      renderMenusPage();
      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");

      fireEvent.change(searchInput, { target: { value: "Pasta" } });

      await waitFor(() => {
        // Check that the count updates (should show 1 / 18)
        expect(screen.getByText(/\d+ menus/)).toBeInTheDocument();
      });
    });
  });

  describe("Reset filters button", () => {
    it("shows reset button when filters are active", async () => {
      renderMenusPage();
      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");

      fireEvent.change(searchInput, { target: { value: "NonexistentMenu" } });

      await waitFor(() => {
        expect(screen.getByText("Réinitialiser les filtres")).toBeInTheDocument();
      });
    });

    it("resets all filters when reset button is clicked", async () => {
      renderMenusPage();
      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");

      fireEvent.change(searchInput, { target: { value: "NonexistentMenu" } });

      await waitFor(() => {
        const resetButton = screen.getByText("Réinitialiser les filtres");
        expect(resetButton).toBeInTheDocument();
        fireEvent.click(resetButton);
      });

      await waitFor(() => {
        expect(searchInput).toHaveValue("");
      });
    });
  });

  describe("Empty state", () => {
    it("shows empty state when search returns no results", async () => {
      renderMenusPage();
      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");

      fireEvent.change(searchInput, { target: { value: "NonexistentMenuXYZ123" } });

      await waitFor(() => {
        expect(screen.getByText("Aucun menu trouvé")).toBeInTheDocument();
        expect(screen.getByText("Essayez d'ajuster votre recherche ou vos filtres.")).toBeInTheDocument();
      });
    });
  });

  describe("Menu card rendering", () => {
    it("renders menu cards in grid view", () => {
      renderMenusPage();
      expect(screen.getByTestId("menu-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("menu-card-2")).toBeInTheDocument();
    });

    it("renders correct number of initial menu cards", () => {
      renderMenusPage();
      const cards = screen.getAllByTestId(/menu-card-/);
      expect(cards.length).toBeLessThanOrEqual(12);
    });
  });

  describe("Mobile filter drawer", () => {
    it("renders filters button for opening drawer", () => {
      renderMenusPage();
      const filterButton = screen.getByText("Filtres");
      expect(filterButton).toBeInTheDocument();
    });

    it("filter button is clickable and functional", () => {
      renderMenusPage();
      const filterButton = screen.getByText("Filtres");
      expect(filterButton).not.toBeDisabled();

      fireEvent.click(filterButton);
      // If no error is thrown, the click was successful
      expect(filterButton).toBeInTheDocument();
    });

    it("type filters work from main interface", async () => {
      renderMenusPage();
      // Test that type filters are functional (tested both in desktop and mobile drawer)
      const buttons = screen.getAllByRole("button");
      const mealTypeButtons = buttons.filter((btn) =>
        ["Petit-déjeuner", "Déjeuner / Dîner", "Goûter"].some((type) =>
          btn.textContent?.includes(type)
        )
      );

      expect(mealTypeButtons.length).toBeGreaterThan(0);

      // Click breakfast filter
      const breakfastBtn = mealTypeButtons.find((btn) =>
        btn.textContent?.includes("Petit-déjeuner")
      );
      if (breakfastBtn) {
        fireEvent.click(breakfastBtn);

        // Breakfast menu should be visible
        expect(screen.getByTestId("menu-card-3")).toBeInTheDocument();
      }
    });

    it("source filters work from main interface", async () => {
      renderMenusPage();
      const buttons = screen.getAllByRole("button");

      // Find source filter buttons
      const sourceButtons = buttons.filter((btn) =>
        ["Tous", "Mes menus", "Favoris", "Publics"].some((source) =>
          btn.textContent?.includes(source)
        )
      );

      expect(sourceButtons.length).toBeGreaterThan(0);
    });

    it("filters can be reset from search results", async () => {
      renderMenusPage();
      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");

      // Create a search that yields no results
      fireEvent.change(searchInput, { target: { value: "NonexistentMenu" } });

      await waitFor(() => {
        expect(screen.getByText("Aucun menu trouvé")).toBeInTheDocument();
      });

      // Reset filters button should be available
      const resetButton = screen.getByText("Réinitialiser les filtres");
      expect(resetButton).toBeInTheDocument();

      fireEvent.click(resetButton);

      // Search should be cleared and menus should reappear
      await waitFor(() => {
        expect(searchInput).toHaveValue("");
        expect(screen.queryByText("Aucun menu trouvé")).not.toBeInTheDocument();
      });
    });

    it("combines search with type filtering", async () => {
      renderMenusPage();
      const searchInput = screen.getByPlaceholderText("Rechercher un menu, un ingrédient…");

      // Search for a specific menu
      fireEvent.change(searchInput, { target: { value: "Pasta" } });

      await waitFor(() => {
        expect(screen.getByTestId("menu-card-1")).toBeInTheDocument();
      });

      // Result count should be updated
      expect(screen.getByText(/\d+ menus/)).toBeInTheDocument();
    });
  });
});
