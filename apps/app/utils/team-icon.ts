/**
 * Maps Lucide icon names (from database) to public PNG filenames
 */
const ICON_MAP: Record<string, string> = {
  Building2: "building-2",
  Briefcase: "briefcase",
  Rocket: "rocket",
  Lightbulb: "lightbulb",
  Target: "target",
  Zap: "zap",
  Code: "code",
  Palette: "palette",
  Globe: "globe",
  Users: "users",
  Package: "package",
  Shield: "shield",
  Star: "star",
  Heart: "heart",
  Flag: "flag",
  Award: "award",
  Sparkles: "sparkles",
  Crown: "crown",
  Gem: "gem",
  Atom: "atom",
};

/**
 * Get full URL for team icon
 */
export function getTeamIconUrl(iconName: string | null | undefined): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!iconName) {
    return `${baseUrl}/building-2.png`; // Default fallback
  }

  const filename = ICON_MAP[iconName];

  if (!filename) {
    console.warn(`Unknown icon: ${iconName}, using default`);
    return `${baseUrl}/building-2.png`;
  }

  return `${baseUrl}/${filename}.png`;
}
