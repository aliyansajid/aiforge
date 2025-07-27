"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@repo/ui/components/form";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/CustomFormField";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { resetPassword, verifyOtp } from "@/actions/auth";
import { otpSchema, personalInfoSchema } from "@/schemas/auth";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"otp" | "password">("otp");

  // Extract just the password field from the schema
  const passwordSchema = personalInfoSchema.pick({ password: true });

  // Form for OTP entry
  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  // Form for new password input
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    // Capture email from URL query parameters
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams, router]);

  /**
   * Submits the OTP for verification.
   * On success, moves to the password reset step.
   */
  async function onOtpSubmit(values: z.infer<typeof otpSchema>) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("otp", values.otp);

      const response = await verifyOtp(formData);
      if (response.success) {
        passwordForm.reset({ password: "" });
        setCurrentStep("password");
      } else {
        toast.error("Invalid or expired OTP");
      }
    } catch (error) {
      toast.error("Failed to verify OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Submits the new password.
   * On success, redirects the user to the login page.
   */
  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", values.password);

      const response = await resetPassword(formData);
      if (response.success) {
        toast.success("Password updated successfully! Redirecting to login...");
        setTimeout(() => router.push("/login"), 1000);
      } else {
        toast.error(
          response.error || "Failed to update password. Please try again."
        );
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Handles back navigation depending on current step.
   */
  const handleBackClick = () => {
    if (currentStep === "password") {
      setCurrentStep("otp");
    } else {
      router.push("/login");
    }
  };

  // Step 1: OTP Verification Form
  if (currentStep === "otp") {
    return (
      <Form {...otpForm}>
        <form
          onSubmit={otpForm.handleSubmit(onOtpSubmit)}
          className="grid gap-6"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Verify Your Identity</h1>
            <p className="text-muted-foreground text-sm text-balance">
              If an account exists with&nbsp;
              <span className="font-medium">{email}</span>, we have sent a
              verification code. Please enter it below:
            </p>
          </div>

          <div className="flex justify-center">
            <CustomFormField
              control={otpForm.control}
              fieldType={FormFieldType.OTP}
              name="otp"
            />
          </div>

          <div className="grid gap-2">
            <CustomButton
              variant={ButtonVariant.DEFAULT}
              text="Verify OTP"
              type="submit"
              isLoading={isLoading}
            />
            <CustomButton
              variant={ButtonVariant.OUTLINE}
              text="Back to Login"
              type="button"
              onClick={handleBackClick}
            />
          </div>
        </form>
      </Form>
    );
  }

  // Step 2: Password Reset Form
  if (currentStep === "password") {
    return (
      <Form {...passwordForm}>
        <form
          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          className="grid gap-6"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Create a New Password</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Enter a new password below to regain access to your account
            </p>
          </div>

          <CustomFormField
            control={passwordForm.control}
            fieldType={FormFieldType.INPUT}
            inputType="password"
            name="password"
            label="New Password"
            placeholder="********"
          />

          <div className="grid gap-2">
            <CustomButton
              variant={ButtonVariant.DEFAULT}
              text="Update Password"
              type="submit"
              isLoading={isLoading}
            />
            <CustomButton
              variant={ButtonVariant.OUTLINE}
              text="Go Back"
              type="button"
              onClick={handleBackClick}
            />
          </div>
        </form>
      </Form>
    );
  }

  return null; // Fallback for unexpected state
};

export default ResetPasswordForm;
