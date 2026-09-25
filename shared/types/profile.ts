export interface Profile {
  id: string
  email: string
  name: string
  role: 'admin' | 'equipe' | 'user'
  phone?: string
  company?: string
  avatar_url?: string | null
  created_at: string
}
