import { Button } from "@repo/ui/components/button";
import { Loader2 } from "lucide-react";

interface ButtonProps {
  variant: ButtonVariant;
  text: string;
  icon?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
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
  type,
  isLoading,
  onClick,
}: ButtonProps) => {
  return (
    <Button
      variant={variant}
      disabled={isLoading}
      className={className}
      type={type}
      size={"lg"}
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
