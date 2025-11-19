import { redirect } from "next/navigation";

interface AnalyticsPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const resolvedParams = await params;

  // Redirect to the usage analytics page by default
  redirect(`/${resolvedParams.teamSlug}/analytics/usage`);
}
