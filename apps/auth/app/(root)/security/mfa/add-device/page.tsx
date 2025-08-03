"use client";

import { generateMfaSecret, verifyAndSaveMfaDevice } from "@/actions/security";
import { zodResolver } from "@hookform/resolvers/zod";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/CustomFormField";
import { Form } from "@repo/ui/components/form";
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import z from "zod";

const AddDevice = () => {
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [isGeneratingQR, setIsGeneratingQR] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formSchema = z.object({
    otp: z
      .string()
      .length(6, "OTP must be 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only digits"),
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(50, "Name cannot exceed 50 characters"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
      name: "",
    },
  });

  // Generate QR code only once on component mount
  useEffect(() => {
    const setupMfa = async () => {
      try {
        setIsGeneratingQR(true);
        const result = await generateMfaSecret();

        if (result.success && result.data) {
          setSecret(result.data.secret);
          setQrCodeUrl(result.data.qrCodeUrl);
          toast.success(
            "QR code generated! Scan it with your authenticator app."
          );
        } else {
          toast.error(result.error || "Failed to generate QR code");
        }
      } catch (error) {
        console.error("Error generating QR code:", error);
        toast.error("Failed to generate QR code");
      } finally {
        setIsGeneratingQR(false);
      }
    };

    setupMfa();
  }, []); // Empty dependency array ensures this runs only once

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!secret) {
      toast.error("QR code not ready. Please wait and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("otp", values.otp);
      formData.append("name", values.name);
      formData.append("secret", secret);

      const result = await verifyAndSaveMfaDevice(formData);

      if (result.success) {
        toast.success("Authenticator added successfully!");
        // Redirect back to security page after successful setup
        setTimeout(() => {
          router.push("/security");
        }, 1500);
      } else {
        toast.error(result.error || "Failed to add authenticator");
        // Clear the OTP field on error so user can try again
        form.setValue("otp", "");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Something went wrong. Please try again.");
      form.setValue("otp", "");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium mb-2">Add Authenticator Device</h1>
        <p className="text-muted-foreground text-sm">
          Set up two-factor authentication using an authenticator app.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-card flex flex-col items-center justify-center p-12 gap-6 rounded-lg border">
            {isGeneratingQR ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-48 h-48 bg-gray-200 animate-pulse rounded"></div>
                <p className="text-sm text-muted-foreground">
                  Generating QR code...
                </p>
              </div>
            ) : qrCodeUrl ? (
              <>
                <img
                  src={qrCodeUrl}
                  alt="QR Code for MFA setup"
                  className="w-48 h-48 border rounded"
                />
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">
                    Scan this QR code with your authenticator app
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Google Authenticator, Microsoft Authenticator, or any TOTP
                    app
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-48 h-48 bg-red-100 rounded flex items-center justify-center">
                  <p className="text-red-600 text-sm">Failed to load QR code</p>
                </div>
                <CustomButton
                  variant={ButtonVariant.OUTLINE}
                  text="Regenerate QR Code"
                  onClick={() => window.location.reload()}
                />
              </div>
            )}

            {!isGeneratingQR && qrCodeUrl && (
              <div className="w-full max-w-sm">
                <CustomFormField
                  control={form.control}
                  fieldType={FormFieldType.OTP}
                  name="otp"
                  label="Enter your 6-digit code"
                  placeholder="123456"
                />
              </div>
            )}
          </div>

          {!isGeneratingQR && qrCodeUrl && (
            <div className="mx-auto max-w-lg space-y-6">
              <CustomFormField
                control={form.control}
                fieldType={FormFieldType.INPUT}
                name="name"
                label="Device Name"
                placeholder="e.g., Google Authenticator, iPhone"
              />

              <div className="flex gap-4">
                <CustomButton
                  variant={ButtonVariant.OUTLINE}
                  text="Cancel"
                  className="flex-1 rounded-full"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                />
                <CustomButton
                  variant={ButtonVariant.DEFAULT}
                  text={isSubmitting ? "Adding..." : "Add Authenticator"}
                  type="submit"
                  className="flex-1 rounded-full"
                  disabled={isSubmitting || !secret}
                />
              </div>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
};

export default AddDevice;
