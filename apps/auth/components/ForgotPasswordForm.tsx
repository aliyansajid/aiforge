"use client";

import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@repo/ui/components/form";
import CustomFormField from "@repo/ui/components/CustomFormField";
import { FormFieldType } from "@repo/ui/lib/types";
import Link from "next/link";

const formSchema = z.object({
  username: z.string().min(2).max(50),
});

const ForgotPasswordForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Forgot your password</CardTitle>
          <CardDescription>
            Enter your email to get password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <CustomFormField
                control={form.control}
                fieldType={FormFieldType.INPUT}
                name="email"
                placeholder="john@email.com"
              />
              <Button type="submit" className="w-full">
                Reset password
              </Button>
              <div className="text-center">
                <Link
                  href="login"
                  className="text-sm underline-offset-4 hover:underline"
                >
                  Back to login
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordForm;
