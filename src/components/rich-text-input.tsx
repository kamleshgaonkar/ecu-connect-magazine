"use client";
import { useEffect, useRef } from "react";
import type { RichText } from "../domain/content";
import { safeLink } from "../domain/content";
import { renderRichBlock } from "../content/text-dom";
import { importWordContent, richText } from "../content/word-paste";
export function RichTextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RichText;
  onChange: (value: RichText) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    last = useRef("");
  useEffect(() => {
    const json = JSON.stringify(value);
    if (json !== last.current && root.current) {
      root.current.replaceChildren(
        ...renderRichBlock({
          id: "inline",
          type: "paragraph",
          text: "",
          rich: value,
        }).childNodes,
      );
      root.current.style.textAlign = value.align;
      last.current = json;
    }
  }, [value]);
  function publish() {
    if (!root.current) return;
    const next = richText(root.current);
    last.current = JSON.stringify(next);
    onChange(next);
  }
  function command(name: string) {
    root.current?.focus();
    if (name === "createLink") {
      const url = window.prompt("Link URL or email");
      const link = url && safeLink(url);
      if (link) document.execCommand(name, false, link);
    } else document.execCommand(name);
    publish();
  }
  return (
    <div className="component-rich-field">
      <span>{label}</span>
      <div role="toolbar" aria-label={label + " formatting"}>
        {[
          ["Bold", "bold"],
          ["Italic", "italic"],
          ["Underline", "underline"],
          ["Link", "createLink"],
        ].map(([text, cmd]) => (
          <button
            type="button"
            className="text-button"
            aria-label={label + " " + text}
            key={cmd}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(cmd)}
          >
            {text}
          </button>
        ))}
        <select
          aria-label={label + " alignment"}
          value={value.align}
          onChange={(e) =>
            onChange({ ...value, align: e.target.value as RichText["align"] })
          }
        >
          {["left", "center", "right", "justify"].map((align) => (
            <option key={align}>{align}</option>
          ))}
        </select>
      </div>
      <div
        ref={root}
        contentEditable
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        suppressContentEditableWarning
        onInput={publish}
        onPaste={(event) => {
          event.preventDefault();
          const result = importWordContent(
            event.clipboardData.getData("text/html"),
            event.clipboardData.getData("text/plain"),
          );
          const runs = result.blocks.flatMap((block, i) => [
            ...(i ? [{ text: "\n" }] : []),
            ...(block.rich?.runs ?? [{ text: block.text }]),
          ]);
          const node = renderRichBlock({
            id: "paste",
            type: "paragraph",
            text: "",
            rich: { runs, align: value.align },
          });
          document.execCommand("insertHTML", false, node.innerHTML);
          publish();
        }}
      />
    </div>
  );
}
