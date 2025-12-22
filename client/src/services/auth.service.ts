import type { User, LoginDto, RegisterDto, AuthResponse } from '@/types/auth.types'

import { api } from './api/client'
import { API_ENDPOINTS } from './api/endpoints'


export const authService = {
    async login(dto: LoginDto): Promise<AuthResponse> {
        const { data } = await api.post<AuthResponse>(
            API_ENDPOINTS.AUTH.LOGIN,
            dto
        )
        return data
    },

    async register(dto: RegisterDto): Promise<AuthResponse> {
        const { data } = await api.post<AuthResponse>(
            API_ENDPOINTS.AUTH.REGISTER,
            dto
        )
        return data
    },

    async logout(): Promise<void> {
        await api.post(API_ENDPOINTS.AUTH.LOGOUT)
    },

    async getCurrentUser(): Promise<User> {
        const { data } = await api.get<User>(API_ENDPOINTS.AUTH.ME)
        return data
    },
}
