import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: string;
  suffix?: ReactNode;
  suffixClassName?: string;
  className?: string;
  allowDecimals?: boolean;
}

export function NumberInput({
  value,
  onChange,
  min,
  step,
  suffix,
  suffixClassName,
  className,
  allowDecimals = false,
}: NumberInputProps) {
  const isStringSuffix = typeof suffix === "string";
  const [localValue, setLocalValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = useRef(false);

  // Sync from parent only when not actively editing
  useEffect(() => {
    if (!isEditing.current) {
      setLocalValue(String(value));
    }
  }, [value]);

  const parseValue = useCallback(
    (raw: string): number | null => {
      const trimmed = raw.trim();
      if (trimmed === "" || trimmed === "-") return null;
      const num = allowDecimals ? parseFloat(trimmed) : parseInt(trimmed, 10);
      if (isNaN(num)) return null;
      if (min !== undefined && num < min) return null;
      return num;
    },
    [allowDecimals, min]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    const num = parseValue(raw);
    if (num !== null) {
      onChange(num);
    }
  };

  const handleFocus = () => {
    isEditing.current = true;
  };

  const handleBlur = () => {
    isEditing.current = false;
    // Reset display to canonical value
    setLocalValue(String(value));
  };

  return (
    <div className="relative flex items-center">
      <Input
        ref={inputRef}
        type="number"
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "h-7 text-xs tabular-nums",
          suffix ? "pr-12" : "",
          className
        )}
        min={min}
        step={step}
      />
      {suffix !== undefined && suffix !== null && suffix !== false && (
        <span
          className={cn(
            "absolute right-2 text-[10px] text-muted-foreground whitespace-nowrap",
            isStringSuffix && "pointer-events-none",
            suffixClassName,
          )}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}
