"use client";

import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/CustomFormField";
import { Form } from "@repo/ui/components/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Smartphone } from "lucide-react";
import { verifyRecoveryCodeSchema, verifyOtpSchema } from "@/schemas/auth";

interface VerifyMfaDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerificationSuccess: () => void;
  deviceName?: string;
  registeredOn?: Date;
  verificationAction: (formData: FormData) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
    data?: any;
  }>;
}

const VerifyMfaDeviceDialog = ({
  open,
  onOpenChange,
  onVerificationSuccess,
  deviceName = "Google Authenticator",
  registeredOn,
  verificationAction,
}: VerifyMfaDeviceDialogProps) => {
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState<
    "options" | "verify" | "recovery"
  >("options");

  // Format the registered date
  const formattedDate = registeredOn
    ? registeredOn.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : null;

  // Form setup for OTP verification
  const otpForm = useForm<z.infer<typeof verifyOtpSchema>>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Form setup for recovery code verification
  const recoveryCodeForm = useForm<z.infer<typeof verifyRecoveryCodeSchema>>({
    resolver: zodResolver(verifyRecoveryCodeSchema),
    defaultValues: {
      recoveryCode: "",
    },
  });

  /**
   * Handle dialog open/close and reset forms/state on close
   */
  const handleDialogChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setCurrentStep("options");
      otpForm.reset();
      recoveryCodeForm.reset();
    }
  };

  /**
   * Handle successful verification
   */
  const handleVerificationSuccess = () => {
    handleDialogChange(false);
    onVerificationSuccess();
  };

  /**
   * Handle OTP form submission
   */
  const onOtpSubmit = (values: z.infer<typeof verifyOtpSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("otp", values.otp);

        const response = await verificationAction(formData);
        if (response.success) {
          handleVerificationSuccess();
          toast.success(response.message);
        } else {
          toast.error(response.error || "Invalid OTP. Please try again.");
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  /**
   * Handle recovery code form submission
   */
  const onRecoveryCodeSubmit = (
    values: z.infer<typeof verifyRecoveryCodeSchema>
  ) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("recoveryCode", values.recoveryCode);

        const response = await verificationAction(formData);
        if (response.success) {
          handleVerificationSuccess();
          toast.success(response.message);
        } else {
          toast.error(
            response.error || "Invalid recovery code. Please try again."
          );
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  /**
   * Handle back navigation
   */
  const handleBackClick = () => {
    if (currentStep === "verify") {
      otpForm.reset();
      setCurrentStep("options");
    } else if (currentStep === "recovery") {
      recoveryCodeForm.reset();
      setCurrentStep("options");
    }
  };

  // Handle OTP auto-submit
  const handleOtpChange = (value: string) => {
    const OTP_LENGTH = 6;
    if (value.length === OTP_LENGTH) {
      otpForm.setValue("otp", value);
      otpForm.handleSubmit(onOtpSubmit)();
    }
  };

  // Handle recovery code auto-submit
  const handleRecoveryCodeChange = (value: string) => {
    const RECOVERY_CODE_LENGTH = 6;
    if (value.length === RECOVERY_CODE_LENGTH) {
      recoveryCodeForm.setValue("recoveryCode", value);
      recoveryCodeForm.handleSubmit(onRecoveryCodeSubmit)();
    }
  };

  // Step 1: Options
  if (currentStep === "options") {
    return (
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify your account</DialogTitle>
            <DialogDescription>
              You must provide a second factor to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6">
            <div className="flex items-center justify-between p-3 border rounded-2xl bg-card">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 p-2 bg-background border rounded-full">
                  <Smartphone size={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">{deviceName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formattedDate
                      ? `Registered on ${formattedDate}`
                      : "Use your authenticator app"}
                  </p>
                </div>
              </div>
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text="Verify"
                size="sm"
                className="rounded-full"
                onClick={() => setCurrentStep("verify")}
                disabled={isPending}
              />
            </div>
            <CustomButton
              variant={ButtonVariant.OUTLINE}
              text="Use recovery code"
              className="w-full rounded-full"
              onClick={() => setCurrentStep("recovery")}
              disabled={isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: OTP Verification
  if (currentStep === "verify") {
    return (
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent>
          <Form {...otpForm}>
            <form
              onSubmit={otpForm.handleSubmit(onOtpSubmit)}
              className="grid gap-6"
            >
              <DialogHeader>
                <DialogTitle>Verify your account</DialogTitle>
                <DialogDescription>
                  Please enter the 6-digit code from your authenticator app.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center">
                <CustomFormField
                  control={otpForm.control}
                  fieldType={FormFieldType.OTP}
                  name="otp"
                  onChange={handleOtpChange}
                />
              </div>
              <div className="grid gap-2">
                <CustomButton
                  variant={ButtonVariant.DEFAULT}
                  text="Verify"
                  type="submit"
                  className="w-full rounded-full"
                  isLoading={isPending}
                />
                <CustomButton
                  variant={ButtonVariant.OUTLINE}
                  text="Go back"
                  type="button"
                  className="w-full rounded-full"
                  onClick={handleBackClick}
                  disabled={isPending}
                />
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 3: Recovery Code Verification
  if (currentStep === "recovery") {
    return (
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent>
          <Form {...recoveryCodeForm}>
            <form
              onSubmit={recoveryCodeForm.handleSubmit(onRecoveryCodeSubmit)}
              className="grid gap-6"
            >
              <DialogHeader>
                <DialogTitle>Verify with recovery code</DialogTitle>
                <DialogDescription>
                  Enter one of your 6-digit recovery codes to continue. If
                  you've lost your recovery codes, contact support.
                </DialogDescription>
              </DialogHeader>
              <CustomFormField
                control={recoveryCodeForm.control}
                fieldType={FormFieldType.INPUT}
                inputType="text"
                name="recoveryCode"
                label="Recovery code"
                placeholder="Enter 6-digit recovery code"
                onChange={handleRecoveryCodeChange}
              />
              <div className="grid gap-2">
                <CustomButton
                  variant={ButtonVariant.DEFAULT}
                  text="Verify"
                  type="submit"
                  className="w-full rounded-full"
                  isLoading={isPending}
                />
                <CustomButton
                  variant={ButtonVariant.OUTLINE}
                  text="Go back"
                  type="button"
                  className="w-full rounded-full"
                  onClick={handleBackClick}
                  disabled={isPending}
                />
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
};

export default VerifyMfaDeviceDialog;
