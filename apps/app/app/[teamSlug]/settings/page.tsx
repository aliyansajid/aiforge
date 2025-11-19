import { redirect } from "next/navigation";

interface SettingsPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const resolvedParams = await params;

  // Redirect to general settings by default
  redirect(`/${resolvedParams.teamSlug}/settings/general`);
}
