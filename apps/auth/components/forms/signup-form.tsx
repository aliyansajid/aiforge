"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@repo/ui/components/form";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/custom-form-field";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import Link from "next/link";
import GoogleAuthButton from "../GoogleAuthButton";
import GitHubAuthButton from "../GitHubAuthButton";
import { sendOtp, verifyOtp, registerUser } from "@/actions/auth-actions";
import { emailSchema, otpSchema, personalInfoSchema } from "@/schemas/auth";
import { toast } from "sonner";
import { signIn } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";
import { Spinner } from "@repo/ui/components/spinner";

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

  // UI state and step tracking
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState<
    "initial" | "email" | "otp" | "personal"
  >("initial");
  const [userEmail, setUserEmail] = useState("");

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

  /**
   * Navigate back one step and reset the appropriate form.
   */
  const handleBackClick = () => {
    if (currentStep === "email") {
      emailForm.reset();
      setCurrentStep("initial");
    } else if (currentStep === "otp") {
      otpForm.reset();
      setCurrentStep("email");
    } else if (currentStep === "personal") {
      personalForm.reset();
      setCurrentStep("otp");
    }
  };

  /**
   * Submits email and requests an OTP to be sent.
   * On success, advances to OTP input step.
   */
  const onEmailSubmit = (values: z.infer<typeof emailSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", values.email);

        const response = await sendOtp(formData);

        if (response.success) {
          setUserEmail(values.email);
          setCurrentStep("otp");
        } else {
          toast.error(response.error || "Failed to send OTP");
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  /**
   * Verifies the OTP input by the user.
   * On success, moves to personal information form.
   */
  const onOtpSubmit = (values: z.infer<typeof otpSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", userEmail);
        formData.append("otp", values.otp);

        const response = await verifyOtp(formData);

        if (response.success) {
          setCurrentStep("personal");
        } else {
          toast.error(response.error || "Invalid or expired OTP");
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  /**
   * Final step: submits personal information to create a new user.
   * Redirects to login page on success.
   */
  const onPersonalSubmit = (values: z.infer<typeof personalInfoSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", userEmail);
        formData.append("firstName", values.firstName);
        formData.append("lastName", values.lastName);
        formData.append("password", values.password);

        const response = await registerUser(formData);

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

              router.push("/account");
            }
          } catch (error) {
            toast.error("Failed to log in. Please try logging in manually.");
            router.push("/login");
          }
        } else {
          toast.error(response.error || "Failed to create account");
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  // Step 1: Choose sign-up method
  if (currentStep === "initial") {
    return (
      <div className="grid gap-10">
        <h1 className="text-2xl font-bold text-center">Create your account</h1>
        <div className="grid gap-4">
          <Button
            type="button"
            className="rounded-full"
            onClick={() => setCurrentStep("email")}
          >
            <Mail />
            Continue with Email
          </Button>

          <Separator />

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
        <form
          onSubmit={emailForm.handleSubmit(onEmailSubmit)}
          className="grid gap-6"
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Fill in the form below to create your account
            </p>
          </div>

          <CustomFormField
            control={emailForm.control}
            fieldType={FormFieldType.INPUT}
            inputType="email"
            name="email"
            label="Email"
            placeholder="e.g. m@example.com"
          />

          <div className="grid gap-2">
            <Button disabled={isPending}>
              {isPending ? <Spinner /> : "Continue"}
            </Button>

            <Button
              variant="outline"
              type="button"
              disabled={isPending}
              onClick={handleBackClick}
            >
              Go back
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  // Step 3: OTP Verification
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
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Enter verification code</h1>
            <p className="text-muted-foreground text-sm text-balance">
              We sent a 6-digit code to your email
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
            <Button disabled={isPending}>
              {isPending ? <Spinner /> : "Verify"}
            </Button>

            <Button
              variant="outline"
              type="button"
              disabled={isPending}
              onClick={handleBackClick}
            >
              Go back
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  // Step 4: Personal Info Submission
  if (currentStep === "personal") {
    return (
      <Form {...personalForm}>
        <form
          onSubmit={personalForm.handleSubmit(onPersonalSubmit)}
          className="grid gap-6"
        >
          <div className="flex flex-col items-center gap-1 text-center">
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
                placeholder="e.g. John"
              />
            </div>
            <div className="flex-1">
              <CustomFormField
                control={personalForm.control}
                fieldType={FormFieldType.INPUT}
                inputType="text"
                name="lastName"
                label="Last Name"
                placeholder="e.g. Doe"
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
            <Button disabled={isPending}>
              {isPending ? <Spinner /> : "Sign Up"}
            </Button>

            <Button
              variant="outline"
              type="button"
              disabled={isPending}
              onClick={handleBackClick}
            >
              Go back
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  return null;
};

export default SignUpForm;
