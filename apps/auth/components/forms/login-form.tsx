"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@repo/ui/components/form";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/custom-form-field";
import { useTransition, useState } from "react";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginSchema } from "@/schemas/auth";
import { signIn } from "@repo/auth";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";
import GoogleAuthButton from "../GoogleAuthButton";
import GitHubAuthButton from "../GitHubAuthButton";
import { Spinner } from "@repo/ui/components/spinner";

/**
 * Helper to record session metadata.
 * Called only after a successful login.
 */
async function captureSessionInfo() {
  try {
    const response = await fetch("/api/session-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Failed to capture session info");
    }
  } catch (error) {
    // Silently fail; user login is successful regardless of tracking
    console.warn("Failed to capture session info:", error);
  }
}

const LoginForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState<"initial" | "email">(
    "initial"
  );

  const formSchema = loginSchema;

  // React Hook Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  /**
   * Handles email/password sign-in flow.
   * Authenticates using credentials provider, then tracks session.
   */
  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      try {
        const response = await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false,
        });

        if (response?.error) {
          toast.error("Invalid credentials");
          return;
        }

        await captureSessionInfo();
        router.push("/");
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  /**
   * Navigate back to initial view and reset the form.
   */
  const handleBackClick = () => {
    startTransition(() => {
      form.reset();
      setCurrentStep("initial");
    });
  };

  // Initial view: OAuth + Continue with Email
  if (currentStep === "initial") {
    return (
      <div className="grid gap-10">
        <h1 className="text-2xl font-bold text-center">
          Login to your account
        </h1>
        <div className="grid gap-4">
          <Button
            type="button"
            className="rounded-full"
            onClick={() => setCurrentStep("email")}
            disabled={isPending}
          >
            <Mail />
            Continue with Email
          </Button>

          <Separator />

          <GoogleAuthButton />
          <GitHubAuthButton />

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?&nbsp;
            <Link href="/sign-up" className="text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Email/password login form view
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email and password to login
          </p>
        </div>

        <CustomFormField
          control={form.control}
          fieldType={FormFieldType.INPUT}
          inputType="email"
          name="email"
          label="Email"
          placeholder="e.g. m@example.com"
        />

        <div className="grid gap-2">
          <CustomFormField
            control={form.control}
            fieldType={FormFieldType.INPUT}
            inputType="password"
            name="password"
            label="Password"
            placeholder="********"
          />
          <Link
            href="/forgot-password"
            className="text-sm underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <div className="grid gap-2">
          <Button disabled={isPending}>
            {isPending ? <Spinner /> : "Login"}
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={handleBackClick}
            disabled={isPending}
          >
            Go back
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LoginForm;
