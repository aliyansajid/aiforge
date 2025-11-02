"use client";

import { useState } from "react";
import { Control } from "react-hook-form";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@repo/ui/components/input-otp";
import { Button } from "@repo/ui/components/button";
import { Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@repo/ui/components/select";

interface CustomProps {
  control: Control<any>;
  fieldType: FormFieldType;
  inputType?: string;
  name: string;
  label?: string;
  placeholder?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  onChange?: (value: any) => void;
  accept?: string;
  rows?: number;
}

enum FormFieldType {
  INPUT = "input",
  OTP = "otp",
  TEXTAREA = "textarea",
  SELECT = "select",
  RADIO = "radio",
  CHECKBOX = "checkbox",
  SWITCH = "switch",
}

const RenderField = ({ field, props }: { field: any; props: CustomProps }) => {
  const [showPassword, setShowPassword] = useState(false);

  switch (props.fieldType) {
    case FormFieldType.INPUT:
      if (props.inputType === "file") {
        return (
          <FormControl>
            <Input
              type="file"
              accept={props.accept}
              disabled={props.disabled}
              className={props.className}
              onChange={(e) => {
                const file = e.target.files?.[0];
                field.onChange(file);
                props.onChange?.(file);
              }}
            />
          </FormControl>
        );
      }

      return (
        <FormControl>
          <div className="relative">
            <Input
              {...field}
              placeholder={props.placeholder}
              disabled={props.disabled}
              type={
                props.inputType === "password" && showPassword
                  ? "text"
                  : props.inputType
              }
              className={props.className}
              onChange={(e) => {
                field.onChange(e);
                props.onChange?.(e.target.value);
              }}
            />
            {props.inputType === "password" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 hover:rounded-full"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
          </div>
        </FormControl>
      );

    case FormFieldType.TEXTAREA:
      return (
        <FormControl>
          <Textarea
            {...field}
            placeholder={props.placeholder}
            disabled={props.disabled}
            className={props.className}
            rows={props.rows || 4}
            onChange={(e) => {
              field.onChange(e);
              props.onChange?.(e.target.value);
            }}
          />
        </FormControl>
      );

    case FormFieldType.OTP:
      return (
        <FormControl>
          <InputOTP
            {...field}
            maxLength={6}
            disabled={props.disabled}
            onChange={(value) => {
              field.onChange(value);
              props.onChange?.(value);
            }}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </FormControl>
      );

    case FormFieldType.SELECT:
      return (
        <Select
          onValueChange={(value) => {
            field.onChange(value);
            props.onChange?.(value);
          }}
          defaultValue={field.value}
          disabled={props.disabled}
        >
          <FormControl>
            <SelectTrigger className={props.className}>
              <SelectValue
                placeholder={props.placeholder || "Select an option"}
              />
            </SelectTrigger>
          </FormControl>
          <SelectContent>{props.children}</SelectContent>
        </Select>
      );

    default:
      return null;
  }
};

const CustomFormField = (props: CustomProps) => {
  const { control, fieldType, name, label } = props;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {fieldType !== FormFieldType.CHECKBOX && label && (
            <FormLabel>{label}</FormLabel>
          )}
          <RenderField props={props} field={field} />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export { CustomFormField, FormFieldType };
