import { Outlet, useParams } from 'react-router-dom'
import { PlacesMap } from '../components/map/PlacesMap'

export function MainLayout() {
  const { placeId } = useParams()
  const parsed =
    placeId !== undefined && placeId !== '' ? Number(placeId) : undefined
  const highlightId =
    parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground antialiased">
      <aside className="flex w-[min(360px,40vw)] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <Outlet />
        </div>
      </aside>
      <main
        className="min-h-0 min-w-0 flex-1 bg-muted/30"
        aria-label="Mapa de lugares"
      >
        <PlacesMap highlightId={highlightId} />
      </main>
    </div>
  )
}
