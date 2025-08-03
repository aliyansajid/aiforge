import { prisma } from "@repo/db"; // Adjust path to your Prisma client
import { sessionSchema } from "@/components/data_table/columns";
import { z } from "zod";
import SessionsClient from "@/components/SessionClient";
import { auth } from "@repo/auth";

// Define type for session data from Prisma
type SessionData = {
  id: string;
  city: string | null;
  region: string | null;
  country: string | null;
  timezone: string | null;
  ipAddress: string | null;
  lat: number | null;
  lon: number | null;
  createdAt: Date;
  expires: Date;
};

// Define type for DataTable data
type Task = z.infer<typeof sessionSchema>;

export default async function Sessions() {
  // Get the current session and user
  const session = await auth();
  if (!session?.user?.id) {
    return <div>Please sign in to view your sessions.</div>;
  }

  // Fetch all active sessions for the user
  const sessions: SessionData[] = await prisma.session.findMany({
    where: {
      userId: session.user.id,
      expires: { gt: new Date() }, // Only active sessions
    },
    orderBy: { createdAt: "desc" }, // Most recent first
  });

  // Get the most recent session (first in the sorted list)
  const currentSession = sessions[0];

  // Prepare data for DataTable (exclude the current session)
  const tableData: Task[] = sessions.slice(1).map((s) => ({
    id: s.id,
    location:
      [s.city, s.region, s.country].filter(Boolean).join(", ") || "Unknown",
    createdOn: s.createdAt.toISOString(),
    expiresOn: s.expires.toISOString(),
  }));

  // Fallback values for current session if null
  const currentSessionData = {
    latitude: currentSession?.lat ?? 33.6844,
    longitude: currentSession?.lon ?? 73.0479,
    city: currentSession?.city ?? "Islamabad",
    region: currentSession?.region ?? "Islamabad",
    country: currentSession?.country ?? "PK",
    timezone: currentSession?.timezone ?? "Karachi/Islamabad",
    ipAddress: currentSession?.ipAddress ?? "123.456.789",
  };

  return (
    <SessionsClient currentSession={currentSessionData} tableData={tableData} />
  );
}
