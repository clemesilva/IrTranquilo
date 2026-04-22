import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Accessibility,
  ArrowUpDown,
  Armchair,
  Backpack,
  Banknote,
  Building2,
  Bus,
  Camera,
  Car,
  CircleHelp,
  ClipboardList,
  Construction,
  DoorOpen,
  Droplets,
  Film,
  Flag,
  Folder,
  Globe,
  GraduationCap,
  Heart,
  Landmark,
  LogOut,
  MapPin,
  MoveHorizontal,
  MoveVertical,
  ParkingCircle,
  Phone,
  Plus,
  Ruler,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Signpost,
  Star,
  Stethoscope,
  Target,
  TreePine,
  Utensils,
  Users,
  X,
  TriangleAlert,
  Send,
} from 'lucide-react';
import type { PlaceCategory } from '@/types/place';
import type { AccessibilityReviewKey } from '@/types/reviewAccessibility';

type IconProps = Omit<ComponentProps<'svg'>, 'ref'> & {
  size?: number;
};

function render(Icon: LucideIcon, props: IconProps) {
  const { size = 16, ...rest } = props;
  return <Icon width={size} height={size} aria-hidden focusable={false} {...rest} />;
}

export function CategoryIcon({
  category,
  ...props
}: { category: PlaceCategory } & IconProps) {
  switch (category) {
    case 'alimentacion':
      return render(Utensils, props);
    case 'comercio':
      return render(ShoppingBag, props);
    case 'salud':
      return render(Stethoscope, props);
    case 'educacion':
      return render(GraduationCap, props);
    case 'instituciones':
      return render(Landmark, props);
    case 'servicios':
      // Fallback: en algunas versiones no existe Briefcase
      return render(Banknote, props);
    case 'espacios_publicos':
      return render(TreePine, props);
    case 'cultura':
      // Fallback: “cultura” sin TheatreMask en algunas versiones
      return render(Backpack, props);
    case 'deporte':
      // Fallback: “deporte” sin Dumbbell en algunas versiones
      return render(Bus, props);
    case 'alojamiento':
      return render(Building2, props);
    case 'inclusion':
      return render(Users, props);
    case 'otro':
      return render(Flag, props);
  }
}

export function AccessibilityFieldIcon({
  fieldKey,
  ...props
}: { fieldKey: AccessibilityReviewKey } & IconProps) {
  switch (fieldKey) {
    case 'parking_accessible':
      return render(Accessibility, props);
    case 'nearby_parking':
      return render(ParkingCircle, props);
    case 'signage_clear':
      return render(Signpost, props);
    case 'ramp_available':
      return render(DoorOpen, props);
    case 'mechanical_stairs':
      return render(DoorOpen, props);
    case 'elevator_available':
      return render(MoveHorizontal, props);
    case 'wide_entrance':
      return render(Ruler, props);
    case 'accessible_bathroom':
      return render(Building2, props);
    case 'circulation_clear':
      return render(MoveHorizontal, props);
    case 'lowered_counter':
      return render(Armchair, props);
  }
}

export const AppIcons = {
  Accessibility,
  ArrowUpDown,
  ClipboardList,
  Droplets,
  LogOut,
  MapPin,
  MoveHorizontal,
  MoveVertical,
  ParkingCircle,
  Plus,
  Search,
  Share2,
  Signpost,
  Star,
  Settings,
  Folder,
  Target,
  Heart,
  Camera,
  Film,
  Phone,
  Globe,
  Car,
  DoorOpen,
  Building2,
  TriangleAlert,
  CircleHelp,
  Construction,
  X,
  Send,
} as const;

