"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@repo/ui/components/chart";
import { format } from "date-fns";

interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

interface MetricLineChartProps {
  title: string;
  description?: string;
  data: MetricDataPoint[];
  dataKey?: string;
  color?: string;
}

export function MetricLineChart({
  title,
  description,
  data,
  dataKey = "value",
  color = "var(--chart-1)",
}: MetricLineChartProps) {
  // Transform data for recharts - filter out null values only
  const chartData = data
    .filter((point) => point.value != null)
    .map((point) => ({
      time: format(point.timestamp, "MMM d, h:mm a"),
      [dataKey]: point.value,
    }));

  const chartConfig = {
    [dataKey]: {
      label: title,
      color: color,
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig}>
            <LineChart
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
                tickFormatter={(value) => {
                  // Show only time for shorter labels
                  const parts = value.split(", ");
                  return parts.length > 1 ? parts[1] : value;
                }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Line
                dataKey={dataKey}
                type="monotone"
                stroke={`var(--color-${dataKey})`}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No data available for this time range</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
