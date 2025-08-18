"use client";

import {
  generateRecoveryCodes,
  getMfaStatus,
  verifyMfaForAction,
} from "@/actions/security-actions";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import VerifyMfaDeviceDialog from "@/components/VerifyMfaDeviceDialog";

interface RecoveryCodesDialogProps {
  hasRecoveryCodes: boolean;
  onCodesGenerated?: () => void;
}

const RecoveryCodesDialog = ({
  hasRecoveryCodes,
  onCodesGenerated,
}: RecoveryCodesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [showCodes, setShowCodes] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    name: string;
    createdAt: Date;
  }>({
    name: "Google Authenticator",
    createdAt: new Date(),
  });
  const [hasMfaDevice, setHasMfaDevice] = useState<boolean>(false);

  useEffect(() => {
    const checkMfaStatus = async () => {
      const response = await getMfaStatus();
      if (response.success && response.data) {
        const hasMfaDevice = response.data.mfaDevices.length > 0;
        setHasMfaDevice(hasMfaDevice);
        if (hasMfaDevice) {
          const firstDevice = response.data.mfaDevices[0];
          setDeviceInfo({
            name: firstDevice?.name ?? "Google Authenticator",
            createdAt: firstDevice?.createdAt ?? new Date(),
          });
        }
      }
    };

    if (open) {
      checkMfaStatus();
    }
  }, [open]);

  const handleGenerateClick = () => {
    // If user has MFA devices and already has recovery codes, require verification
    if (hasMfaDevice && hasRecoveryCodes) {
      setShowVerificationDialog(true);
    } else {
      // First time generation or no MFA devices - generate directly
      handleGenerateCodes();
    }
  };

  const handleGenerateCodes = async () => {
    setIsLoading(true);
    try {
      const response = await generateRecoveryCodes();
      if (response.success && response.data) {
        setCodes(response.data.codes);
        setShowCodes(true);
        onCodesGenerated?.();
      } else {
        toast.error(response.error || "Failed to generate recovery codes");
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSuccess = () => {
    setShowVerificationDialog(false);
    handleGenerateCodes();
  };

  const handleCopyAll = () => {
    const codeText = codes.join("\n");
    navigator.clipboard.writeText(codeText);
    toast.success("Recovery codes copied to clipboard");
  };

  const handleDownload = () => {
    const codeText = codes.join("\n");
    const blob = new Blob([codeText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aiforge-recovery-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Close dialog after download
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setShowCodes(false);
    setCodes([]);
    setShowVerificationDialog(false);
  };

  const handleDone = () => {
    handleClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <CustomButton
            variant={ButtonVariant.OUTLINE}
            text={hasRecoveryCodes ? "Regenerate Codes" : "Generate Codes"}
            size="sm"
            className="rounded-full"
            onClick={() => setOpen(true)}
          />
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Recovery Codes
            </DialogTitle>
            <DialogDescription>
              {showCodes
                ? "Save these recovery codes in a safe place. Each code can only be used once."
                : hasRecoveryCodes
                  ? "Generate new recovery codes. This will invalidate your existing codes."
                  : "Generate recovery codes to access your account if you lose your authenticator device."}
            </DialogDescription>
          </DialogHeader>

          {!showCodes ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Recovery codes are the only way to
                  access your account if you lose your authenticator device.
                  Store them securely.
                </p>
              </div>
              <div className="flex gap-4">
                <CustomButton
                  variant={ButtonVariant.OUTLINE}
                  text="Cancel"
                  className="flex-1"
                  onClick={handleClose}
                />
                <CustomButton
                  variant={ButtonVariant.DEFAULT}
                  text={
                    hasRecoveryCodes ? "Regenerate Codes" : "Generate Codes"
                  }
                  className="flex-1"
                  onClick={handleGenerateClick}
                  isLoading={isLoading}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  {codes.map((code, index) => (
                    <div
                      key={index}
                      className="text-muted-foreground text-center text-sm"
                    >
                      <span>{code}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <CustomButton
                  variant={ButtonVariant.OUTLINE}
                  text="Copy All"
                  className="flex-1"
                  onClick={handleCopyAll}
                />
                <CustomButton
                  variant={ButtonVariant.OUTLINE}
                  text="Download"
                  className="flex-1"
                  onClick={handleDownload}
                />
              </div>

              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text="Done"
                className="w-full"
                onClick={handleDone}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {hasMfaDevice && hasRecoveryCodes && (
        <VerifyMfaDeviceDialog
          open={showVerificationDialog}
          onOpenChange={setShowVerificationDialog}
          onVerificationSuccess={handleVerificationSuccess}
          deviceName={deviceInfo.name}
          registeredOn={deviceInfo.createdAt}
          verificationAction={(formData: FormData) =>
            verifyMfaForAction(formData, "recovery-codes")
          }
        />
      )}
    </>
  );
};

export default RecoveryCodesDialog;
