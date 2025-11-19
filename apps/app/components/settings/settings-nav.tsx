"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui/lib/utils";
import { Users, Settings, CreditCard } from "lucide-react";

const iconMap = {
  Users,
  Settings,
  CreditCard,
};

type IconName = keyof typeof iconMap;

interface NavigationItem {
  name: string;
  href: string;
  icon: IconName;
}

interface SettingsNavProps {
  items: NavigationItem[];
}

export function SettingsNav({ items }: SettingsNavProps) {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0">
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = iconMap[item.icon];

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
