export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        ME: '/auth/me',
    },
    USERS: {
        LIST: '/users',
        DETAIL: (id: string) => `/users/${id}`,
        CREATE: '/users',
        UPDATE: (id: string) => `/users/${id}`,
        DELETE: (id: string) => `/users/${id}`,
    },
} as const
