export interface ShoppingList {
  id: string;
  camp_id: string;
  name: string;
  created_at: string;
}

export interface ShoppingListCheck {
  id: string;
  shopping_list_id: string;
  ingredient_key: string;
  is_checked: boolean;
}
