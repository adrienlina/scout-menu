import { Checkbox } from "@/components/ui/checkbox";

export function CheckItem({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer group">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className={`text-sm transition-colors ${checked ? "line-through text-muted-foreground" : ""}`}>
        {label}
      </span>
    </label>
  );
}
