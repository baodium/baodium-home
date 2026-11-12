"use client";
import type { ComponentProps } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { go } from "@codemirror/lang-go";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
import type { PracticeLanguage } from "@/lib/labs/languages";

type EditorExtensions = NonNullable<ComponentProps<typeof CodeMirror>["extensions"]>;

const extensions: Record<PracticeLanguage, EditorExtensions> = {
  python: [python(), EditorView.lineWrapping],
  typescript: [javascript({ typescript: true }), EditorView.lineWrapping],
  go: [go(), EditorView.lineWrapping],
};

export function PythonEditor({
  value,
  onChange,
  readOnly,
  language = "python",
}: {
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  language?: PracticeLanguage;
}) {
  const label =
    language === "go"
      ? "Go solution editor"
      : language === "typescript"
        ? "TypeScript solution editor"
        : "Python solution editor";
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions[language]}
      theme="dark"
      minHeight="360px"
      maxHeight="640px"
      readOnly={readOnly}
      aria-label={label}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        autocompletion: false,
      }}
    />
  );
}
