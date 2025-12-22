import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/use-auth-store'
import type { LoginDto, RegisterDto } from '@/types/auth.types'

export function useLogin() {
    const setAuth = useAuthStore((state) => state.setAuth)

    return useMutation({
        mutationFn: (dto: LoginDto) => authService.login(dto),
        onSuccess: (data) => {
            setAuth(data.token, data.user)
        },
    })
}

export function useRegister() {
    const setAuth = useAuthStore((state) => state.setAuth)

    return useMutation({
        mutationFn: (dto: RegisterDto) => authService.register(dto),
        onSuccess: (data) => {
            setAuth(data.token, data.user)
        },
    })
}

export function useLogout() {
    const logout = useAuthStore((state) => state.logout)
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => authService.logout(),
        onSuccess: () => {
            logout()
            queryClient.clear()
        },
    })
}

export function useCurrentUser() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

    return useQuery({
        queryKey: ['currentUser'],
        queryFn: authService.getCurrentUser,
        enabled: isAuthenticated,
    })
}
