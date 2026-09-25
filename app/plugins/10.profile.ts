export default defineNuxtPlugin(async () => {
    const user = useSupabaseUser()
    const profileStore = useProfileStore()

    // Fetch profile if user exists (works on both SSR and Client)
    if (user.value) {
        await profileStore.fetchMe()
    }

    // Auth state changes only matter on the client
    if (import.meta.client) {
        const currentUrl = new URL(window.location.href)
        const hashParams = new URLSearchParams(currentUrl.hash.startsWith('#') ? currentUrl.hash.substring(1) : currentUrl.hash)
        const queryType = currentUrl.searchParams.get('type')
        const hashType = hashParams.get('type')
        const flow = queryType || hashType
        const referrer = document.referrer || ''
        const inferredFlow = referrer.includes('type=recovery')
            ? 'recovery'
            : referrer.includes('type=invite')
                ? 'invite'
                : null
        const isAuthReturn = Boolean(
            currentUrl.searchParams.get('code') ||
            hashParams.get('access_token') ||
            hashParams.get('refresh_token') ||
            flow === 'recovery' ||
            flow === 'invite'
        )

        const effectiveFlow = flow || inferredFlow
        if (isAuthReturn && currentUrl.pathname !== '/confirm' && (effectiveFlow === 'recovery' || effectiveFlow === 'invite')) {
            window.location.replace(`/confirm?flow=${effectiveFlow}${currentUrl.hash || ''}`)
            return
        }

        const supabase = useSupabaseClient()
        supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                if (window.location.pathname !== '/confirm') {
                    window.location.replace(`/confirm?flow=recovery${window.location.hash || ''}`)
                }
                return
            }

            if (event === 'SIGNED_IN') {
                if (window.location.hash || window.location.search) {
                    const hash = window.location.hash || ''
                    const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash)
                    const type = params.get('type') || new URLSearchParams(window.location.search).get('type')
                    if ((type === 'recovery' || type === 'invite') && window.location.pathname !== '/confirm') {
                        window.location.replace(`/confirm?flow=${type}${hash}`)
                        return
                    }
                }
                profileStore.fetchMe()
            } else if (event === 'SIGNED_OUT') {
                profileStore.clearProfile()
            }
        })
    }
})
