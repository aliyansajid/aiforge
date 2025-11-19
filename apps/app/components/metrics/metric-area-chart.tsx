"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

// Type definition (moved here to avoid Node.js imports)
interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

interface MetricAreaChartProps {
  title: string;
  description?: string;
  data: MetricDataPoint[];
  dataKey?: string;
  color?: string;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number) => string;
}

export function MetricAreaChart({
  title,
  description,
  data,
  dataKey = "value",
  color = "hsl(var(--chart-1))",
  yAxisFormatter,
  tooltipFormatter,
}: MetricAreaChartProps) {
  // Transform data for recharts
  const chartData = data.map((point) => ({
    timestamp: point.timestamp.getTime(),
    [dataKey]: point.value,
    formattedTime: format(point.timestamp, "MMM d, HH:mm"),
  }));

  const chartConfig = {
    [dataKey]: {
      label: title,
      color: color,
    },
  } satisfies ChartConfig;

  const defaultFormatter = (value: number) => value.toFixed(2);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px]">
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
                dataKey="formattedTime"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 10)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={yAxisFormatter || defaultFormatter}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={tooltipFormatter || defaultFormatter}
                  />
                }
              />
              <Area
                dataKey={dataKey}
                type="natural"
                fill={`var(--color-${dataKey})`}
                fillOpacity={0.4}
                stroke={`var(--color-${dataKey})`}
              />
            </AreaChart>
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
