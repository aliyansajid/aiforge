import { Button } from "@repo/ui/components/button";
import { Loader2 } from "lucide-react";

interface ButtonProps {
  variant: ButtonVariant;
  text?: string;
  icon?: React.ReactNode;
  className?: string;
  size?: "sm" | "lg" | "icon";
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

enum ButtonVariant {
  DEFAULT = "default",
  DESTRUCTIVE = "destructive",
  OUTLINE = "outline",
  SECONDARY = "secondary",
  GHOST = "ghost",
  LINK = "link",
}

const CustomButton = ({
  variant,
  text,
  icon,
  className,
  size = "lg",
  type,
  isLoading,
  disabled,
  onClick,
}: ButtonProps) => {
  return (
    <Button
      variant={variant}
      disabled={disabled || isLoading}
      className={className}
      type={type}
      size={size}
      onClick={onClick}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <>
          {icon}
          {text}
        </>
      )}
    </Button>
  );
};

export { CustomButton, ButtonVariant };
