"use client";

import { TrendingUp, TrendingDown, Zap } from "lucide-react";
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

interface ResponseTimeChartProps {
  data: {
    timestamp: Date | string;
    value: number;
  }[];
}

const chartConfig = {
  latency: {
    label: "Latency",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Response Time Trends</CardTitle>
          <CardDescription>
            Average response time over the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No response time data available yet
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
      latency: point.value,
    };
  });

  // Calculate trend and average
  const avgLatency = Math.round(
    data.reduce((sum, point) => sum + point.value, 0) / data.length
  );
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  const firstHalfAvg =
    firstHalf.reduce((sum, point) => sum + point.value, 0) / firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((sum, point) => sum + point.value, 0) / secondHalf.length;
  const trendPercentage =
    firstHalfAvg > 0
      ? (((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100).toFixed(1)
      : 0;
  const isImproving = Number(trendPercentage) < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Response Time Trends</CardTitle>
        <CardDescription>
          Average response time over the last 24 hours
        </CardDescription>
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
              dataKey="latency"
              type="monotone"
              fill="var(--color-latency)"
              fillOpacity={0.4}
              stroke="var(--color-latency)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {isImproving ? "Performance improving" : "Latency increasing"} by{" "}
              {Math.abs(Number(trendPercentage))}%{" "}
              {isImproving ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Average response time: {avgLatency}ms over the last 24 hours
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
