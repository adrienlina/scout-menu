import { useRef, useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface MenuDescriptionProps {
  menu: { id: string; description: string | null };
  isOwner: boolean;
}

export function MenuDescription({ menu, isOwner }: MenuDescriptionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const updateDescription = useMutation({
    mutationFn: async (description: string | null) => {
      const { error } = await supabase
        .from("menus")
        .update({ description })
        .eq("id", menu.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-detail", menu.id] });
    },
  });

  const handleChange = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const value = html === "<p></p>" || html === "" ? null : html;
        updateDescription.mutate(value);
      }, 1000);
    },
    [menu.id]
  );

  const handleImagePaste = useCallback(
    async (file: File): Promise<string | null> => {
      setUploading(true);
      try {
        const ext = file.name?.split(".").pop() || "png";
        const path = `${menu.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("menu-images")
          .upload(path, file, { contentType: file.type });
        if (error) throw error;

        const { data } = supabase.storage
          .from("menu-images")
          .getPublicUrl(path);
        return data.publicUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast({ title: "Erreur d'upload", description: message, variant: "destructive" });
        return null;
      } finally {
        setUploading(false);
      }
    },
    [menu.id, toast]
  );

  const content = menu.description || "";
  const showPlaceholder = isOwner && !content;

  return (
    <div className="relative">
      <RichTextEditor
        content={content}
        onChange={isOwner ? handleChange : undefined}
        editable={isOwner}
        placeholder={showPlaceholder ? "Ajouter une description…" : undefined}
        onImagePaste={isOwner ? handleImagePaste : undefined}
      />
      {uploading && (
        <div className="absolute top-2 right-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
