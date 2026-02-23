// Minimal database types — extend as tables are used
// Full types can be generated: npx supabase gen types typescript --project-id <ref>

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          username: string | null
          subscription_tier: 'COMMUNITY' | 'PROFESSIONAL' | 'MAX' | null
          phantom_wallet_hash: string | null
          blockchain_token_x: number | null
          blockchain_token_y: number | null
          start_agent_id: string | null
          empire_color: number
          max_deploy_tier: 'haiku' | 'sonnet' | 'opus'
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      agents: {
        Row: {
          id: string
          user_id: string | null
          chain_x: number
          chain_y: number
          visual_x: number
          visual_y: number
          tier: 'haiku' | 'sonnet' | 'opus'
          is_primary: boolean
          username: string | null
          bio: string | null
          intro_message: string | null
          density: number
          storage_slots: number
          stake: number
          border_radius: number
          mining_rate: number
          cpu_per_turn: number
          staked_cpu: number
          parent_agent_id: string | null
          synced_at: string
        }
        Insert: Partial<Database['public']['Tables']['agents']['Row']> & { id: string; chain_x: number; chain_y: number; visual_x: number; visual_y: number }
        Update: Partial<Database['public']['Tables']['agents']['Row']>
      }
      chain_status: {
        Row: {
          id: number
          state_root: string
          blocks_processed: number
          total_claims: number
          community_pool_remaining: number
          total_mined: number
          next_block_in: number
          synced_at: string
        }
        Insert: Partial<Database['public']['Tables']['chain_status']['Row']>
        Update: Partial<Database['public']['Tables']['chain_status']['Row']>
      }
      user_resources: {
        Row: {
          user_id: string
          energy: number
          minerals: number
          agntc_balance: number
          secured_chains: number
          turn: number
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['user_resources']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['user_resources']['Row']>
      }
      planets: {
        Row: { id: string; agent_id: string | null; user_id: string; content: string; content_type: string; is_zero_knowledge: boolean; created_at: string }
        Insert: Omit<Database['public']['Tables']['planets']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['planets']['Row']>
      }
      haiku_messages: {
        Row: { id: string; sender_agent_id: string | null; text: string; syllables: number[]; position_x: number; position_y: number; timestamp: number }
        Insert: Database['public']['Tables']['haiku_messages']['Row']
        Update: Partial<Database['public']['Tables']['haiku_messages']['Row']>
      }
      chain_messages: {
        Row: { id: string; sender_chain_x: number; sender_chain_y: number; target_chain_x: number; target_chain_y: number; text: string; timestamp: number }
        Insert: Database['public']['Tables']['chain_messages']['Row']
        Update: Partial<Database['public']['Tables']['chain_messages']['Row']>
      }
      diplomatic_states: {
        Row: { agent_a_id: string; agent_b_id: string; exchange_count: number; opinion: number; clarity_level: number; last_exchange: number | null }
        Insert: Partial<Database['public']['Tables']['diplomatic_states']['Row']> & { agent_a_id: string; agent_b_id: string }
        Update: Partial<Database['public']['Tables']['diplomatic_states']['Row']>
      }
      research_progress: {
        Row: { user_id: string; research_id: string; energy_invested: number; completed: boolean }
        Insert: Database['public']['Tables']['research_progress']['Row']
        Update: Partial<Database['public']['Tables']['research_progress']['Row']>
      }
    }
  }
}
