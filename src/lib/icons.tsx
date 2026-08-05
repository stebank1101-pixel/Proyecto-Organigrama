import {
  Award,
  Briefcase,
  Cpu,
  Crown,
  Globe,
  LucideIcon,
  Palette,
  Server,
  Shield,
  Target,
  User,
  Users,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Crown,
  Cpu,
  Users,
  Briefcase,
  Server,
  Palette,
  Globe,
  Target,
  Shield,
  Award,
  User,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

// Spanish display labels for the icon picker — keys stay in English since they're
// persisted as the stored iconName and looked up directly in ICON_MAP.
export const ICON_LABELS: Record<string, string> = {
  Crown: "Corona",
  Cpu: "Procesador",
  Users: "Personas",
  Briefcase: "Maletín",
  Server: "Servidor",
  Palette: "Paleta",
  Globe: "Globo",
  Target: "Objetivo",
  Shield: "Escudo",
  Award: "Premio",
  User: "Usuario",
};

export function OrgIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || User;
  return <Icon className={className} />;
}
