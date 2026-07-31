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

export function OrgIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || User;
  return <Icon className={className} />;
}
