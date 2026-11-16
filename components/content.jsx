"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { marked } from "marked";
import DOMPurify from "dompurify";
import katex from "katex";
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code2, Link2, ImageIcon, Table2, Undo2, Redo2, Pilcrow,
} from "lucide-react";
import { useApp } from "./Providers";

function extensions(placeholder) {
  return [
    StarterKit.configure({ link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } } }),
    Image,
    TableKit.configure({ table: { resizable: false } }),
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}

function safeUrl(u) {
  try {
    const x = new URL(u, "http://x.invalid");
    return ["http:", "https:", "mailto:"].includes(x.protocol);
  } catch {
    return false;
  }
}

export function RichEditor({ value, onChange }) {
  const { t } = useApp();
  const editor = useEditor({
    extensions: extensions(t("editor.placeholder")),
    content: value || "",
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose" } },
    onUpdate: ({ editor }) => onChange?.({ json: editor.getJSON(), text: editor.getText({ blockSeparator: "\n" }) }),
  });
  useEffect(() => {
    if (editor) onChange?.({ json: editor.getJSON(), text: editor.getText({ blockSeparator: "\n" }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);
  if (!editor) return <div className="editor"><div className="editor-area" /></div>;

  const B = ({ icon: I, label, active, run, disabled }) => (
    <button type="button" title={label} aria-label={label} className={active ? "on" : ""} disabled={disabled} onClick={run}>
      <I size={17} />
    </button>
  );
  const c = () => editor.chain().focus();
  return (
    <div className="editor">
      <div className="editor-bar">
        <B icon={Pilcrow} label={t("editor.p")} active={editor.isActive("paragraph")} run={() => c().setParagraph().run()} />
        <B icon={Heading1} label={t("editor.h1")} active={editor.isActive("heading", { level: 1 })} run={() => c().toggleHeading({ level: 1 }).run()} />
        <B icon={Heading2} label={t("editor.h2")} active={editor.isActive("heading", { level: 2 })} run={() => c().toggleHeading({ level: 2 }).run()} />
        <B icon={Heading3} label={t("editor.h3")} active={editor.isActive("heading", { level: 3 })} run={() => c().toggleHeading({ level: 3 }).run()} />
        <span className="sep" />
        <B icon={Bold} label={t("editor.bold")} active={editor.isActive("bold")} run={() => c().toggleBold().run()} />
        <B icon={Italic} label={t("editor.italic")} active={editor.isActive("italic")} run={() => c().toggleItalic().run()} />
        <B icon={Link2} label={t("editor.link")} active={editor.isActive("link")} run={() => {
          const prev = editor.getAttributes("link").href || "https://";
          const url = window.prompt(t("editor.linkPrompt"), prev);
          if (url === null) return;
          if (url === "") return c().unsetLink().run();
          if (safeUrl(url)) c().extendMarkRange("link").setLink({ href: url }).run();
        }} />
        <span className="sep" />
        <B icon={List} label={t("editor.bullet")} active={editor.isActive("bulletList")} run={() => c().toggleBulletList().run()} />
        <B icon={ListOrdered} label={t("editor.ordered")} active={editor.isActive("orderedList")} run={() => c().toggleOrderedList().run()} />
        <B icon={Quote} label={t("editor.quote")} active={editor.isActive("blockquote")} run={() => c().toggleBlockquote().run()} />
        <B icon={Code2} label={t("editor.code")} active={editor.isActive("codeBlock")} run={() => c().toggleCodeBlock().run()} />
        <span className="sep" />
        <B icon={ImageIcon} label={t("editor.image")} run={() => {
          const url = window.prompt(t("editor.imagePrompt"), "https://");
          if (url && safeUrl(url)) c().setImage({ src: url }).run();
        }} />
        <B icon={Table2} label={t("editor.table")} run={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <span className="sep" />
        <B icon={Undo2} label={t("editor.undo")} disabled={!editor.can().undo()} run={() => c().undo().run()} />
        <B icon={Redo2} label={t("editor.redo")} disabled={!editor.can().redo()} run={() => c().redo().run()} />
      </div>
      <div className="editor-area"><EditorContent editor={editor} /></div>
    </div>
  );
}

export function RichView({ json, onReady }) {
  const editor = useEditor({
    extensions: extensions(),
    content: json || "",
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose" } },
    onCreate: () => onReady?.(),
  });
  if (!editor) return null;
  return <EditorContent editor={editor} />;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLatex(expr, displayMode) {
  try {
    return katex.renderToString(expr.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return escapeHtml(expr);
  }
}

export function renderMarkdown(src) {
  if (!src) return "";
  const stash = [];
  const put = (html) => {
    const token = `@@SUMMY_TOKEN_${stash.length}@@`;
    stash.push(html);
    return token;
  };

  // 1. Protect fenced code blocks (and turn ```mermaid into interactive diagram containers)
  let text = String(src).replace(/```([a-zA-Z0-9_-]*)[ \t]*\r?\n([\s\S]*?)```/g, (full, lang, code) => {
    const l = (lang || "").trim().toLowerCase();
    if (l === "mermaid") {
      const encoded = encodeURIComponent(code.trim());
      return put(
        `<div class="mermaid-block" data-mermaid="${encoded}"><pre><code>${escapeHtml(code.trim())}</code></pre></div>`
      );
    }
    return put(`<pre><code class="language-${escapeHtml(l)}">${escapeHtml(code.replace(/\n$/, ""))}</code></pre>`);
  });

  // 2. Protect inline code spans
  text = text.replace(/`([^`\n]+)`/g, (_m, c) => put(`<code>${escapeHtml(c)}</code>`));

  // 3. Render display math: $$...$$ and \[...\]
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => put(`<div class="math-block">${renderLatex(expr, true)}</div>`));
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_m, expr) => put(`<div class="math-block">${renderLatex(expr, true)}</div>`));

  // 4. Render inline math: \(...\) and $...$
  text = text.replace(/\\\((.+?)\\\)/g, (_m, expr) => put(renderLatex(expr, false)));
  text = text.replace(/(^|[^\\$])\$([^\s$][^$\n]*?[^\s$]|[^\s$])\$(?!\$)/g, (_m, pre, expr) => `${pre}${put(renderLatex(expr, false))}`);

  // 5. Parse Markdown
  let raw = marked.parse(text, { gfm: true, breaks: false, async: false });

  // 6. Restore stashed HTML tokens
  raw = raw.replace(/@@SUMMY_TOKEN_(\d+)@@/g, (_m, idx) => stash[Number(idx)] ?? "");

  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ["target", "data-mermaid", "aria-hidden", "style"],
    ADD_TAGS: [
      "math", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub",
      "msubsup", "mfrac", "msqrt", "mroot", "mtext", "mspace", "mtable",
      "mtr", "mtd", "mover", "munder", "munderover", "annotation",
      "svg", "path", "line", "rect", "circle", "g",
    ],
  });
}

let mermaidSeq = 0;

function isDarkActive(theme) {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function MarkdownView({ source, onReady }) {
  const { t, theme, toast } = useApp();
  const [html, setHtml] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    setHtml(renderMarkdown(source));
  }, [source]);

  useEffect(() => {
    if (!html) return;
    onReady?.();
    const root = containerRef.current;
    if (!root) return;
    const blocks = [...root.querySelectorAll(".mermaid-block[data-mermaid]")];
    if (!blocks.length) return;

    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const dark = isDarkActive(theme);
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "var(--font-prose), sans-serif",
          themeVariables: dark
            ? {
                background: "#0f0f0f",
                primaryColor: "#171717",
                primaryTextColor: "#ededed",
                primaryBorderColor: "#3291ff",
                secondaryColor: "#141414",
                tertiaryColor: "#111111",
                lineColor: "#a1a1a1",
                textColor: "#ededed",
                mainBkg: "#171717",
                nodeBorder: "#3d3d3d",
                clusterBkg: "#121212",
                clusterBorder: "#2e2e2e",
                edgeLabelBackground: "#0f0f0f",
                titleColor: "#ededed",
              }
            : {
                background: "#ffffff",
                primaryColor: "#f4f7ff",
                primaryTextColor: "#171717",
                primaryBorderColor: "#0070f3",
                secondaryColor: "#fafafa",
                tertiaryColor: "#ffffff",
                lineColor: "#555555",
                textColor: "#171717",
                mainBkg: "#ffffff",
                nodeBorder: "#c9c9c9",
                clusterBkg: "#fafafa",
                clusterBorder: "#e2e2e2",
                edgeLabelBackground: "#ffffff",
                titleColor: "#171717",
              },
        });

        for (const el of blocks) {
          if (cancelled) return;
          const code = decodeURIComponent(el.getAttribute("data-mermaid") || "");
          if (!code) continue;
          const id = `summy-mmd-${++mermaidSeq}`;
          try {
            const { svg } = await mermaid.render(id, code);
            if (cancelled) return;
            el.innerHTML = `
              <div class="mermaid-head">
                <span class="mermaid-label">${escapeHtml(t("mermaid.diagram"))}</span>
                <div class="mermaid-actions">
                  <button type="button" class="mmd-btn on" data-mode="graph">${escapeHtml(t("mermaid.viewGraph"))}</button>
                  <button type="button" class="mmd-btn" data-mode="code">${escapeHtml(t("mermaid.viewCode"))}</button>
                  <button type="button" class="mmd-btn" data-action="copy">${escapeHtml(t("mermaid.copy"))}</button>
                </div>
              </div>
              <div class="mermaid-canvas">${svg}</div>
              <pre class="mermaid-code" hidden><code>${escapeHtml(code)}</code></pre>
            `;
            const graphBtn = el.querySelector('[data-mode="graph"]');
            const codeBtn = el.querySelector('[data-mode="code"]');
            const copyBtn = el.querySelector('[data-action="copy"]');
            const canvas = el.querySelector(".mermaid-canvas");
            const pre = el.querySelector(".mermaid-code");
            graphBtn?.addEventListener("click", () => {
              graphBtn.classList.add("on");
              codeBtn?.classList.remove("on");
              canvas.hidden = false;
              pre.hidden = true;
            });
            codeBtn?.addEventListener("click", () => {
              codeBtn.classList.add("on");
              graphBtn?.classList.remove("on");
              canvas.hidden = true;
              pre.hidden = false;
            });
            copyBtn?.addEventListener("click", () => {
              navigator.clipboard?.writeText(code);
              toast(t("common.saved"));
            });
          } catch {
            // Remove any leftover temp element mermaid might have appended
            document.getElementById(id)?.remove();
            document.getElementById(`d${id}`)?.remove();
            el.innerHTML = `
              <div class="mermaid-head">
                <span class="mermaid-label mermaid-err-label">${escapeHtml(t("mermaid.error"))}</span>
              </div>
              <pre class="mermaid-code"><code>${escapeHtml(code)}</code></pre>
            `;
          }
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, theme]);

  return <div ref={containerRef} className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
