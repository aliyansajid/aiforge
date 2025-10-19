"use client";

import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import * as LucideIcons from "lucide-react";

// Curated list of team/workspace appropriate icons
const TEAM_ICONS = [
  "Building2",
  "Briefcase",
  "Rocket",
  "Lightbulb",
  "Target",
  "Zap",
  "Code",
  "Palette",
  "Globe",
  "Users",
  "Package",
  "Shield",
  "Star",
  "Heart",
  "Flag",
  "Award",
  "Sparkles",
  "Crown",
  "Gem",
  "Atom",
] as const;

interface IconPickerProps {
  value?: string;
  onSelect: (icon: string) => void;
}

export function IconPicker({ value = "Building2", onSelect }: IconPickerProps) {
  const [open, setOpen] = React.useState(false);

  // Get the icon component
  const IconComponent = (LucideIcons as any)[value] || LucideIcons.Building2;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="w-full" asChild>
        <Button variant="outline">
          <IconComponent />
          <span className="flex-1 text-left">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="grid grid-cols-5">
          {TEAM_ICONS.map((iconName) => {
            const Icon = (LucideIcons as any)[iconName];
            const isSelected = value === iconName;

            return (
              <Button
                key={iconName}
                variant="ghost"
                className={cn(
                  "h-12 w-12 hover:bg-accent",
                  isSelected && "bg-accent"
                )}
                onClick={() => {
                  onSelect(iconName);
                  setOpen(false);
                }}
              >
                <Icon />
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
