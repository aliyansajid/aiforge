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
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { resetPassword, verifyOtp } from "@/actions/auth";
import { otpSchema, resetPasswordSchema } from "@/schemas/auth";
import { signIn } from "@repo/auth";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState<"otp" | "password">("otp");

  // Form for OTP entry
  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  // Form for new password input
  const passwordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
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
  const onOtpSubmit = (values: z.infer<typeof otpSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("otp", values.otp);

        const response = await verifyOtp(formData);
        if (response.success) {
          setCurrentStep("password");
        } else {
          toast.error(response.error);
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  /**
   * Submits the new password.
   * On success, redirects the user to the login page.
   */
  const onPasswordSubmit = (values: z.infer<typeof resetPasswordSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", values.password);

        const response = await resetPassword(formData);

        if (response.success) {
          toast.success(response.message);
          try {
            // Automatically sign in the user with their new credentials
            const signInResult = await signIn("credentials", {
              email: email,
              password: values.password,
              redirect: false,
            });

            if (signInResult?.error) {
              toast.error("Failed to log in. Please try logging in manually.");
              router.push("/login");
            } else {
              // Capture session info
              try {
                await fetch("/api/session-info", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                });
              } catch (error) {
                // Silently fail; user login is successful regardless of tracking
                console.warn("Failed to capture session info:", error);
              }

              router.push("/");
            }
          } catch (error) {
            toast.error("Failed to log in. Please try logging in manually.");
            router.push("/login");
          }
        } else {
          toast.error(
            response.error || "Failed to update password. Please try again."
          );
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  /**
   * Handles back navigation depending on current step.
   */
  const handleBackClick = () => {
    if (currentStep === "password") {
      passwordForm.reset();
      setCurrentStep("otp");
    } else {
      router.push("/login");
    }
  };

  // Step 1: OTP Verification Form
  if (currentStep === "otp") {
    const OTP_LENGTH = 6;

    // Handle OTP input change to auto-submit when complete
    const handleOtpChange = (value: string) => {
      if (value.length === OTP_LENGTH) {
        // Set the OTP value in the form
        otpForm.setValue("otp", value);
        // Trigger form submission
        otpForm.handleSubmit(onOtpSubmit)();
      }
    };

    return (
      <Form {...otpForm}>
        <form
          onSubmit={otpForm.handleSubmit(onOtpSubmit)}
          className="grid gap-6"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Verify Your Identity</h1>
            <p className="text-muted-foreground text-sm text-balance">
              If an account exists with {email}, we have sent a verification
              code. Please enter it below:
            </p>
          </div>

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
              text="Verify OTP"
              type="submit"
              isLoading={isPending}
            />
            <CustomButton
              variant={ButtonVariant.OUTLINE}
              text="Back to Login"
              type="button"
              disabled={isPending}
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
            <h1 className="text-2xl font-bold">Reset Your Password</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Enter your new password below to complete the reset process
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
              isLoading={isPending}
            />
            <CustomButton
              variant={ButtonVariant.OUTLINE}
              text="Go back"
              type="button"
              disabled={isPending}
              onClick={handleBackClick}
            />
          </div>
        </form>
      </Form>
    );
  }

  return null;
};

export default ResetPasswordForm;
