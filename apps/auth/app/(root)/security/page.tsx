"use client";

import { useEffect, useState } from "react";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import { Badge } from "@repo/ui/components/badge";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import { Label } from "@repo/ui/components/label";
import { useRouter } from "next/navigation";
import {
  getMfaDevices,
  removeMfaDevice,
  hasBackupCodes,
} from "@/actions/security";
import { toast } from "sonner";
import { Trash, Smartphone } from "lucide-react";
import BackupCodesDialog from "@/components/BackupCodesDialog";

interface MfaDevice {
  id: string;
  name: string;
  verified: boolean;
  lastUsed: Date | null;
  createdAt: Date;
}

interface BackupCodesStatus {
  hasBackupCodes: boolean;
  mfaEnabled: boolean;
  codesCount: number;
}

const Security = () => {
  const router = useRouter();
  const [mfaDevices, setMfaDevices] = useState<MfaDevice[]>([]);
  const [backupCodesStatus, setBackupCodesStatus] = useState<BackupCodesStatus>(
    {
      hasBackupCodes: false,
      mfaEnabled: false,
      codesCount: 0,
    }
  );
  const [isLoading, setIsLoading] = useState(true);
  const [removingDevice, setRemovingDevice] = useState<string | null>(null);

  const fetchMfaData = async () => {
    try {
      setIsLoading(true);
      const [devicesResponse, backupResponse] = await Promise.all([
        getMfaDevices(),
        hasBackupCodes(),
      ]);

      if (devicesResponse.success && devicesResponse.data) {
        setMfaDevices(devicesResponse.data);
      } else if (devicesResponse.error) {
        toast.error(devicesResponse.error);
      }

      if (backupResponse.success && backupResponse.data) {
        setBackupCodesStatus(backupResponse.data);
      }
    } catch (error) {
      toast.error("Error fetching MFA information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string, deviceName: string) => {
    if (!confirm(`Are you sure you want to remove "${deviceName}"?`)) {
      return;
    }

    try {
      setRemovingDevice(deviceId);
      const response = await removeMfaDevice(deviceId);

      if (response.success) {
        toast.success("Authenticator removed successfully");
        await fetchMfaData(); // Refresh both devices and backup codes status
      } else {
        toast.error(response.error || "Failed to remove authenticator");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setRemovingDevice(null);
    }
  };

  useEffect(() => {
    fetchMfaData();
  }, []);

  const isMfaEnabled = mfaDevices.length > 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Account security</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Manage your account security below.
        </p>
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2 w-full sm:max-w-md">
          <div className="flex gap-4">
            <Label className="text-base">Login with password</Label>
            <Badge className="bg-muted text-primary rounded-full">
              Enabled
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage the password for your account.
          </p>
        </div>
        <ChangePasswordDialog />
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2 w-full sm:max-w-md">
            <div className="flex gap-4 items-center">
              <Label className="text-base">Multi-factor authentication</Label>
              {isLoading ? (
                <Badge className="bg-muted text-primary rounded-full">
                  Loading...
                </Badge>
              ) : (
                isMfaEnabled && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                    Enabled
                  </Badge>
                )
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Secure your account with a second factor of authentication.
            </p>
          </div>
          <CustomButton
            variant={ButtonVariant.OUTLINE}
            size="sm"
            text={isMfaEnabled ? "Add Device" : "Enable MFA"}
            className="rounded-full"
            onClick={() => router.push("/security/mfa/add-device")}
          />
        </div>

        {isMfaEnabled && (
          <div className="space-y-3">
            {mfaDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-12 rounded-full bg-background border">
                    <Smartphone size={20} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>{device.name}</Label>
                    <span className="text-xs text-muted-foreground">
                      {device.lastUsed
                        ? `Last used ${new Date(
                            device.lastUsed
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })}`
                        : `Added ${new Date(
                            device.createdAt
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })}`}
                    </span>
                  </div>
                </div>
                <CustomButton
                  variant={ButtonVariant.GHOST}
                  size="icon"
                  text=""
                  className="text-destructive hover:text-destructive hover:rounded-full"
                  onClick={() => handleRemoveDevice(device.id, device.name)}
                  disabled={removingDevice === device.id}
                  isLoading={removingDevice === device.id}
                  icon={
                    removingDevice === device.id ? undefined : (
                      <Trash className="h-4 w-4" />
                    )
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2 w-full sm:max-w-md">
          <div className="flex gap-4 items-center">
            <Label className="text-base">Recovery codes</Label>
            {backupCodesStatus.hasBackupCodes && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                Enabled
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isMfaEnabled
              ? backupCodesStatus.hasBackupCodes
                ? "You have backup codes generated. You can generate new ones if needed."
                : "Generate backup codes to access your account if you lose your authenticator device."
              : "You need to have at least one multi-factor method enabled to generate recovery codes."}
          </p>
        </div>

        {isMfaEnabled ? (
          <BackupCodesDialog
            isEnabled={isMfaEnabled}
            hasExistingCodes={backupCodesStatus.hasBackupCodes}
            onCodesGenerated={fetchMfaData}
          >
            <CustomButton
              variant={ButtonVariant.OUTLINE}
              size="sm"
              text={
                backupCodesStatus.hasBackupCodes
                  ? "Regenerate"
                  : "Generate Codes"
              }
              className="rounded-full"
            />
          </BackupCodesDialog>
        ) : (
          <CustomButton
            variant={ButtonVariant.OUTLINE}
            size="sm"
            text="Enable MFA"
            className="rounded-full"
            disabled={true}
          />
        )}
      </div>
    </div>
  );
};

export default Security;
