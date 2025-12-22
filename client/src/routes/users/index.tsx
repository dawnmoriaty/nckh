import { createFileRoute } from '@tanstack/react-router'

const Users = () => {
    return (
        <div>index</div>
    )
}

export const Route = createFileRoute('/users/')({
    component: Users,
})