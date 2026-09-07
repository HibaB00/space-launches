import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function App() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-baseline justify-between border-b border-border pb-3 text-xs uppercase tracking-widest text-muted-foreground">
        <h1>space-launches</h1>
        <span>next 20 orbital launches</span>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xs font-normal uppercase tracking-widest text-muted-foreground">
            Next launch <Badge>GO</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-5xl">
            T-00d 03h 41m 07s<span className="cursor" aria-hidden="true">▌</span>
          </p>
          <p className="mt-2 text-muted-foreground">Falcon 9 Block 5 · USSF-153 · Vandenberg SFB, CA, USA</p>
        </CardContent>
      </Card>
    </main>
  )
}
