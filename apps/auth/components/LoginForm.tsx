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
import { startTransition, useState } from "react";
import { Mail, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  loginSchema,
  mfaCodeSchema,
  backupCodeInputSchema,
} from "@/schemas/auth";
import { signIn } from "@repo/auth";
import {
  checkMfaRequired,
  verifyMfaAndLogin,
  verifyBackupCodeAndLogin,
} from "@/actions/security";
import Google from "./GoogleAuthButton";
import GitHub from "./GitHubAuthButton";

/**
 * Helper to record session metadata.
 * Called only after a successful login.
 */
async function captureSessionInfo() {
  try {
    await fetch("/api/session-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Silently fail; user login is successful regardless of tracking
    console.error("Failed to capture session info:", error);
  }
}

type LoginStep = "options" | "credentials" | "mfa" | "backup";

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<LoginStep>("options");
  const [tempCredentials, setTempCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // Controls which form variant is shown
  const showEmailForm = searchParams.get("email") === "true";

  // Form schemas for different steps
  const credentialsForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Separate form just for MFA code
  const mfaForm = useForm<z.infer<typeof mfaCodeSchema>>({
    resolver: zodResolver(mfaCodeSchema),
    defaultValues: { mfaCode: "" },
  });

  // Separate form just for backup code
  const backupForm = useForm<z.infer<typeof backupCodeInputSchema>>({
    resolver: zodResolver(backupCodeInputSchema),
    defaultValues: { backupCode: "" },
  });

  // Navigation handlers
  const handleEmailClick = () => {
    setCurrentStep("credentials");
    const params = new URLSearchParams(searchParams.toString());
    params.set("email", "true");
    router.push(`?${params.toString()}`);
  };

  const handleBackToOptions = () => {
    setCurrentStep("options");
    setTempCredentials(null);
    credentialsForm.reset();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("email");
    router.push(`?${params.toString()}`);
  };

  const handleBackToCredentials = () => {
    setCurrentStep("credentials");
    mfaForm.reset();
    backupForm.reset();
  };

  const handleUseBackupCode = () => {
    setCurrentStep("backup");
    mfaForm.reset();
  };

  const handleBackToMfa = () => {
    setCurrentStep("mfa");
    backupForm.reset();
  };

  /**
   * Handles initial credentials submission
   */
  const onCredentialsSubmit = (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);

    startTransition(async () => {
      try {
        const result = await checkMfaRequired(values.email, values.password);

        if (!result.success) {
          toast.error(result.error || "Invalid credentials");
          return;
        }

        if (result.data?.mfaRequired) {
          // Store credentials temporarily and show MFA form
          setTempCredentials(values);
          setCurrentStep("mfa");
          toast.info("Please enter your 6-digit authentication code");
        } else {
          // No MFA required, proceed with normal login
          const response = await signIn("credentials", {
            email: values.email,
            password: values.password,
            redirect: false,
          });

          if (response?.error) {
            toast.error("Login failed");
            return;
          }

          await captureSessionInfo();
          router.push("/");
        }
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    });
  };

  /**
   * Handles MFA code verification
   */
  const onMfaSubmit = (values: z.infer<typeof mfaCodeSchema>) => {
    if (!tempCredentials) return;

    setIsLoading(true);

    startTransition(async () => {
      try {
        const result = await verifyMfaAndLogin(
          tempCredentials.email,
          tempCredentials.password,
          values.mfaCode
        );

        if (!result.success) {
          toast.error("Invalid MFA code");
          mfaForm.setValue("mfaCode", "");
          mfaForm.setFocus("mfaCode");
          return;
        }

        // MFA verified, complete login
        const response = await signIn("credentials", {
          email: tempCredentials.email,
          password: tempCredentials.password,
          redirect: false,
        });

        if (response?.error) {
          toast.error("Login failed");
          return;
        }

        await captureSessionInfo();
        toast.success("Login successful!");
        router.push("/");
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
        mfaForm.setValue("mfaCode", "");
        mfaForm.setFocus("mfaCode");
      } finally {
        setIsLoading(false);
      }
    });
  };

  /**
   * Handles backup code verification
   */
  const onBackupSubmit = (values: z.infer<typeof backupCodeInputSchema>) => {
    if (!tempCredentials) return;

    setIsLoading(true);

    startTransition(async () => {
      try {
        const result = await verifyBackupCodeAndLogin(
          tempCredentials.email,
          tempCredentials.password,
          values.backupCode
        );

        if (!result.success) {
          toast.error("Invalid backup code");
          backupForm.setValue("backupCode", "");
          backupForm.setFocus("backupCode");
          return;
        }

        // Backup code verified, complete login
        const response = await signIn("credentials", {
          email: tempCredentials.email,
          password: tempCredentials.password,
          redirect: false,
        });

        if (response?.error) {
          toast.error("Login failed");
          return;
        }

        await captureSessionInfo();

        const remainingCodes =
          result.data && "remainingCodes" in result.data
            ? result.data.remainingCodes
            : undefined;

        if (remainingCodes !== undefined) {
          toast.success(
            `Login successful! You have ${remainingCodes} backup codes remaining.`
          );
        } else {
          toast.success("Login successful!");
        }

        router.push("/");
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
        backupForm.setValue("backupCode", "");
        backupForm.setFocus("backupCode");
      } finally {
        setIsLoading(false);
      }
    });
  };

  // Render based on current step
  if (
    currentStep === "options" ||
    (!showEmailForm && currentStep === "credentials")
  ) {
    return (
      <Form {...credentialsForm}>
        <form onSubmit={credentialsForm.handleSubmit(onCredentialsSubmit)}>
          <h1 className="text-2xl font-bold text-center mb-10">
            Login to your account
          </h1>

          <div className="grid gap-4">
            <CustomButton
              variant={ButtonVariant.DEFAULT}
              type="button"
              icon={<Mail />}
              text="Continue with Email"
              className="rounded-full"
              onClick={handleEmailClick}
            />

            <hr className="border-border w-full h-px border-b-0 border-x-0 border-t-[1px]" />

            <Google />
            <GitHub />

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?&nbsp;
              <Link href="sign-up" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </Form>
    );
  }

  if (currentStep === "credentials") {
    return (
      <Form {...credentialsForm}>
        <form onSubmit={credentialsForm.handleSubmit(onCredentialsSubmit)}>
          <div className="grid gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Login to your account</h1>
              <p className="text-muted-foreground text-sm text-balance">
                Enter your email below to login to your account
              </p>
            </div>

            <CustomFormField
              control={credentialsForm.control}
              fieldType={FormFieldType.INPUT}
              inputType="email"
              name="email"
              label="Email"
              placeholder="m@example.com"
            />

            <div className="grid gap-2">
              <CustomFormField
                control={credentialsForm.control}
                fieldType={FormFieldType.INPUT}
                inputType="password"
                name="password"
                label="Password"
                placeholder="********"
              />
              <Link
                href="forgot-password"
                className="text-sm underline-offset-4 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            <div className="grid gap-2">
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text="Continue"
                isLoading={isLoading}
                type="submit"
              />

              <CustomButton
                variant={ButtonVariant.OUTLINE}
                text="Go Back"
                type="button"
                onClick={handleBackToOptions}
              />
            </div>
          </div>
        </form>
      </Form>
    );
  }

  if (currentStep === "mfa") {
    return (
      <Form {...mfaForm}>
        <form onSubmit={mfaForm.handleSubmit(onMfaSubmit)}>
          <div className="grid gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full dark:bg-blue-900/20">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
              <p className="text-muted-foreground text-sm text-balance">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex justify-center">
              <CustomFormField
                control={mfaForm.control}
                fieldType={FormFieldType.OTP}
                name="mfaCode" // Changed from "otp" to "mfaCode"
              />
            </div>

            <div className="grid gap-2">
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text="Verify & Login"
                isLoading={isLoading}
                type="submit"
              />

              <CustomButton
                variant={ButtonVariant.OUTLINE}
                text="Use Backup Code"
                type="button"
                onClick={handleUseBackupCode}
                disabled={isLoading}
              />

              <CustomButton
                variant={ButtonVariant.GHOST}
                text="Back"
                type="button"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBackToCredentials}
                disabled={isLoading}
              />
            </div>
          </div>
        </form>
      </Form>
    );
  }

  if (currentStep === "backup") {
    return (
      <Form {...backupForm}>
        <form onSubmit={backupForm.handleSubmit(onBackupSubmit)}>
          <div className="grid gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full dark:bg-amber-900/20">
                <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold">Backup Code</h1>
              <p className="text-muted-foreground text-sm text-balance">
                Enter one of your backup codes to access your account
              </p>
            </div>

            <CustomFormField
              control={backupForm.control}
              fieldType={FormFieldType.INPUT}
              name="backupCode"
              label="Backup Code"
              placeholder="XXXXXXXX"
            />

            <div className="grid gap-2">
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text="Verify & Login"
                isLoading={isLoading}
                type="submit"
              />

              <CustomButton
                variant={ButtonVariant.OUTLINE}
                text="Back to MFA"
                type="button"
                onClick={handleBackToMfa}
                disabled={isLoading}
              />

              <CustomButton
                variant={ButtonVariant.GHOST}
                text="Back to Login"
                type="button"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBackToCredentials}
                disabled={isLoading}
              />
            </div>
          </div>
        </form>
      </Form>
    );
  }

  return null;
};

export default LoginForm;
