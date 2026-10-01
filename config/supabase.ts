import type { ModuleOptions } from '@nuxtjs/supabase'

const supabaseConfig: Partial<ModuleOptions> = {
  types: '@@/shared/types/database.types.ts',
  secretKey: process.env.SUPABASE_SECRET_KEY,
  useSsrCookies: true,
  redirect: true,
  redirectOptions: {
    login: '/login',
    callback: '/confirm',
    include: undefined,
    exclude: ['/recovery'],
    saveRedirectToCookie: false
  },
  cookieOptions: {
    maxAge: 60 * 60 * 8,
    sameSite: 'lax',
    secure: true
  }
}

export default supabaseConfig
