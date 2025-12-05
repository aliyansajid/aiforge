"use client";

import { TrendingUp, BarChart3 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@repo/ui/components/chart";

interface RequestVolumeChartProps {
  data: {
    timestamp: Date | string;
    value: number;
  }[];
}

const chartConfig = {
  requests: {
    label: "Requests",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function RequestVolumeChart({ data }: RequestVolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Request Volume</CardTitle>
          <CardDescription>API requests over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No request data available yet
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = data.map((point) => {
    const timestamp =
      typeof point.timestamp === "string"
        ? new Date(point.timestamp)
        : point.timestamp;
    return {
      time: format(timestamp, "HH:mm"),
      requests: point.value,
    };
  });

  // Calculate trend
  const totalRequests = data.reduce((sum, point) => sum + point.value, 0);
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  const firstHalfTotal = firstHalf.reduce((sum, point) => sum + point.value, 0);
  const secondHalfTotal = secondHalf.reduce(
    (sum, point) => sum + point.value,
    0
  );
  const trendPercentage =
    firstHalfTotal > 0
      ? (((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100).toFixed(1)
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Volume</CardTitle>
        <CardDescription>API requests over the last 24 hours</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="requests"
              type="monotone"
              fill="var(--color-requests)"
              fillOpacity={0.4}
              stroke="var(--color-requests)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {Number(trendPercentage) > 0 ? "Trending up" : "Trending down"} by{" "}
              {Math.abs(Number(trendPercentage))}%{" "}
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Showing {totalRequests.toLocaleString()} total requests in the
              last 24 hours
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
