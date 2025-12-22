import { createFileRoute } from '@tanstack/react-router'

import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function Index() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="absolute top-4 right-4">
                <ModeToggle />
            </div>

            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-4xl font-bold">Welcome to React Modern Stack</CardTitle>
                    <CardDescription>
                        A production-ready setup with TanStack Router, React Query, Zustand & shadcn/ui
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">🚀 TanStack Router</h3>
                            <p className="text-sm text-muted-foreground">File-based routing with type safety</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">🔄 React Query</h3>
                            <p className="text-sm text-muted-foreground">Powerful data fetching & caching</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">🐻 Zustand</h3>
                            <p className="text-sm text-muted-foreground">Simple & scalable state management</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">🎨 shadcn/ui</h3>
                            <p className="text-sm text-muted-foreground">Beautiful & accessible components</p>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button asChild>
                            <a href="/products">Quản lý Products</a>
                        </Button>
                        <Button asChild variant="secondary">
                            <a href="/about">Go to About</a>
                        </Button>
                        <Button variant="outline" asChild>
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                                View Documentation
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export const Route = createFileRoute('/')({
    component: Index,
})
