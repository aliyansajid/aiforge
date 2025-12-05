"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Badge } from "@repo/ui/components/badge";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";

interface MetricSummary {
  current: number;
  average: number;
  min: number;
  max: number;
  trend: "up" | "down" | "stable";
}

interface MetricCardProps {
  title: string;
  description?: string;
  value: string | number;
  summary?: MetricSummary;
  icon?: LucideIcon;
  unit?: string;
  formatter?: (value: number) => string;
}

export function MetricCard({
  title,
  description,
  value,
  summary,
  icon: Icon,
  unit,
  formatter,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!summary) return null;

    switch (summary.trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    if (!summary) return "secondary";

    switch (summary.trend) {
      case "up":
        return "default";
      case "down":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatValue = (val: number) => {
    if (formatter) return formatter(val);
    return `${val.toFixed(2)}${unit || ""}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === "string" ? value : formatValue(value)}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {summary && (
          <div className="flex items-center gap-2 mt-3">
            <Badge
              variant={getTrendColor() as any}
              className="flex items-center gap-1"
            >
              {getTrendIcon()}
              {summary.trend}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Avg: {formatValue(summary.average)}
            </span>
            <span className="text-xs text-muted-foreground">
              Min: {formatValue(summary.min)}
            </span>
            <span className="text-xs text-muted-foreground">
              Max: {formatValue(summary.max)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
