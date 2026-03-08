import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  className?: string;
}

export function NumberInput({ value, onChange, min = 0, className }: NumberInputProps) {
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  return (
    <Input
      type="number"
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        const num = parseInt(e.target.value) || 0;
        if (num >= min) onChange(num);
      }}
      onBlur={() => setLocalValue(String(value))}
      className={cn("h-5 w-10 border-0 bg-transparent p-0 text-center text-xs font-semibold", className)}
      min={min}
    />
  );
}
