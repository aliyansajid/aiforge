"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/CustomFormField";
import { Form } from "@repo/ui/components/form";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import z from "zod";
import { useEffect, useState, useTransition } from "react";
import {
  addMfaDevice,
  generateMfaSetup,
  getMfaStatus,
} from "@/actions/security";
import { toast } from "sonner";
import { Skeleton } from "@repo/ui/components/skeleton";
import { addMFADeviceSchema } from "@/schemas/auth";

const AddDevice = () => {
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof addMFADeviceSchema>>({
    resolver: zodResolver(addMFADeviceSchema),
    defaultValues: {
      otp: "",
      name: "",
      secret: "",
    },
  });

  // Check if user should have access to this page
  useEffect(() => {
    const checkAccess = async () => {
      setIsCheckingAccess(true);
      try {
        const response = await getMfaStatus();
        if (response.success && response.data) {
          const deviceCount = response.data.mfaDevices.length;

          // If user has exactly 1 device, they need verification
          if (deviceCount === 1) {
            // Check session storage for verification flag
            const isVerified = sessionStorage.getItem(
              "mfa_verified_add_device"
            );
            const timestamp = sessionStorage.getItem("mfa_verified_timestamp");

            if (!isVerified || !timestamp) {
              toast.error("Please verify your existing device first");
              router.push("/security");
              return;
            }

            // Check if verification is still valid (30 minutes)
            const verificationTime = parseInt(timestamp);
            const now = Date.now();
            const thirtyMinutes = 30 * 60 * 1000;

            if (now - verificationTime > thirtyMinutes) {
              sessionStorage.removeItem("mfa_verified_add_device");
              sessionStorage.removeItem("mfa_verified_timestamp");
              toast.error("Verification has expired. Please verify again.");
              router.push("/security");
              return;
            }
          }
          // If user has 0 devices or >1 devices, allow direct access
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
        router.push("/security");
        return;
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (isCheckingAccess) return; // Don't fetch setup until access is verified

    const fetchMfaSetup = async () => {
      setIsLoading(true);
      try {
        const response = await generateMfaSetup();
        if (response.success && response.data) {
          setQrCodeUrl(response.data.qrCodeUrl);
          setSecret(response.data.secret);
          form.setValue("secret", response.data.secret);
        } else {
          toast.error(
            response.error ||
              "An unexpected error occurred. Please try again later."
          );
          router.push("/security");
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
        router.push("/security");
      } finally {
        setIsLoading(false);
      }
    };
    fetchMfaSetup();
  }, [form, router, isCheckingAccess]);

  const onSubmit = async (values: z.infer<typeof addMFADeviceSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("otp", values.otp);
        formData.append("secret", secret);

        const response = await addMfaDevice(formData);
        if (response.success) {
          // Clear verification flags after successful device addition
          sessionStorage.removeItem("mfa_verified_add_device");
          sessionStorage.removeItem("mfa_verified_timestamp");

          toast.success(response.message);
          router.push("/security");
        } else {
          toast.error(
            response.error || "Failed to add MFA device. Please try again."
          );
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  // Show loading while checking access
  if (isCheckingAccess) {
    return (
      <div className="space-y-10">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="bg-card flex flex-col items-center justify-center p-12 gap-6 rounded-lg border">
          <Skeleton className="w-52 h-52 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Add Authenticator Device</h1>
        <p className="text-muted-foreground text-base text-balance">
          Set up two-factor authentication using an authenticator app.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          <div className="bg-card flex flex-col items-center justify-center p-12 gap-6 rounded-lg border">
            {isLoading ? (
              <Skeleton className="w-52 h-52 rounded-lg" />
            ) : (
              <img
                src={qrCodeUrl}
                alt="QR Code for MFA setup"
                className="w-52 rounded-lg"
              />
            )}

            <p className="text-xs text-muted-foreground">
              Scan this QR code with your authenticator app
            </p>

            <CustomFormField
              control={form.control}
              fieldType={FormFieldType.OTP}
              name="otp"
              label="Enter your 6-digit code"
            />
          </div>

          <div className="mx-auto max-w-lg space-y-6">
            <CustomFormField
              control={form.control}
              fieldType={FormFieldType.INPUT}
              inputType="text"
              name="name"
              label="Name"
              placeholder="Google Authenticator, iPhone"
            />

            <div className="flex gap-4">
              <CustomButton
                variant={ButtonVariant.OUTLINE}
                text="Cancel"
                type="button"
                className="flex-1 rounded-full"
                onClick={() => router.back()}
                disabled={isPending}
              />
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text="Add Authenticator"
                type="submit"
                className="flex-1 rounded-full"
                isLoading={isPending}
              />
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AddDevice;
