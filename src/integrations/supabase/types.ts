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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      award_categories: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string
          vote_fee: number | null
          voting_ends_at: string | null
          voting_starts_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string
          vote_fee?: number | null
          voting_ends_at?: string | null
          voting_starts_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string
          vote_fee?: number | null
          voting_ends_at?: string | null
          voting_starts_at?: string | null
        }
        Relationships: []
      }
      award_nominees: {
        Row: {
          award_id: string
          created_at: string
          creator_id: string
          id: string
          is_winner: boolean | null
          total_votes: number | null
        }
        Insert: {
          award_id: string
          created_at?: string
          creator_id: string
          id?: string
          is_winner?: boolean | null
          total_votes?: number | null
        }
        Update: {
          award_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          is_winner?: boolean | null
          total_votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "award_nominees_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "award_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_nominees_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contributions: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          donor_email: string | null
          donor_name: string | null
          donor_phone: string | null
          id: string
          is_anonymous: boolean | null
          message: string | null
          mpesa_receipt: string | null
          payment_provider: string | null
          payment_reference: string | null
          status: string | null
        }
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string
          donor_email?: string | null
          donor_name?: string | null
          donor_phone?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          mpesa_receipt?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          donor_email?: string | null
          donor_name?: string | null
          donor_phone?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          mpesa_receipt?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          banner_url: string | null
          created_at: string
          creator_id: string
          currency: string | null
          current_amount: number | null
          description: string | null
          end_date: string | null
          goal_amount: number
          id: string
          is_featured: boolean | null
          start_date: string | null
          status: string | null
          supporter_count: number | null
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          creator_id: string
          currency?: string | null
          current_amount?: number | null
          description?: string | null
          end_date?: string | null
          goal_amount: number
          id?: string
          is_featured?: boolean | null
          start_date?: string | null
          status?: string | null
          supporter_count?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          creator_id?: string
          currency?: string | null
          current_amount?: number | null
          description?: string | null
          end_date?: string | null
          goal_amount?: number
          id?: string
          is_featured?: boolean | null
          start_date?: string | null
          status?: string | null
          supporter_count?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      creator_links: {
        Row: {
          clicks: number | null
          created_at: string
          creator_id: string
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          clicks?: number | null
          created_at?: string
          creator_id: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          clicks?: number | null
          created_at?: string
          creator_id?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_links_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          approved_at: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          category_id: string | null
          created_at: string
          display_name: string
          id: string
          is_partner: boolean | null
          is_verified: boolean | null
          kyc_verified: boolean | null
          mpesa_phone: string | null
          paypal_email: string | null
          referral_code: string | null
          referral_tier: number | null
          referred_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["creator_status"]
          suspension_reason: string | null
          theme_accent: string | null
          theme_primary: string | null
          theme_secondary: string | null
          total_raised: number | null
          total_referral_earnings: number | null
          total_supporters: number | null
          total_votes: number | null
          tribe_name: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          approved_at?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          category_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_partner?: boolean | null
          is_verified?: boolean | null
          kyc_verified?: boolean | null
          mpesa_phone?: string | null
          paypal_email?: string | null
          referral_code?: string | null
          referral_tier?: number | null
          referred_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["creator_status"]
          suspension_reason?: string | null
          theme_accent?: string | null
          theme_primary?: string | null
          theme_secondary?: string | null
          total_raised?: number | null
          total_referral_earnings?: number | null
          total_supporters?: number | null
          total_votes?: number | null
          tribe_name?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          approved_at?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          category_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_partner?: boolean | null
          is_verified?: boolean | null
          kyc_verified?: boolean | null
          mpesa_phone?: string | null
          paypal_email?: string | null
          referral_code?: string | null
          referral_tier?: number | null
          referred_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["creator_status"]
          suspension_reason?: string | null
          theme_accent?: string | null
          theme_primary?: string | null
          theme_secondary?: string | null
          total_raised?: number | null
          total_referral_earnings?: number | null
          total_supporters?: number | null
          total_votes?: number | null
          tribe_name?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "creators_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "creator_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creators_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          creator_amount: number | null
          creator_id: string
          currency: string | null
          donor_email: string | null
          donor_name: string | null
          donor_phone: string | null
          id: string
          is_anonymous: boolean | null
          message: string | null
          mpesa_receipt: string | null
          payment_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference: string | null
          platform_fee: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          creator_amount?: number | null
          creator_id: string
          currency?: string | null
          donor_email?: string | null
          donor_name?: string | null
          donor_phone?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          mpesa_receipt?: string | null
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference?: string | null
          platform_fee?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_amount?: number | null
          creator_id?: string
          currency?: string | null
          donor_email?: string | null
          donor_name?: string | null
          donor_phone?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          mpesa_receipt?: string | null
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference?: string | null
          platform_fee?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          banner_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          event_date: string
          event_end_date: string | null
          event_type: string | null
          id: string
          is_featured: boolean | null
          location: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          event_date: string
          event_end_date?: string | null
          event_type?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          event_date?: string
          event_end_date?: string | null
          event_type?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_types: {
        Row: {
          animation_url: string | null
          created_at: string
          display_order: number | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          animation_url?: string | null
          created_at?: string
          display_order?: number | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          animation_url?: string | null
          created_at?: string
          display_order?: number | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      gifts: {
        Row: {
          created_at: string
          creator_amount: number
          creator_id: string
          gift_type_id: string
          id: string
          message: string | null
          mpesa_receipt: string | null
          payment_provider: string | null
          payment_reference: string | null
          platform_fee: number | null
          quantity: number | null
          sender_email: string | null
          sender_name: string | null
          sender_phone: string | null
          status: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          creator_amount: number
          creator_id: string
          gift_type_id: string
          id?: string
          message?: string | null
          mpesa_receipt?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          platform_fee?: number | null
          quantity?: number | null
          sender_email?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
          total_amount: number
        }
        Update: {
          created_at?: string
          creator_amount?: number
          creator_id?: string
          gift_type_id?: string
          id?: string
          message?: string | null
          mpesa_receipt?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          platform_fee?: number | null
          quantity?: number | null
          sender_email?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "gifts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_gift_type_id_fkey"
            columns: ["gift_type_id"]
            isOneToOne: false
            referencedRelation: "gift_types"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      merchandise: {
        Row: {
          category_id: string | null
          colors: Json | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          images: Json | null
          is_active: boolean | null
          is_approved: boolean | null
          name: string
          price: number
          sizes: Json | null
          stock: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          colors?: Json | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_approved?: boolean | null
          name: string
          price: number
          sizes?: Json | null
          stock?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          colors?: Json | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_approved?: boolean | null
          name?: string
          price?: number
          sizes?: Json | null
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchandise_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "merch_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchandise_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          color: string | null
          created_at: string
          id: string
          merchandise_id: string
          order_id: string
          quantity: number
          size: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          merchandise_id: string
          order_id: string
          quantity: number
          size?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          merchandise_id?: string
          order_id?: string
          quantity?: number
          size?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_merchandise_id_fkey"
            columns: ["merchandise_id"]
            isOneToOne: false
            referencedRelation: "merchandise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          creator_amount: number | null
          creator_id: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          order_number: string | null
          payment_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference: string | null
          platform_fee: number | null
          shipping_address: Json | null
          shipping_fee: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_amount?: number | null
          creator_id: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference?: string | null
          platform_fee?: number | null
          shipping_address?: Json | null
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax?: number | null
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_amount?: number | null
          creator_id?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference?: string | null
          platform_fee?: number | null
          shipping_address?: Json | null
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_configs: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          name: string
          provider: Database["public"]["Enums"]["payment_provider"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name: string
          provider: Database["public"]["Enums"]["payment_provider"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          level: number
          percentage: number
          referrer_id: string
          source_creator_id: string
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          level: number
          percentage: number
          referrer_id: string
          source_creator_id: string
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          level?: number
          percentage?: number
          referrer_id?: string
          source_creator_id?: string
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_earnings_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_source_creator_id_fkey"
            columns: ["source_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          level: number
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean | null
          max_per_order: number | null
          name: string
          price: number
          quantity_available: number
          quantity_sold: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          max_per_order?: number | null
          name: string
          price: number
          quantity_available: number
          quantity_sold?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          max_per_order?: number | null
          name?: string
          price?: number
          quantity_available?: number
          quantity_sold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          id: string
          payment_reference: string | null
          qr_code: string | null
          scanned_at: string | null
          scanned_by: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_type_id: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          id?: string
          payment_reference?: string | null
          qr_code?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_type_id: string
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          id?: string
          payment_reference?: string | null
          qr_code?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          creator_id: string
          currency: string | null
          description: string | null
          fee: number | null
          id: string
          net_amount: number
          payment_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          creator_id: string
          currency?: string | null
          description?: string | null
          fee?: number | null
          id?: string
          net_amount: number
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          creator_id?: string
          currency?: string | null
          description?: string | null
          fee?: number | null
          id?: string
          net_amount?: number
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          mpesa_receipt: string | null
          nominee_id: string
          payment_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference: string | null
          platform_fee: number | null
          status: Database["public"]["Enums"]["vote_status"] | null
          vote_count: number | null
          voter_email: string | null
          voter_phone: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string
          id?: string
          mpesa_receipt?: string | null
          nominee_id: string
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference?: string | null
          platform_fee?: number | null
          status?: Database["public"]["Enums"]["vote_status"] | null
          vote_count?: number | null
          voter_email?: string | null
          voter_phone?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          mpesa_receipt?: string | null
          nominee_id?: string
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_reference?: string | null
          platform_fee?: number | null
          status?: Database["public"]["Enums"]["vote_status"] | null
          vote_count?: number | null
          voter_email?: string | null
          voter_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "award_nominees"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          fee: number | null
          id: string
          net_amount: number
          payment_details: Json | null
          payment_method: Database["public"]["Enums"]["payment_provider"] | null
          processed_at: string | null
          processed_by: string | null
          reference: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["withdrawal_status"] | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          fee?: number | null
          id?: string
          net_amount: number
          payment_details?: Json | null
          payment_method?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          fee?: number | null
          id?: string
          net_amount?: number
          payment_details?: Json | null
          payment_method?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_creator_balance: { Args: { _creator_id: string }; Returns: number }
      get_creator_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_creator: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "creator" | "user"
      creator_status: "pending" | "approved" | "suspended" | "rejected"
      event_status:
        | "draft"
        | "pending"
        | "approved"
        | "live"
        | "ended"
        | "cancelled"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_provider: "mpesa" | "paypal" | "card"
      ticket_status: "valid" | "used" | "cancelled" | "expired"
      transaction_type:
        | "donation"
        | "merchandise"
        | "ticket"
        | "vote"
        | "withdrawal"
        | "refund"
        | "fee"
        | "payout"
      vote_status: "pending" | "confirmed" | "failed"
      withdrawal_status:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
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
      app_role: ["admin", "creator", "user"],
      creator_status: ["pending", "approved", "suspended", "rejected"],
      event_status: [
        "draft",
        "pending",
        "approved",
        "live",
        "ended",
        "cancelled",
      ],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_provider: ["mpesa", "paypal", "card"],
      ticket_status: ["valid", "used", "cancelled", "expired"],
      transaction_type: [
        "donation",
        "merchandise",
        "ticket",
        "vote",
        "withdrawal",
        "refund",
        "fee",
        "payout",
      ],
      vote_status: ["pending", "confirmed", "failed"],
      withdrawal_status: [
        "pending",
        "approved",
        "processing",
        "completed",
        "rejected",
      ],
    },
  },
} as const
