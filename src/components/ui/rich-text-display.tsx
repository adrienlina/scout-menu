import { useMemo } from "react";
import { marked } from "marked";
import { cn } from "@/lib/utils";

interface RichTextDisplayProps {
  content: string | null | undefined;
  className?: string;
  clamp?: boolean;
}

export function RichTextDisplay({ content, className, clamp = false }: RichTextDisplayProps) {
  const html = useMemo(() => {
    if (!content) return "";
    try {
      return marked.parse(content, { async: false }) as string;
    } catch {
      return content;
    }
  }, [content]);

  if (!html) return null;

  return (
    <div
      className={cn(
        "rte-display text-sm text-muted-foreground",
        clamp && "line-clamp-3",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
