"use client";

import {
  getMfaStatus,
  getRecoveryCodesStatus,
  verifyMfaForAction,
  deleteMfaDevice,
} from "@/actions/security";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import VerifyMfaDeviceDialog from "@/components/VerifyMfaDeviceDialog";
import RecoveryCodesDialog from "@/components/RecoveryCodesDialog";
import { Badge } from "@repo/ui/components/badge";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import { Smartphone, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface MfaDevice {
  id: string;
  name: string;
  createdAt: Date;
}

interface RecoveryCodesStatus {
  hasRecoveryCodes: boolean;
  totalCodes: number;
  hasEverGenerated: boolean;
}

type VerificationAction = "add-device" | "delete-device" | null;

const Security = () => {
  const router = useRouter();
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [mfaDevices, setMfaDevices] = useState<MfaDevice[]>([]);
  const [recoveryCodesStatus, setRecoveryCodesStatus] =
    useState<RecoveryCodesStatus>({
      hasRecoveryCodes: false,
      totalCodes: 0,
      hasEverGenerated: false,
    });
  const [isLoading, setIsLoading] = useState(true);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationAction, setVerificationAction] =
    useState<VerificationAction>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchMfaStatus = async () => {
    setIsLoading(true);
    try {
      const response = await getMfaStatus();
      if (response.success && response.data) {
        setIsMfaEnabled(response.data.isMfaEnabled);
        setMfaDevices(response.data.mfaDevices);
      } else {
        toast.error(
          response.error || "Unable to retrieve user data. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecoveryCodesStatus = async () => {
    setIsLoading(true);
    try {
      const response = await getRecoveryCodesStatus();
      if (response.success && response.data) {
        setRecoveryCodesStatus(response.data);
      } else {
        toast.error(
          response.error || "An unexpected error occurred. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([fetchMfaStatus(), fetchRecoveryCodesStatus()]);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleAddDeviceClick = () => {
    // If user has no devices or more than 1 device, go directly to add-device page
    if (mfaDevices.length === 0 || mfaDevices.length > 1) {
      router.push("/security/mfa/add-device");
    } else if (mfaDevices.length === 1) {
      // If user has exactly 1 device, show verification dialog
      setVerificationAction("add-device");
      setShowVerificationDialog(true);
    }
  };

  const handleDeleteDeviceClick = (deviceId: string) => {
    if (mfaDevices.length > 1) {
      // Multiple devices - delete directly without verification
      handleDirectDelete(deviceId);
    } else {
      // Single device - require verification
      setSelectedDeviceId(deviceId);
      setVerificationAction("delete-device");
      setShowVerificationDialog(true);
    }
  };

  const handleDirectDelete = (deviceId: string) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("deviceId", deviceId);
        const response = await deleteMfaDevice(formData);
        if (response.success) {
          toast.success(response.message || "MFA device deleted successfully");
          fetchMfaStatus();
        } else {
          toast.error(
            response.error || "Unable to process request. Please try again."
          );
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  const handleVerificationSuccess = () => {
    if (verificationAction === "add-device") {
      // Set session storage flag for add-device access
      sessionStorage.setItem("mfa_verified_add_device", "true");
      sessionStorage.setItem("mfa_verified_timestamp", Date.now().toString());

      // Redirect to add-device page
      router.push("/security/mfa/add-device");
    } else if (verificationAction === "delete-device") {
      // Delete the device immediately
      handleDirectDelete(selectedDeviceId);
    }

    // Reset state
    setVerificationAction(null);
    setSelectedDeviceId("");
    setShowVerificationDialog(false);
  };

  const getVerificationAction = () => {
    return async (formData: FormData) => {
      if (verificationAction === "delete-device") {
        formData.append("deviceId", selectedDeviceId);
      }
      return verifyMfaForAction(formData, verificationAction!);
    };
  };

  const firstDevice = mfaDevices.length > 0 ? mfaDevices[0] : null;
  const firstDeviceName = firstDevice?.name || "Google Authenticator";
  const firstDeviceDate = firstDevice?.createdAt;

  const showRecoveryCodesButton =
    isMfaEnabled || recoveryCodesStatus.hasEverGenerated;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Account security</h1>
        <p className="text-muted-foreground text-base text-balance">
          Manage your account security below.
        </p>
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2 w-full sm:max-w-md">
          <div className="flex items-center gap-4">
            <h4 className="text-base font-medium">Login with password</h4>
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

      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2 w-full sm:max-w-md">
            <div className="flex items-center gap-4">
              <h4 className="text-base font-medium">
                Multi-factor authentication
              </h4>
              {isMfaEnabled && (
                <Badge className="bg-muted text-primary rounded-full">
                  Enabled
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Secure your account with a second factor of authentication.
            </p>
          </div>
          <CustomButton
            variant={ButtonVariant.OUTLINE}
            text={isMfaEnabled ? "Add new device" : "Enable MFA"}
            size="sm"
            className="rounded-full"
            onClick={handleAddDeviceClick}
            disabled={isLoading}
          />
        </div>
        {isMfaEnabled && mfaDevices.length > 0 && (
          <div className="space-y-3">
            {mfaDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-3 border rounded-2xl bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-10 p-2 bg-background border rounded-full">
                    <Smartphone size={20} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">{device.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {`Registered on ${device.createdAt.toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        }
                      )}`}
                    </p>
                  </div>
                </div>
                <CustomButton
                  variant={ButtonVariant.DEFAULT}
                  size="icon"
                  icon={<Trash size={20} />}
                  className="bg-transparent text-destructive hover:bg-muted hover:rounded-full"
                  onClick={() => handleDeleteDeviceClick(device.id)}
                  isLoading={isPending}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2 w-full sm:max-w-md">
          <div className="flex items-center gap-4">
            <h4 className="text-base font-medium">Recovery codes</h4>
            {recoveryCodesStatus.hasRecoveryCodes && (
              <Badge className="bg-muted text-primary rounded-full">
                Enabled
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            You can use one of your recovery codes to authenticate your account
            in place of your other multi-factor methods.
          </p>
        </div>
        {showRecoveryCodesButton && (
          <RecoveryCodesDialog
            hasRecoveryCodes={recoveryCodesStatus.hasRecoveryCodes}
            onCodesGenerated={fetchRecoveryCodesStatus}
          />
        )}
      </div>

      <VerifyMfaDeviceDialog
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
        onVerificationSuccess={handleVerificationSuccess}
        deviceName={firstDeviceName}
        registeredOn={firstDeviceDate}
        verificationAction={getVerificationAction()}
      />
    </div>
  );
};

export default Security;
