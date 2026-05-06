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
  Trash2,
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

const CATEGORY_PATHS: Record<PlaceCategory, string> = {
  alimentacion: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>',
  comercio: '<path d="M16 10a4 4 0 0 1-8 0"></path><path d="M3.103 6.034h17.794"></path><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"></path>',
  salud: '<path d="M11 2v2"></path><path d="M5 2v2"></path><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"></path><path d="M8 15a6 6 0 0 0 12 0v-3"></path><circle cx="20" cy="10" r="2"></circle>',
  educacion: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path><path d="M22 10v6"></path><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>',
  instituciones: '<path d="M10 18v-7"></path><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"></path><path d="M14 18v-7"></path><path d="M18 18v-7"></path><path d="M3 22h18"></path><path d="M6 18v-7"></path>',
  servicios: '<rect width="20" height="12" x="2" y="6" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path>',
  espacios_publicos: '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"></path><path d="M12 22v-3"></path>',
  cultura: '<path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>',
  deporte: '<path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"></path><path d="m2.5 21.5 1.4-1.4"></path><path d="m20.1 3.9 1.4-1.4"></path><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"></path><path d="m9.6 14.4 4.8-4.8"></path>',
  alojamiento: '<path d="M10 12h4"></path><path d="M10 8h4"></path><path d="M14 21v-3a2 2 0 0 0-4 0v3"></path><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"></path><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"></path>',
  inclusion: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M16 3.128a4 4 0 0 1 0 7.744"></path><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><circle cx="9" cy="7" r="4"></circle>',
  otro: '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"></path>',
};

export function categoryIconSvgString(
  category: PlaceCategory,
  size = 13,
  color = 'white',
): string {
  const paths = CATEGORY_PATHS[category] ?? CATEGORY_PATHS.otro;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
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
  Smile,
  HandHelping,
  Clock,
  Users,
  Trash: Trash2,
} as const;

