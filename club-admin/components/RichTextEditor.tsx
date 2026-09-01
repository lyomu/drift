"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { MaterialIcon } from "./dashboard-design";

/**
 * The one rich-text surface in the console — league rules. Output is HTML,
 * constrained to exactly the tag set the backend sanitiser
 * (`common/rich-text.util.ts`) allows: inline marks, lists, h2–h4,
 * blockquote, links. Anything the editor can't produce can't survive a
 * round-trip, so the two stay in lock-step.
 */

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    link: {
      openOnClick: false,
      autolink: true,
      protocols: ["http", "https", "mailto"],
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
    // The output HTML is re-sanitised server-side (common/rich-text.util.ts);
    // this keeps the editor from producing tags that would be stripped anyway.
    codeBlock: false,
    horizontalRule: false,
  }),
];

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  icon,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded transition-colors disabled:opacity-40 ${
        active
          ? "bg-drift-primary text-white"
          : "text-drift-text-secondary hover:bg-drift-primary-light hover:text-drift-text-primary"
      }`}
    >
      <MaterialIcon name={icon} className="text-[18px]" />
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const promptLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-drift-border bg-drift-background px-1.5 py-1">
      <ToolbarButton
        icon="format_bold"
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon="format_italic"
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon="format_underlined"
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        icon="strikethrough_s"
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <span className="mx-1 h-5 w-px bg-drift-border" />
      <ToolbarButton
        icon="title"
        label="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      />
      <ToolbarButton
        icon="format_h3"
        label="Subheading"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      />
      <span className="mx-1 h-5 w-px bg-drift-border" />
      <ToolbarButton
        icon="format_list_bulleted"
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon="format_list_numbered"
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        icon="format_quote"
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <span className="mx-1 h-5 w-px bg-drift-border" />
      <ToolbarButton
        icon="link"
        label="Link"
        active={editor.isActive("link")}
        onClick={promptLink}
      />
      <ToolbarButton
        icon="format_clear"
        label="Clear formatting"
        onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()
        }
      />
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions,
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "drift-prose min-h-[160px] px-3 py-2.5 text-[13.5px] text-drift-text-primary focus:outline-none",
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  return (
    <div className="overflow-hidden rounded-md border border-drift-border bg-drift-surface focus-within:ring-2 focus-within:ring-drift-primary focus-within:ring-offset-1">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

/** Read-only render of already-sanitised league-rules HTML. */
export function RichText({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={`drift-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
