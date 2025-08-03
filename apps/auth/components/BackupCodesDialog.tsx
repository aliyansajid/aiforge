"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/CustomFormField";
import { Form } from "@repo/ui/components/form";
import {
  generateBackupCodes,
  verifyMfaForBackupCodes,
} from "@/actions/security";
import { toast } from "sonner";
import { Copy, Download, AlertTriangle, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

interface BackupCodesDialogProps {
  isEnabled: boolean;
  hasExistingCodes: boolean;
  children: React.ReactNode;
  onCodesGenerated?: () => void;
}

const BackupCodesDialog = ({
  isEnabled,
  hasExistingCodes,
  children,
  onCodesGenerated,
}: BackupCodesDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<"confirm" | "verify" | "codes">("confirm");

  const verificationSchema = z.object({
    otp: z
      .string()
      .length(6, "OTP must be 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only digits"),
  });

  const form = useForm<z.infer<typeof verificationSchema>>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      otp: "",
    },
  });

  const handleStartVerification = () => {
    setStep("verify");
  };

  const handleVerifyDevice = async (
    values: z.infer<typeof verificationSchema>
  ) => {
    try {
      setIsVerifying(true);
      const result = await verifyMfaForBackupCodes(values.otp);

      if (result.success) {
        toast.success("Device verified successfully!");
        // Now generate the backup codes
        await handleGenerateCodesAfterVerification();
      } else {
        toast.error(result.error || "Invalid verification code");
        form.setValue("otp", "");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      form.setValue("otp", "");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGenerateCodesAfterVerification = async () => {
    try {
      setIsGenerating(true);
      const result = await generateBackupCodes();

      if (result.success && result.data) {
        setBackupCodes(result.data.codes);
        setStep("codes");
        toast.success("Backup codes generated successfully!");
        onCodesGenerated?.(); // Notify parent to refresh data
      } else {
        toast.error(result.error || "Failed to generate backup codes");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const codesText = backupCodes.join("\n");
    try {
      await navigator.clipboard.writeText(codesText);
      toast.success("Backup codes copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    const codesText = [
      "AIForge Account Recovery Codes",
      "=====================================",
      "",
      "Keep these codes in a safe place. Each code can only be used once.",
      "Use these codes if you lose access to your authenticator device.",
      "",
      ...backupCodes.map((code, index) => `${index + 1}. ${code}`),
      "",
      "Generated on: " + new Date().toLocaleString(),
    ].join("\n");

    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aiforge-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded!");
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep("confirm");
    setBackupCodes([]);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {step === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {hasExistingCodes
                  ? "Regenerate Backup Codes"
                  : "Generate Backup Codes"}
              </DialogTitle>
              <DialogDescription>
                {hasExistingCodes
                  ? "This will replace your existing backup codes. Any unused codes will become invalid."
                  : "Backup codes allow you to access your account if you lose your authenticator device. Each code can only be used once."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {hasExistingCodes && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-amber-800 dark:text-amber-200">
                      This will replace your existing backup codes
                    </div>
                    <div className="text-amber-700 dark:text-amber-300 mt-1">
                      Any unused codes will become invalid. Make sure to save
                      the new codes securely.
                    </div>
                  </div>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                You'll receive 10 codes that you should store in a safe place,
                like a password manager.
              </div>
            </div>

            <DialogFooter className="gap-2">
              <CustomButton
                variant={ButtonVariant.OUTLINE}
                text="Cancel"
                onClick={handleClose}
              />
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text="Continue"
                onClick={handleStartVerification}
                disabled={!isEnabled}
              />
            </DialogFooter>
          </>
        ) : step === "verify" ? (
          <>
            <DialogHeader>
              <DialogTitle>Verify Your Device</DialogTitle>
              <DialogDescription>
                For security, please verify your identity using your
                authenticator app.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  Enter the 6-digit code from your authenticator app to continue
                </div>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleVerifyDevice)}
                  className="space-y-4"
                >
                  <CustomFormField
                    control={form.control}
                    fieldType={FormFieldType.OTP}
                    name="otp"
                    label="Enter your 6-digit code"
                    placeholder="123456"
                  />

                  <DialogFooter className="gap-2">
                    <CustomButton
                      variant={ButtonVariant.OUTLINE}
                      text="Back"
                      onClick={() => setStep("confirm")}
                      disabled={isVerifying}
                    />
                    <CustomButton
                      variant={ButtonVariant.DEFAULT}
                      text={isVerifying ? "Verifying..." : "Verify & Generate"}
                      type="submit"
                      isLoading={isVerifying || isGenerating}
                      disabled={isVerifying || isGenerating}
                    />
                  </DialogFooter>
                </form>
              </Form>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Your Backup Codes</DialogTitle>
              <DialogDescription>
                Save these codes in a safe place. Each code can only be used
                once.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-background rounded border"
                    >
                      <span>{code}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <CustomButton
                  variant={ButtonVariant.OUTLINE}
                  text="Copy All"
                  icon={<Copy className="h-4 w-4" />}
                  onClick={handleCopyToClipboard}
                  className="flex-1"
                />
                <CustomButton
                  variant={ButtonVariant.OUTLINE}
                  text="Download"
                  icon={<Download className="h-4 w-4" />}
                  onClick={handleDownload}
                  className="flex-1"
                />
              </div>
            </div>

            <DialogFooter>
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text="I've Saved My Codes"
                onClick={handleClose}
                className="w-full"
              />
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BackupCodesDialog;
