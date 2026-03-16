export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agribalyse_foods: {
        Row: {
          acidification: number | null
          cc_affectation_sols: number | null
          cc_biogenique: number | null
          cc_fossile: number | null
          changement_climatique: number | null
          created_at: string
          ecotoxicite_eau_douce: number | null
          epuisement_eau: number | null
          epuisement_energie: number | null
          epuisement_mineraux: number | null
          eutrophisation_eaux_douces: number | null
          eutrophisation_marine: number | null
          eutrophisation_terrestre: number | null
          formation_ozone: number | null
          id: string
          is_bio: boolean
          name: string
          ozone: number | null
          particules: number | null
          production_type: string | null
          rayonnements_ionisants: number | null
          score_unique_ef: number | null
          toxicite_cancerogene: number | null
          toxicite_non_cancerogene: number | null
          utilisation_sol: number | null
        }
        Insert: {
          acidification?: number | null
          cc_affectation_sols?: number | null
          cc_biogenique?: number | null
          cc_fossile?: number | null
          changement_climatique?: number | null
          created_at?: string
          ecotoxicite_eau_douce?: number | null
          epuisement_eau?: number | null
          epuisement_energie?: number | null
          epuisement_mineraux?: number | null
          eutrophisation_eaux_douces?: number | null
          eutrophisation_marine?: number | null
          eutrophisation_terrestre?: number | null
          formation_ozone?: number | null
          id?: string
          is_bio?: boolean
          name: string
          ozone?: number | null
          particules?: number | null
          production_type?: string | null
          rayonnements_ionisants?: number | null
          score_unique_ef?: number | null
          toxicite_cancerogene?: number | null
          toxicite_non_cancerogene?: number | null
          utilisation_sol?: number | null
        }
        Update: {
          acidification?: number | null
          cc_affectation_sols?: number | null
          cc_biogenique?: number | null
          cc_fossile?: number | null
          changement_climatique?: number | null
          created_at?: string
          ecotoxicite_eau_douce?: number | null
          epuisement_eau?: number | null
          epuisement_energie?: number | null
          epuisement_mineraux?: number | null
          eutrophisation_eaux_douces?: number | null
          eutrophisation_marine?: number | null
          eutrophisation_terrestre?: number | null
          formation_ozone?: number | null
          id?: string
          is_bio?: boolean
          name?: string
          ozone?: number | null
          particules?: number | null
          production_type?: string | null
          rayonnements_ionisants?: number | null
          score_unique_ef?: number | null
          toxicite_cancerogene?: number | null
          toxicite_non_cancerogene?: number | null
          utilisation_sol?: number | null
        }
        Relationships: []
      }
      camp_days: {
        Row: {
          camp_id: string
          count_adulte: number
          count_bleu: number
          count_orange: number
          count_rouge: number
          created_at: string
          day_date: string
          id: string
          participant_count: number
        }
        Insert: {
          camp_id: string
          count_adulte?: number
          count_bleu?: number
          count_orange?: number
          count_rouge?: number
          created_at?: string
          day_date: string
          id?: string
          participant_count?: number
        }
        Update: {
          camp_id?: string
          count_adulte?: number
          count_bleu?: number
          count_orange?: number
          count_rouge?: number
          created_at?: string
          day_date?: string
          id?: string
          participant_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "camp_days_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_ingredient_usage: {
        Row: {
          camp_id: string
          camp_meal_id: string | null
          created_at: string
          id: string
          ingredient_name: string
          quantity_used: number
          unit: string
        }
        Insert: {
          camp_id: string
          camp_meal_id?: string | null
          created_at?: string
          id?: string
          ingredient_name: string
          quantity_used?: number
          unit: string
        }
        Update: {
          camp_id?: string
          camp_meal_id?: string | null
          created_at?: string
          id?: string
          ingredient_name?: string
          quantity_used?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_ingredient_usage_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_ingredient_usage_camp_meal_id_fkey"
            columns: ["camp_meal_id"]
            isOneToOne: false
            referencedRelation: "camp_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_meals: {
        Row: {
          camp_id: string
          created_at: string
          id: string
          meal_date: string
          meal_type: string
          menu_id: string
        }
        Insert: {
          camp_id: string
          created_at?: string
          id?: string
          meal_date: string
          meal_type: string
          menu_id: string
        }
        Update: {
          camp_id?: string
          created_at?: string
          id?: string
          meal_date?: string
          meal_type?: string
          menu_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_meals_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_meals_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      camps: {
        Row: {
          created_at: string
          end_date: string
          id: string
          name: string
          participant_count: number
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          name: string
          participant_count?: number
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          participant_count?: number
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      menu_ingredients: {
        Row: {
          agribalyse_food_id: string | null
          created_at: string
          id: string
          menu_id: string
          name: string
          quantity: number
          unit: string
          unit_multiplier: number
        }
        Insert: {
          agribalyse_food_id?: string | null
          created_at?: string
          id?: string
          menu_id: string
          name: string
          quantity: number
          unit: string
          unit_multiplier?: number
        }
        Update: {
          agribalyse_food_id?: string | null
          created_at?: string
          id?: string
          menu_id?: string
          name?: string
          quantity?: number
          unit?: string
          unit_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_ingredients_agribalyse_food_id_fkey"
            columns: ["agribalyse_food_id"]
            isOneToOne: false
            referencedRelation: "agribalyse_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_ingredients_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          is_shared: boolean
          meal_type: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_shared?: boolean
          meal_type: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_shared?: boolean
          meal_type?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shopping_list_checks: {
        Row: {
          id: string
          ingredient_key: string
          is_checked: boolean
          shopping_list_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          ingredient_key: string
          is_checked?: boolean
          shopping_list_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          ingredient_key?: string
          is_checked?: boolean
          shopping_list_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_checks_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_meals: {
        Row: {
          camp_meal_id: string
          id: string
          shopping_list_id: string
        }
        Insert: {
          camp_meal_id: string
          id?: string
          shopping_list_id: string
        }
        Update: {
          camp_meal_id?: string
          id?: string
          shopping_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_meals_camp_meal_id_fkey"
            columns: ["camp_meal_id"]
            isOneToOne: false
            referencedRelation: "camp_meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_meals_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          camp_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          camp_id: string
          created_at?: string
          id?: string
          name?: string
        }
        Update: {
          camp_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
