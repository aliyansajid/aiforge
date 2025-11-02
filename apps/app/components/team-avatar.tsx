import Image from "next/image";

interface TeamAvatarProps {
  image: string | null;
  name: string;
  size: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
};

const iconSizeClasses = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

export function TeamAvatar({ image, name, size, className }: TeamAvatarProps) {
  const sizeClass = sizeClasses[size];
  const iconSizeClass = iconSizeClasses[size];

  if (!image) {
    const initial = name.charAt(0).toUpperCase();

    const hash = initial.charCodeAt(0) % 5;
    const gradients = [
      "bg-gradient-to-tl from-red-500/80 via-pink-500/80 to-purple-500/80",
      "bg-gradient-to-tr from-blue-500/80 via-cyan-500/80 to-teal-500/80",
      "bg-gradient-to-bl from-green-500/80 via-lime-500/80 to-yellow-500/80",
      "bg-gradient-to-br from-purple-500/80 via-fuchsia-500/80 to-pink-500/80",
      "bg-gradient-to-tl from-orange-500/80 via-amber-500/80 to-yellow-500/80",
    ];

    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br text-white font-semibold ${sizeClass} ${gradients[hash]} ${className}`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${sizeClass} ${className}`}
    >
      <Image
        src={image}
        alt={`${name} team avatar`}
        fill
        className="object-cover"
        sizes={sizeClass}
      />
    </div>
  );
}
