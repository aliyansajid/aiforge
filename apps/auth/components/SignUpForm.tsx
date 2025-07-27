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

const SignUpForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "initial" | "email" | "otp" | "personal"
  >("initial");
  const [userEmail, setUserEmail] = useState("");

  const showEmailForm = searchParams.get("email") === "true";

  // Initialize separate forms for each step with validation
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const personalForm = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
    },
  });

  // Handle URL parameter-based step navigation
  useEffect(() => {
    if (showEmailForm && currentStep === "initial") {
      setCurrentStep("email");
    }
  }, [showEmailForm, currentStep]);

  const handleEmailClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("email", "true");
    router.push(`?${params.toString()}`);
    setCurrentStep("email");
  };

  /**
   * Navigate back through steps and clean up form state
   * Resets forms and URL parameters appropriately
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
   * Handle email submission and OTP generation
   * Stores email for subsequent steps and advances to OTP verification
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
      // Clean URL after successful submission
      router.replace("/sign-up", { scroll: false });
    } else {
      toast.error(response.error || "Failed to send OTP");
    }
  }

  /**
   * Verify the OTP code entered by user
   * Advances to personal info step on successful verification
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
   * Complete user registration with personal information
   * Creates account and redirects to login on success
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
      toast.success("Account created successfully! Redirecting to login...");
      // Brief delay to show success message before redirect
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } else {
      toast.error(response.error || "Failed to create account");
    }
  }

  // Step 1: Authentication method selection
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

  // Step 2: Email input and validation
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

  // Step 3: OTP verification
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

  // Step 4: Personal information and account creation
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

            <div className="grid gap-3">
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
