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
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Mail } from "lucide-react";
import Link from "next/link";
import GoogleAuthButton from "./GoogleAuthButton";
import GitHubAuthButton from "./GitHubAuthButton";
import { sendOtp, verifyOtp, registerUser } from "@/actions/auth";
import { emailSchema, otpSchema, personalInfoSchema } from "@/schemas/auth";
import { toast } from "sonner";
import { signIn } from "@repo/auth";

/**
 * Multi-step sign-up form with email verification using OTP.
 *
 * Flow:
 * 1. Choose sign-up method
 * 2. Submit email and receive OTP
 * 3. Verify OTP
 * 4. Submit personal info to complete registration
 */
const SignUpForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // UI state and step tracking
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "initial" | "email" | "otp" | "personal"
  >("initial");
  const [userEmail, setUserEmail] = useState("");

  const showEmailForm = searchParams.get("email") === "true";

  // Form definitions with Zod validation
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const personalForm = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
    },
  });

  // If URL indicates email form should be shown, trigger transition
  useEffect(() => {
    if (showEmailForm && currentStep === "initial") {
      setCurrentStep("email");
    }
  }, [showEmailForm, currentStep]);

  // Trigger email form via URL update
  const handleEmailClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("email", "true");
    router.push(`?${params.toString()}`);
    setCurrentStep("email");
  };

  /**
   * Navigate back one step and reset the appropriate form.
   * Also removes query parameters if going back from email step.
   */
  const handleBackClick = () => {
    if (currentStep === "email") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("email");
      router.push(`?${params.toString()}`);
      emailForm.reset({ email: "" });
      setCurrentStep("initial");
    } else if (currentStep === "otp") {
      otpForm.reset({ otp: "" });
      setCurrentStep("email");
    } else if (currentStep === "personal") {
      personalForm.reset({ firstName: "", lastName: "", password: "" });
      setCurrentStep("otp");
    }
  };

  /**
   * Submits email and requests an OTP to be sent.
   * On success, advances to OTP input step.
   */
  async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("email", values.email);

    const response = await sendOtp(formData);
    setIsLoading(false);

    if (response.success) {
      setUserEmail(values.email);
      otpForm.reset({ otp: "" });
      setCurrentStep("otp");
      router.replace("/sign-up", { scroll: false }); // Clean up query params
    } else {
      toast.error(response.error || "Failed to send OTP");
    }
  }

  /**
   * Verifies the OTP input by the user.
   * On success, moves to personal information form.
   */
  async function onOtpSubmit(values: z.infer<typeof otpSchema>) {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("email", userEmail);
    formData.append("otp", values.otp);

    const response = await verifyOtp(formData);
    setIsLoading(false);

    if (response.success) {
      personalForm.reset({
        firstName: "",
        lastName: "",
        password: "",
      });
      setCurrentStep("personal");
    } else {
      toast.error(response.error || "Invalid or expired OTP");
    }
  }

  /**
   * Final step: submits personal information to create a new user.
   * Redirects to login page on success.
   */
  async function onPersonalSubmit(values: z.infer<typeof personalInfoSchema>) {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("email", userEmail);
    formData.append("firstName", values.firstName);
    formData.append("lastName", values.lastName);
    formData.append("password", values.password);

    const response = await registerUser(formData);
    setIsLoading(false);

    if (response.success) {
      try {
        // Automatically sign in the user with their new credentials
        const signInResult = await signIn("credentials", {
          email: userEmail,
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
      toast.error(response.error || "Failed to create account");
    }
  }

  // Step 1: Choose sign-up method
  if (currentStep === "initial") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-center mb-10">
          Create your account
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

          <GoogleAuthButton />
          <GitHubAuthButton />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?&nbsp;
            <Link href="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Email submission
  if (currentStep === "email") {
    return (
      <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)}>
          <div className="grid gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Create your account</h1>
              <p className="text-muted-foreground text-sm text-balance">
                Enter your email below to create your account
              </p>
            </div>

            <CustomFormField
              control={emailForm.control}
              fieldType={FormFieldType.INPUT}
              inputType="email"
              name="email"
              label="Email"
              placeholder="m@example.com"
            />

            <div className="grid gap-2">
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text="Continue"
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
          </div>
        </form>
      </Form>
    );
  }

  // Step 3: OTP Verification
  if (currentStep === "otp") {
    return (
      <Form {...otpForm} key={`otp-form-${userEmail}`}>
        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)}>
          <div className="grid gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Verify your email</h1>
              <p className="text-muted-foreground text-sm text-balance">
                We've emailed a one-time security code to {userEmail}. Please
                enter it below:
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
                text="Go Back"
                type="button"
                onClick={handleBackClick}
              />
            </div>
          </div>
        </form>
      </Form>
    );
  }

  // Step 4: Personal Info Submission
  if (currentStep === "personal") {
    return (
      <Form {...personalForm} key={`personal-form-${userEmail}`}>
        <form onSubmit={personalForm.handleSubmit(onPersonalSubmit)}>
          <div className="grid gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Complete your profile</h1>
              <p className="text-muted-foreground text-sm text-balance">
                Enter your details to finish creating your account
              </p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <CustomFormField
                  control={personalForm.control}
                  fieldType={FormFieldType.INPUT}
                  inputType="text"
                  name="firstName"
                  label="First Name"
                  placeholder="John"
                />
              </div>
              <div className="flex-1">
                <CustomFormField
                  control={personalForm.control}
                  fieldType={FormFieldType.INPUT}
                  inputType="text"
                  name="lastName"
                  label="Last Name"
                  placeholder="Doe"
                />
              </div>
            </div>

            <CustomFormField
              control={personalForm.control}
              fieldType={FormFieldType.INPUT}
              inputType="password"
              name="password"
              label="Password"
              placeholder="********"
            />

            <div className="grid gap-2">
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text="Sign Up"
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
          </div>
        </form>
      </Form>
    );
  }

  return null;
};

export default SignUpForm;
