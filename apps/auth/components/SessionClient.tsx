"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import { DataTable } from "./data-table/datatable";
import { columns, SessionTableData } from "./data-table/columns";
import { signOutAllSessions } from "@/actions/session-actions";
import { toast } from "sonner";
import { signOut } from "@repo/auth";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);

interface SessionData {
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
}

interface SessionsClientProps {
  session: SessionData | null;
  activeSessions: SessionData[];
}

const SessionsClient = ({ session, activeSessions }: SessionsClientProps) => {
  const [isMapReady, setIsMapReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsMapReady(true);
  }, []);

  // Default coordinates (Islamabad) if no session location data
  const defaultLat = 33.6844;
  const defaultLon = 73.0479;

  // Use session coordinates if available, otherwise use defaults
  const lat = session?.lat ?? defaultLat;
  const lon = session?.lon ?? defaultLon;

  // Transform active sessions data for the table
  const tableData: SessionTableData[] = activeSessions.map((session) => {
    const location =
      [session.city, session.region, session.country]
        .filter(Boolean)
        .join(", ") || "Unknown";

    return {
      id: session.id,
      location,
      createdOn: new Date(session.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
      expiresOn: new Date(session.expires).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    };
  });

  const handleSignOutAllSessions = () => {
    startTransition(async () => {
      try {
        await signOutAllSessions();
        await signOut();
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  if (!session) {
    return (
      <div className="space-y-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium">Your sessions</h1>
          <p className="text-muted-foreground text-base text-balance">
            Manage your active sessions below.
          </p>
        </div>
        <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />
        <div className="text-muted-foreground">No active session found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Your sessions</h1>
        <p className="text-muted-foreground text-base text-balance">
          Manage your active sessions below.
        </p>
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="flex flex-col gap-4">
        <h4 className="text-base font-medium">Current session</h4>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="w-full rounded-lg overflow-hidden">
            {isMapReady ? (
              <MapContainer
                center={[lat, lon]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
                attributionControl={false}
                key={`map-${lat}-${lon}`}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Circle
                  center={[lat, lon]}
                  radius={500}
                  pathOptions={{
                    color: "transparent",
                    fillColor: "#4287f5",
                    fillOpacity: 0.3,
                    weight: 2,
                  }}
                />
              </MapContainer>
            ) : (
              <Skeleton className="w-full rounded-lg h-[148px]" />
            )}
          </div>
          <div className="flex flex-col gap-2 py-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">City</div>
              <div className="text-sm">{session.city || "Unknown"}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Region</div>
              <div className="text-sm">{session.region || "Unknown"}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Country</div>
              <div className="text-sm">{session.country || "Unknown"}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Timezone</div>
              <div className="text-sm">{session.timezone || "Unknown"}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">IP Address</div>
              <div className="text-sm">{session.ipAddress || "Unknown"}</div>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="flex flex-col gap-4">
        <h4 className="text-base font-medium">Active sessions</h4>

        {tableData.length > 0 ? (
          <DataTable columns={columns} data={tableData} />
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No active sessions found.
          </div>
        )}

        <div className="flex justify-end">
          <CustomButton
            variant={ButtonVariant.OUTLINE}
            text="Sign out of all sessions"
            className="rounded-full"
            onClick={handleSignOutAllSessions}
            isLoading={isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default SessionsClient;
