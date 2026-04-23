import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '../context/useAuth';
import { usePlaces } from '../context/usePlaces';
import { bandBadgeVariant, bandLabelEs } from '../lib/rating';
import { CATEGORIES, getCategoryMeta, type PlaceCategory } from '../types/place';
import {
  ACCESSIBILITY_FIELD_GROUPS,
  type AccessibilityReviewKey,
} from '../types/reviewAccessibility';
import { AppIcons } from '@/components/icons/appIcons';

const SIDEBAR_ACCESSIBILITY_KEYS: AccessibilityReviewKey[] = [
  'parking_accessible',
  'nearby_parking',
  'ramp_available',
  'accessible_bathroom',
  'lowered_counter',
];

const accessibilityFieldByKey = new Map(
  ACCESSIBILITY_FIELD_GROUPS.flatMap((g) =>
    g.fields.map((f) => [f.key, f] as const),
  ),
);

export function SidebarHome() {
  const {
    filteredPlaces,
    search,
    setSearch,
    category,
    setCategory,
    filters,
    toggleFilter,
  } = usePlaces();

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <Card size='sm'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>AndaTranquilo</CardTitle>
              <CardDescription>
                Lugares con información de accesibilidad
              </CardDescription>
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Saliendo...' : 'Salir'}
            </Button>
          </div>
          <p className='text-xs text-muted-foreground pt-2'>
            Hola, {user?.email}
          </p>
        </CardHeader>
      </Card>

      <div className='space-y-2'>
        <Label htmlFor='place-search'>Buscar</Label>
        <Input
          id='place-search'
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Nombre o dirección'
          autoComplete='off'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='place-category'>Categoría</Label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as PlaceCategory | 'all')}
        >
          <SelectTrigger id='place-category' className='w-full'>
            <SelectValue placeholder='Categoría' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Todas</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card size='sm'>
        <CardHeader className='pb-0'>
          <CardTitle className='text-sm'>Accesibilidad</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 pt-2'>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='filter-recommended'
              checked={filters.recommendedOnly}
              onCheckedChange={() => toggleFilter('recommendedOnly')}
            />
            <Label htmlFor='filter-recommended' className='text-sm font-normal'>
              Solo recomendados (≥ 4.5)
            </Label>
          </div>
          {SIDEBAR_ACCESSIBILITY_KEYS.map((key) => {
            const f = accessibilityFieldByKey.get(key);
            if (!f) return null;
            const id = `filter-${key}`;
            return (
              <div key={key} className='flex items-center gap-2'>
                <Checkbox
                  id={id}
                  checked={filters[key]}
                  onCheckedChange={() => toggleFilter(key)}
                />
                <Label
                  htmlFor={id}
                  title={f.description}
                  className='cursor-help text-sm font-normal'
                >
                  {f.label}
                </Label>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className='flex min-h-0 flex-1 flex-col gap-2'>
        <p className='text-sm font-medium text-muted-foreground'>
          Lugares ({filteredPlaces.length})
        </p>
        <ScrollArea className='h-[min(420px,45vh)]'>
          <div className='flex flex-col gap-2 pr-3'>
            {filteredPlaces.map((p) => (
              <Link
                key={p.id}
                to={`/places/${p.id}`}
                className='block rounded-xl bg-card text-card-foreground ring-1 ring-border/80 transition-colors hover:bg-muted/40'
              >
                <div className='space-y-1 p-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <span className='font-medium leading-snug'>{p.name}</span>
                    <Badge variant={bandBadgeVariant(p.band)}>
                      {bandLabelEs(p.band)}
                    </Badge>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {getCategoryMeta(p.category).label} ·{' '}
                    <AppIcons.Star className='inline h-3.5 w-3.5 text-amber-500' aria-hidden />{' '}
                    {p.avgRating.toFixed(1)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Button className='w-full' asChild>
        <Link to='/places/new'>Agregar lugar</Link>
      </Button>
    </div>
  );
}
