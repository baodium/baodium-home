"use client";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
const extensions = [python(), EditorView.lineWrapping];
export function PythonEditor({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
}) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme="dark"
      minHeight="360px"
      maxHeight="640px"
      readOnly={readOnly}
      aria-label="Python solution editor"
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        autocompletion: false,
      }}
    />
  );
}
