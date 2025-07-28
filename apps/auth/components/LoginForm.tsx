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
import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { loginSchema } from "@/schemas/auth";
import { signIn } from "@repo/auth";
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
    toast.error("Failed to capture session info");
  }
}

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Controls which form variant is shown (OAuth vs email/password)
  const showEmailForm = searchParams.get("email") === "true";

  // Redirects to email/password login form
  const handleEmailClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("email", "true");
    router.push(`?${params.toString()}`);
  };

  // Redirects back to main login options (OAuth providers)
  const handleBackClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("email");
    router.push(`?${params.toString()}`);
  };

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
    setIsLoading(true);

    startTransition(async () => {
      try {
        const result = await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false,
        });

        if (result?.error) {
          toast.error("Invalid credentials");
          return;
        }

        await captureSessionInfo();
        router.push("/");
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {!showEmailForm ? (
          // OAuth + email login options view
          <>
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
          </>
        ) : (
          // Email/password login form view
          <div className="grid gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Login to your account</h1>
              <p className="text-muted-foreground text-sm text-balance">
                Enter your email below to login to your account
              </p>
            </div>

            <CustomFormField
              control={form.control}
              fieldType={FormFieldType.INPUT}
              inputType="email"
              name="email"
              label="Email"
              placeholder="m@example.com"
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
                href="forgot-password"
                className="text-sm underline-offset-4 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            <div className="grid gap-2">
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text="Login"
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
        )}
      </form>
    </Form>
  );
};

export default LoginForm;
