"use client";

import { useEffect, useMemo, useRef } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { Decoration, type DecorationSet } from "@codemirror/view";
import { ViewPlugin, type ViewUpdate } from "@codemirror/view";

function lineHighlight(lineNo: number) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = highlight(view, lineNo);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = highlight(update.view, lineNo);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}

function highlight(view: EditorView, lineNo: number): DecorationSet {
  const n = Math.max(1, Math.min(lineNo, view.state.doc.lines));
  const line = view.state.doc.line(n);
  return Decoration.set([Decoration.line({ class: "cm-ch1-active" }).range(line.from)]);
}

/**
 * The handler the engine executes, highlighted on the line the request is in.
 */
export function Ch1CodeEditor({
  source,
  highlightLine,
  onChange,
}: {
  source: string;
  highlightLine: number;
  onChange: (source: string) => void;
}) {
  const viewRef = useRef<EditorView | null>(null);
  const extensions = useMemo(
    () => [python(), lineHighlight(highlightLine), EditorView.editable.of(true)],
    [highlightLine],
  );

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const n = Math.max(1, Math.min(highlightLine, view.state.doc.lines));
    const line = view.state.doc.line(n);
    view.dispatch({
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    });
  }, [highlightLine, source]);

  return (
    <CodeMirror
      className="ch1-editor"
      value={source}
      height="360px"
      theme="dark"
      extensions={extensions}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        searchKeymap: false,
        autocompletion: false,
      }}
      onCreateEditor={(view) => {
        viewRef.current = view;
      }}
      aria-label="Product handler source, linked to the simulation"
    />
  );
}
