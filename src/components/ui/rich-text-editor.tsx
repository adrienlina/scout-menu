import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Heading2, List, ListOrdered, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { serializeToMarkdown, parseMarkdown } from "@/lib/rte-markdown";

interface RichTextEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        active && "text-foreground bg-accent"
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Ajouter une description…",
  className,
  autoFocus = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value ? (() => {
      try {
        const doc = parseMarkdown(value);
        return doc?.toJSON() ?? "";
      } catch {
        return value;
      }
    })() : "",
    autofocus: autoFocus,
    onUpdate({ editor }) {
      onChange(serializeToMarkdown(editor.state.doc));
    },
    onBlur() {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[80px] text-sm",
      },
    },
  });

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
    >
      <div className="flex items-center gap-0.5 border-b border-border px-2 py-1">
        <ToolbarButton
          title="Gras"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italique"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-0.5" />
        <ToolbarButton
          title="Titre"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-0.5" />
        <ToolbarButton
          title="Liste à puces"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Liste numérotée"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Citation"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <div className="px-3 py-2 rte-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
