"use client";

import { Control } from "react-hook-form";
import { Input } from "@repo/ui/components/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";

interface CustomProps {
  control: Control<any>;
  fieldType: FormFieldType;
  inputType?: string;
  name: string;
  label?: string;
  placeholder?: string;
}

enum FormFieldType {
  INPUT = "input",
  TEXTAREA = "textarea",
  SELECT = "select",
  RADIO = "radio",
  CHECKBOX = "checkbox",
}

const RenderField = ({ field, props }: { field: any; props: CustomProps }) => {
  switch (props.fieldType) {
    case FormFieldType.INPUT:
      return (
        <FormControl>
          <Input
            placeholder={props.placeholder}
            type={props.inputType}
            {...field}
          />
        </FormControl>
      );

    default:
      break;
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
          {fieldType != FormFieldType.CHECKBOX && label && (
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
