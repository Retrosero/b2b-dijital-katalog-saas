import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  showIcon?: boolean;
}

export function BrandLogo({
  className,
  textClassName,
  iconClassName,
  showIcon = true
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      {showIcon && (
        <div className={cn("w-9 h-9 brand-gradient rounded-lg flex items-center justify-center shadow-md shrink-0", iconClassName)}>
          <span className="font-extrabold text-white text-base">S</span>
        </div>
      )}
      <span className={cn("brand-text text-xl truncate", textClassName)}>
        <span className="brand-text-secondary">Sat</span>
        <span className="brand-text-primary">Satma</span>
      </span>
    </div>
  );
}
