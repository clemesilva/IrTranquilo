import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SidebarAddPlace() {
  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" className="w-fit px-0" asChild>
        <Link to="/">← Volver</Link>
      </Button>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Agregar lugar</CardTitle>
          <CardDescription>
            Próximo paso: formulario, geocoding y guardado en Supabase.
          </CardDescription>
        </CardHeader>
      </Card>
      <ol className="m-0 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Nombre</li>
        <li>Categoría</li>
        <li>Dirección</li>
        <li>Geocoding → lat/lng</li>
        <li>Pin en mapa (arrastrable)</li>
        <li>Guardar</li>
      </ol>
    </div>
  )
}
