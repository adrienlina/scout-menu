import {
  MarkdownSerializer,
  MarkdownParser,
  defaultMarkdownSerializer,
  defaultMarkdownParser,
} from "prosemirror-markdown";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

// TipTap uses camelCase node names; prosemirror-markdown uses snake_case.
// This serializer bridges the gap so bullet lists etc. round-trip correctly.
export const tiptapMarkdownSerializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    bulletList: defaultMarkdownSerializer.nodes.bullet_list,
    orderedList: defaultMarkdownSerializer.nodes.ordered_list,
    listItem: defaultMarkdownSerializer.nodes.list_item,
    codeBlock: defaultMarkdownSerializer.nodes.code_block,
    horizontalRule: defaultMarkdownSerializer.nodes.horizontal_rule,
    hardBreak: defaultMarkdownSerializer.nodes.hard_break,
  },
  {
    ...defaultMarkdownSerializer.marks,
    bold: defaultMarkdownSerializer.marks.strong,
    italic: defaultMarkdownSerializer.marks.em,
    strike: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
  }
);

const tiptapSchema = getSchema([StarterKit]);

export const tiptapMarkdownParser = new MarkdownParser(
  tiptapSchema,
  defaultMarkdownParser.tokenizer,
  {
    blockquote: { block: "blockquote" },
    paragraph: { block: "paragraph" },
    list_item: { block: "listItem" },
    bullet_list: { block: "bulletList" },
    ordered_list: {
      block: "orderedList",
      getAttrs: (tok) => ({ order: +(tok.attrGet("order") ?? 1) }),
    },
    heading: { block: "heading", getAttrs: (tok) => ({ level: +tok.tag.slice(1) }) },
    code_block: { block: "codeBlock", noCloseToken: true },
    fence: {
      block: "codeBlock",
      getAttrs: (tok) => ({ language: tok.info || "" }),
      noCloseToken: true,
    },
    hr: { node: "horizontalRule" },
    hardbreak: { node: "hardBreak" },
    em: { mark: "italic" },
    strong: { mark: "bold" },
    code_inline: { mark: "code", noCloseToken: true },
    link: {
      mark: "link",
      getAttrs: (tok) => ({
        href: tok.attrGet("href"),
        title: tok.attrGet("title") || null,
      }),
    },
  }
);

export function serializeToMarkdown(
  doc: Parameters<typeof tiptapMarkdownSerializer.serialize>[0]
): string {
  return tiptapMarkdownSerializer.serialize(doc);
}

export function parseMarkdown(markdown: string) {
  return tiptapMarkdownParser.parse(markdown);
}
