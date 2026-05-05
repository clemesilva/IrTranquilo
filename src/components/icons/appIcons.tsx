import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Accessibility,
  ArrowLeft,
  ArrowUpDown,
  Tag,
  Armchair,
  BookOpen,
  Banknote,
  Building2,
  Dumbbell,
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
  Scale,
  FileText,
  ExternalLink,
  Footprints,
  TriangleRight,
  Route,
  Toilet,
  Shuffle,
  PawPrint,
  ChevronDown,
  Dog,
  SquareArrowUp,
  Bath,
  MoveRight,
  Smile,
  HandHelping,
  Clock,
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
      return render(BookOpen, props);
    case 'deporte':
      // Fallback: “deporte” sin Dumbbell en algunas versiones
      return render(Dumbbell, props);
    case 'alojamiento':
      return render(Building2, props);
    case 'inclusion':
      return render(Users, props);
    case 'otro':
      return render(Flag, props);
  }
}

export function categoryIconSvgString(
  category: PlaceCategory,
  size = 13,
  color = 'white',
): string {
  const icon = createElement(CategoryIcon, { category, size, stroke: color, color });
  return renderToStaticMarkup(icon);
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
    case 'service_dogs_allowed':
      return render(PawPrint, props);
    case 'ramp_available':
      return render(TriangleRight, props);
    case 'non_slip_surface':
      return render(Footprints, props);
    case 'accessible_route':
      return render(Route, props);
    case 'elevator_available':
      return render(ArrowUpDown, props);
    case 'mechanical_stairs':
      return render(Shuffle, props);
    case 'wide_entrance':
      return render(DoorOpen, props);
    case 'circulation_clear':
      return render(MoveHorizontal, props);
    case 'lowered_counter':
      return render(Armchair, props);
    case 'accessible_bathroom':
      return render(Toilet, props);
    case 'dining_table_accessible':
      return render(Utensils, props);
    case 'staff_kind':
      return render(Smile, props);
    case 'staff_helpful':
      return render(HandHelping, props);
    case 'staff_patient':
      return render(Clock, props);
  }
}

export const AppIcons = {
  Accessibility,
  ArrowLeft,
  ArrowUpDown,
  ClipboardList,
  Tag,
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
  Scale,
  FileText,
  ExternalLink,
  BookOpen,
  ChevronDown,
  Dog,
  SquareArrowUp,
  Bath,
  MoveRight,
  Footprints,
  Route,
  Toilet,
  PawPrint,
  Utensils,
  TriangleRight,
} as const;

