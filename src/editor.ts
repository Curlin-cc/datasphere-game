import { EditorView, basicSetup } from 'codemirror';
import { keymap } from '@codemirror/view';
import { Compartment, Prec } from '@codemirror/state';
import { sql, StandardSQL } from '@codemirror/lang-sql';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

export interface SqlEditor {
  getValue(): string;
  setValue(text: string): void;
  setSchema(schema: Record<string, string[]>): void;
  /** Inserts text at the cursor. */
  insert(text: string): void;
  focus(): void;
}

/** Syntax colours come from CSS variables, so light and dark mode both work. */
const highlight = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--code-keyword)', fontWeight: '500' },
  { tag: [t.string, t.special(t.string)], color: 'var(--code-string)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--code-number)' },
  { tag: t.comment, color: 'var(--code-comment)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.standard(t.name)], color: 'var(--code-function)' },
  { tag: [t.operator, t.punctuation], color: 'var(--ink-soft)' },
]);

const chrome = EditorView.theme({
  '&': { height: '100%', color: 'var(--ink)', backgroundColor: 'var(--surface)' },
  '.cm-scroller': { fontFamily: 'var(--font-code)' },
  '.cm-content': { caretColor: 'var(--accent)' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-activeLine': { backgroundColor: 'var(--code-active-line)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--code-active-line)', color: 'var(--ink)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--code-selection) !important',
  },
  '.cm-matchingBracket': { backgroundColor: 'var(--code-selection)', outline: 'none' },
  '.cm-tooltip': { backgroundColor: 'var(--surface)', border: '1px solid var(--line-strong)', color: 'var(--ink)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent)', color: 'var(--accent-ink)' },
});

/** Creates the SQL editor. Ctrl/Cmd+Enter runs the query. */
export function createSqlEditor(parent: HTMLElement, initial: string, onRun: () => void): SqlEditor {
  const language = new Compartment();
  const lang = (schema: Record<string, string[]>) =>
    sql({ dialect: StandardSQL, schema, upperCaseKeywords: true });

  const view = new EditorView({
    parent,
    doc: initial,
    extensions: [
      basicSetup,
      EditorView.lineWrapping,
      language.of(lang({})),
      Prec.highest(syntaxHighlighting(highlight)),
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-Enter',
            run: () => {
              onRun();
              return true;
            },
          },
        ]),
      ),
      chrome,
    ],
  });

  return {
    getValue: () => view.state.doc.toString(),
    setValue: (text) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
    setSchema: (schema) => view.dispatch({ effects: language.reconfigure(lang(schema)) }),
    insert: (text) => {
      const { from, to } = view.state.selection.main;
      view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
      view.focus();
    },
    focus: () => view.focus(),
  };
}
