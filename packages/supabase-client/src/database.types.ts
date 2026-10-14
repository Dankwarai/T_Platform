// Generated via the Supabase MCP `generate_typescript_types` tool against
// the hosted t-platform project (ref cyqcoryjtomgqkazuzep). Regenerate the
// same way after any schema-changing migration.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      customer_profiles: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          location: string | null
          preferred_unit: Database["public"]["Enums"]["measurement_unit"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          location?: string | null
          preferred_unit?: Database["public"]["Enums"]["measurement_unit"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          location?: string | null
          preferred_unit?: Database["public"]["Enums"]["measurement_unit"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_types: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      job_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          job_id: string
          note: string | null
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          job_id: string
          note?: string | null
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          job_id?: string
          note?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string | null
          fit_confirmation:
            | Database["public"]["Enums"]["job_fit_confirmation"]
            | null
          fitting_iteration_count: number
          garment_type_id: string
          id: string
          measurement_record_id: string
          payment_method:
            | Database["public"]["Enums"]["job_payment_method"]
            | null
          payment_status: Database["public"]["Enums"]["job_payment_status"]
          price: number | null
          price_type: Database["public"]["Enums"]["job_price_type"] | null
          status: Database["public"]["Enums"]["job_status"]
          tailor_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          fit_confirmation?:
            | Database["public"]["Enums"]["job_fit_confirmation"]
            | null
          fitting_iteration_count?: number
          garment_type_id: string
          id?: string
          measurement_record_id: string
          payment_method?:
            | Database["public"]["Enums"]["job_payment_method"]
            | null
          payment_status?: Database["public"]["Enums"]["job_payment_status"]
          price?: number | null
          price_type?: Database["public"]["Enums"]["job_price_type"] | null
          status?: Database["public"]["Enums"]["job_status"]
          tailor_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          fit_confirmation?:
            | Database["public"]["Enums"]["job_fit_confirmation"]
            | null
          fitting_iteration_count?: number
          garment_type_id?: string
          id?: string
          measurement_record_id?: string
          payment_method?:
            | Database["public"]["Enums"]["job_payment_method"]
            | null
          payment_status?: Database["public"]["Enums"]["job_payment_status"]
          price?: number | null
          price_type?: Database["public"]["Enums"]["job_price_type"] | null
          status?: Database["public"]["Enums"]["job_status"]
          tailor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_garment_type_id_fkey"
            columns: ["garment_type_id"]
            isOneToOne: false
            referencedRelation: "garment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_measurement_record_id_fkey"
            columns: ["measurement_record_id"]
            isOneToOne: false
            referencedRelation: "measurement_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_tailor_id_fkey"
            columns: ["tailor_id"]
            isOneToOne: false
            referencedRelation: "tailor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_fields: {
        Row: {
          display_order: number
          field_key: string
          field_label: string
          garment_type_id: string
          guide_image_url: string | null
          guide_instructions: string | null
          id: string
        }
        Insert: {
          display_order?: number
          field_key: string
          field_label: string
          garment_type_id: string
          guide_image_url?: string | null
          guide_instructions?: string | null
          id?: string
        }
        Update: {
          display_order?: number
          field_key?: string
          field_label?: string
          garment_type_id?: string
          guide_image_url?: string | null
          guide_instructions?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_fields_garment_type_id_fkey"
            columns: ["garment_type_id"]
            isOneToOne: false
            referencedRelation: "garment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_records: {
        Row: {
          created_at: string
          customer_id: string
          garment_type_id: string
          id: string
          label: string
          notes: string | null
          tailor_id: string | null
          unit: Database["public"]["Enums"]["measurement_unit"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          garment_type_id: string
          id?: string
          label: string
          notes?: string | null
          tailor_id?: string | null
          unit: Database["public"]["Enums"]["measurement_unit"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          garment_type_id?: string
          id?: string
          label?: string
          notes?: string | null
          tailor_id?: string | null
          unit?: Database["public"]["Enums"]["measurement_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_records_garment_type_id_fkey"
            columns: ["garment_type_id"]
            isOneToOne: false
            referencedRelation: "garment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_records_tailor_id_fkey"
            columns: ["tailor_id"]
            isOneToOne: false
            referencedRelation: "tailor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_values: {
        Row: {
          id: string
          measurement_field_id: string
          measurement_record_id: string
          value: number
        }
        Insert: {
          id?: string
          measurement_field_id: string
          measurement_record_id: string
          value: number
        }
        Update: {
          id?: string
          measurement_field_id?: string
          measurement_record_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurement_values_measurement_field_id_fkey"
            columns: ["measurement_field_id"]
            isOneToOne: false
            referencedRelation: "measurement_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_values_measurement_record_id_fkey"
            columns: ["measurement_record_id"]
            isOneToOne: false
            referencedRelation: "measurement_records"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_variant_id: string
          quantity: number
          subtotal: number
          unit_price_at_purchase: number
        }
        Insert: {
          id?: string
          order_id: string
          product_variant_id: string
          quantity: number
          subtotal: number
          unit_price_at_purchase: number
        }
        Update: {
          id?: string
          order_id?: string
          product_variant_id?: string
          quantity?: number
          subtotal?: number
          unit_price_at_purchase?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          fulfillment_type: Database["public"]["Enums"]["order_fulfillment_type"]
          id: string
          payment_method: Database["public"]["Enums"]["order_payment_method"]
          payment_status: Database["public"]["Enums"]["order_payment_status"]
          platform_fee_amount: number
          status: Database["public"]["Enums"]["order_status"]
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          fulfillment_type: Database["public"]["Enums"]["order_fulfillment_type"]
          id?: string
          payment_method: Database["public"]["Enums"]["order_payment_method"]
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          platform_fee_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          supplier_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          fulfillment_type?: Database["public"]["Enums"]["order_fulfillment_type"]
          id?: string
          payment_method?: Database["public"]["Enums"]["order_payment_method"]
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          platform_fee_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          job_id: string | null
          order_id: string | null
          payer_id: string
          provider: string
          provider_reference: string
          status: Database["public"]["Enums"]["payment_status_value"]
          target_type: Database["public"]["Enums"]["payment_target_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          job_id?: string | null
          order_id?: string | null
          payer_id: string
          provider?: string
          provider_reference: string
          status?: Database["public"]["Enums"]["payment_status_value"]
          target_type: Database["public"]["Enums"]["payment_target_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          job_id?: string | null
          order_id?: string | null
          payer_id?: string
          provider?: string
          provider_reference?: string
          status?: Database["public"]["Enums"]["payment_status_value"]
          target_type?: Database["public"]["Enums"]["payment_target_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          commission_rate: number
          id: boolean
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          product_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          price: number
          product_id: string
          sku: string | null
          stock_quantity: number
          unit_type: Database["public"]["Enums"]["product_unit_type"]
          updated_at: string
          variant_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          product_id: string
          sku?: string | null
          stock_quantity?: number
          unit_type: Database["public"]["Enums"]["product_unit_type"]
          updated_at?: string
          variant_name: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          product_id?: string
          sku?: string | null
          stock_quantity?: number
          unit_type?: Database["public"]["Enums"]["product_unit_type"]
          updated_at?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          avg_rating: number
          category_id: string
          created_at: string
          description: string | null
          id: string
          images: string[]
          name: string
          rating_count: number
          supplier_id: string
          updated_at: string
        }
        Insert: {
          avg_rating?: number
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          name: string
          rating_count?: number
          supplier_id: string
          updated_at?: string
        }
        Update: {
          avg_rating?: number
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          name?: string
          rating_count?: number
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          rating: number
          tailor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          rating: number
          tailor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          rating?: number
          tailor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tailor_id_fkey"
            columns: ["tailor_id"]
            isOneToOne: false
            referencedRelation: "tailor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          business_name: string
          created_at: string
          follower_count: number
          id: string
          location: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          business_name: string
          created_at?: string
          follower_count?: number
          id?: string
          location: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          business_name?: string
          created_at?: string
          follower_count?: number
          id?: string
          location?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tailor_profiles: {
        Row: {
          avatar_path: string | null
          avg_rating: number
          bio: string | null
          business_name: string
          created_at: string
          follower_count: number
          id: string
          location: string
          portfolio_images: string[]
          rating_count: number
          skill_score: number
          skill_tier: Database["public"]["Enums"]["skill_tier"]
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          avatar_path?: string | null
          avg_rating?: number
          bio?: string | null
          business_name: string
          created_at?: string
          follower_count?: number
          id?: string
          location: string
          portfolio_images?: string[]
          rating_count?: number
          skill_score?: number
          skill_tier?: Database["public"]["Enums"]["skill_tier"]
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          avatar_path?: string | null
          avg_rating?: number
          bio?: string | null
          business_name?: string
          created_at?: string
          follower_count?: number
          id?: string
          location?: string
          portfolio_images?: string[]
          rating_count?: number
          skill_score?: number
          skill_tier?: Database["public"]["Enums"]["skill_tier"]
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tailor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tailor_service_prices: {
        Row: {
          garment_type_id: string
          id: string
          price: number
          tailor_id: string
        }
        Insert: {
          garment_type_id: string
          id?: string
          price: number
          tailor_id: string
        }
        Update: {
          garment_type_id?: string
          id?: string
          price?: number
          tailor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tailor_service_prices_garment_type_id_fkey"
            columns: ["garment_type_id"]
            isOneToOne: false
            referencedRelation: "garment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tailor_service_prices_tailor_id_fkey"
            columns: ["tailor_id"]
            isOneToOne: false
            referencedRelation: "tailor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tailor_specialties: {
        Row: {
          garment_type_id: string
          id: string
          tailor_id: string
        }
        Insert: {
          garment_type_id: string
          id?: string
          tailor_id: string
        }
        Update: {
          garment_type_id?: string
          id?: string
          tailor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tailor_specialties_garment_type_id_fkey"
            columns: ["garment_type_id"]
            isOneToOne: false
            referencedRelation: "garment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tailor_specialties_tailor_id_fkey"
            columns: ["tailor_id"]
            isOneToOne: false
            referencedRelation: "tailor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_suspended: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_suspended?: boolean
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_suspended?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: {
        Args: {
          p_fulfillment_type: Database["public"]["Enums"]["order_fulfillment_type"]
          p_items: Json
          p_payment_method: Database["public"]["Enums"]["order_payment_method"]
          p_supplier_id: string
        }
        Returns: string
      }
      get_follow_suggestions: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          avg_rating: number
          business_name: string
          candidate_user_id: string
          follower_count: number
          location: string
          suggestion_score: number
          tailor_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_job_participant_with: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      is_job_tailor_for_customer: {
        Args: { target_customer_profile_id: string }
        Returns: boolean
      }
      is_job_tailor_for_record: {
        Args: { record_id: string }
        Returns: boolean
      }
      is_order_participant_with: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      recalculate_tailor_skill: {
        Args: { target_tailor_id: string }
        Returns: undefined
      }
    }
    Enums: {
      job_fit_confirmation: "yes" | "somewhat" | "no"
      job_payment_method: "in_app" | "offline"
      job_payment_status: "pending" | "paid" | "deposit_paid"
      job_price_type: "standard" | "custom"
      job_status:
        | "requested"
        | "accepted"
        | "rejected"
        | "in_progress"
        | "ready_for_fitting"
        | "adjusting"
        | "completed"
        | "delivered"
        | "cancelled"
      measurement_unit: "cm" | "inch"
      order_fulfillment_type: "supplier_shipping" | "local_pickup"
      order_payment_method: "in_app" | "offline"
      order_payment_status: "pending" | "paid" | "failed"
      order_status:
        | "pending"
        | "confirmed"
        | "ready"
        | "completed"
        | "cancelled"
      payment_status_value: "pending" | "paid" | "failed"
      payment_target_type: "job" | "order"
      product_unit_type: "yard" | "meter" | "piece" | "kg"
      skill_tier: "beginner" | "skilled" | "expert" | "master"
      user_role: "tailor" | "customer" | "supplier" | "admin"
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
    Enums: {
      job_fit_confirmation: ["yes", "somewhat", "no"],
      job_payment_method: ["in_app", "offline"],
      job_payment_status: ["pending", "paid", "deposit_paid"],
      job_price_type: ["standard", "custom"],
      job_status: [
        "requested",
        "accepted",
        "rejected",
        "in_progress",
        "ready_for_fitting",
        "adjusting",
        "completed",
        "delivered",
        "cancelled",
      ],
      measurement_unit: ["cm", "inch"],
      order_fulfillment_type: ["supplier_shipping", "local_pickup"],
      order_payment_method: ["in_app", "offline"],
      order_payment_status: ["pending", "paid", "failed"],
      order_status: ["pending", "confirmed", "ready", "completed", "cancelled"],
      payment_status_value: ["pending", "paid", "failed"],
      payment_target_type: ["job", "order"],
      product_unit_type: ["yard", "meter", "piece", "kg"],
      skill_tier: ["beginner", "skilled", "expert", "master"],
      user_role: ["tailor", "customer", "supplier", "admin"],
    },
  },
} as const
