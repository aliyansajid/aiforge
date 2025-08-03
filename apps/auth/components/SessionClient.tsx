"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { DataTable } from "@/components/data_table/datatable";
import { columns } from "@/components/data_table/columns";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import { sessionSchema } from "@/components/data_table/columns";
import { z } from "zod";

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Dynamically import react-leaflet components with SSR disabled
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  {
    ssr: false,
  }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  {
    ssr: false,
  }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  {
    ssr: false,
  }
);

// Define type for DataTable data
type Task = z.infer<typeof sessionSchema>;

// Define props for the client component
type SessionsClientProps = {
  currentSession: {
    latitude: number;
    longitude: number;
    city: string;
    region: string;
    country: string;
    timezone: string;
    ipAddress: string;
  };
  tableData: Task[];
};

export default function SessionsClient({
  currentSession,
  tableData,
}: SessionsClientProps) {
  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Your sessions</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Manage your active sessions below.
        </p>
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="flex flex-col gap-4">
        <h4 className="text-base font-medium">Current Session</h4>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="w-full rounded-lg overflow-hidden border">
            <MapContainer
              center={[currentSession.latitude, currentSession.longitude]}
              zoom={13}
              zoomControl={false}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Circle
                center={[currentSession.latitude, currentSession.longitude]}
                radius={500}
                pathOptions={{
                  color: "transparent",
                  fillColor: "#4287f5",
                  fillOpacity: 0.3,
                  weight: 2,
                }}
              />
            </MapContainer>
          </div>
          <div className="flex flex-col gap-2 py-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">City</div>
              <div className="text-sm">{currentSession.city}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Region</div>
              <div className="text-sm">{currentSession.region}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Country</div>
              <div className="text-sm">{currentSession.country}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Timezone</div>
              <div className="text-sm">{currentSession.timezone}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">IP Address</div>
              <div className="text-sm">{currentSession.ipAddress}</div>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="flex flex-col gap-4">
        <h4 className="text-base font-medium">Active Sessions</h4>
        <DataTable columns={columns} data={tableData} />
        <div className="flex justify-end">
          <CustomButton
            variant={ButtonVariant.OUTLINE}
            text="Sign out of all devices"
            className="rounded-full w-fit"
            size="lg"
          />
        </div>
      </div>
    </div>
  );
}
