import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

import { ThemeProvider } from '@/components/theme-provider'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

export const Route = createRootRoute({
    component: () => (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <Outlet />
                {import.meta.env.DEV && (
                    <>
                        <ReactQueryDevtools initialIsOpen={false} />
                        <TanStackRouterDevtools />
                    </>
                )}
            </ThemeProvider>
        </QueryClientProvider>
    ),
})
