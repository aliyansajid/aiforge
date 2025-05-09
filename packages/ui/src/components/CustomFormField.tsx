"use client";

import { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { FormFieldType } from "../lib/types";
import { Input } from "./input";

interface CustomProps {
  control: Control<any>;
  fieldType: FormFieldType;
  inputType?: string;
  name: string;
  label?: string;
  placeholder?: string;
}

const RenderField = ({ field, props }: { field: any; props: CustomProps }) => {
  const { fieldType, inputType, placeholder } = props;

  switch (fieldType) {
    case FormFieldType.INPUT:
      return (
        <FormControl>
          <Input {...field} type={inputType} placeholder={placeholder} />
        </FormControl>
      );
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
          <RenderField field={field} props={props} />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomFormField;
