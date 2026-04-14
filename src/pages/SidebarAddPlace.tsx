import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AddPlacePanel } from '@/components/places/AddPlacePanel'

export function SidebarAddPlace() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const draftLatLng = useMemo((): [number, number] | null => {
    const draftLat = searchParams.get('draftLat')
    const draftLng = searchParams.get('draftLng')
    if (!draftLat || !draftLng) return null
    return [Number(draftLat), Number(draftLng)]
  }, [searchParams])

  const setDraftLatLng = (next: [number, number] | null) => {
    const nextParams = new URLSearchParams(searchParams)
    if (next) {
      nextParams.set('draftLat', String(next[0]))
      nextParams.set('draftLng', String(next[1]))
    } else {
      nextParams.delete('draftLat')
      nextParams.delete('draftLng')
    }
    setSearchParams(nextParams)
  }

  return (
    <div className="mx-auto mt-4 flex w-full max-w-[620px] flex-col gap-4 px-3 pb-3">
      <Button variant="ghost" size="lg" className="w-fit px-0 text-base" asChild>
        <Link to="/">← Volver</Link>
      </Button>
      <AddPlacePanel
        draftLatLng={draftLatLng}
        onDraftLatLngChange={setDraftLatLng}
        onClose={() => navigate('/')}
        onSaved={() => navigate('/')}
      />
    </div>
  )
}
