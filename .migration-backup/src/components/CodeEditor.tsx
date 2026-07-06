import { useRef, useEffect, useState, useCallback } from 'react';

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  onCursorChange?: (line: number, col: number) => void;
  readOnly?: boolean;
  remoteCursors?: { line: number; col: number; color: string; name: string }[];
}

function highlight(code: string, language: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (language === 'html') {
    html = html.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="token-tag">$2</span>');
    html = html.replace(/([\w-]+)(=)(&quot;[^&]*&quot;|"[^"]*")/g, '<span class="token-attr">$1</span>$2<span class="token-string">$3</span>');
    html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token-comment">$1</span>');
  } else if (language === 'css') {
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    html = html.replace(/([.#]?[\w-]+)(\s*\{)/g, '<span class="token-selector">$1</span>$2');
    html = html.replace(/([\w-]+)(\s*:)/g, '<span class="token-property">$1</span>$2');
    html = html.replace(/(:\s*)([^;{}]+)/g, '$1<span class="token-value">$2</span>');
  } else if (language === 'javascript' || language === 'typescript') {
    html = html.replace(/(\/\/[^\n]*)/g, '<span class="token-comment">$1</span>');
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    html = html.replace(/\b(const|let|var|function|return|if|else|for|while|class|extends|import|export|from|default|new|this|async|await|try|catch|finally|throw|typeof|instanceof|in|of|do|switch|case|break|continue|yield|delete|void)\b/g, '<span class="token-keyword">$1</span>');
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="token-number">$1</span>');
    html = html.replace(/(['"`])([^'"`]*?)\1/g, '<span class="token-string">$1$2$1</span>');
    html = html.replace(/\b([a-zA-Z_$][\w$]*)(\s*\()/g, '<span class="token-function">$1</span>$2');
  } else if (language === 'json') {
    html = html.replace(/(&quot;[^&]*&quot;)(\s*:)/g, '<span class="token-attr">$1</span>$2');
    html = html.replace(/:\s*(&quot;[^&]*&quot;|true|false|null|[\d.]+)/g, ': <span class="token-value">$1</span>');
  }

  return html;
}

export default function CodeEditor({ value, language, onChange, onCursorChange, readOnly, remoteCursors = [] }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [, setLineCount] = useState(1);

  const lines = value.split('\n');
  const lineNumbers = lines.map((_, i) => i + 1).join('\n');

  useEffect(() => {
    setLineCount(lines.length);
  }, [lines.length]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    const lineNumbersEl = preRef.current?.parentElement?.querySelector('.line-numbers');
    if (lineNumbersEl && textareaRef.current) {
      lineNumbersEl.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const handleSelect = () => {
    if (!textareaRef.current || !onCursorChange) return;
    const ta = textareaRef.current;
    const pos = ta.selectionStart;
    const before = ta.value.substring(0, pos);
    const line = before.split('\n').length;
    const col = pos - before.lastIndexOf('\n');
    onCursorChange(line, col);
  };

  return (
    <div className="relative h-full flex bg-surface-50 dark:bg-surface overflow-hidden code-editor">
      {/* Line numbers */}
      <div className="line-numbers shrink-0 py-3 px-2 text-right text-gray-400 dark:text-surface-400 select-none overflow-hidden font-mono text-xs leading-[1.6]" style={{ minWidth: '3rem' }}>
        {lineNumbers}
      </div>

      {/* Editor area */}
      <div className="relative flex-1 overflow-hidden">
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 m-0 py-3 px-3 overflow-auto font-mono text-sm leading-[1.6] whitespace-pre pointer-events-none"
          dangerouslySetInnerHTML={{ __html: highlight(value, language) + '\n' }}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onClick={handleSelect}
          readOnly={readOnly}
          spellCheck={false}
          className="absolute inset-0 w-full h-full py-3 px-3 bg-transparent resize-none outline-none whitespace-pre overflow-auto font-mono text-sm leading-[1.6] text-transparent caret-primary-500"
          style={{ caretColor: 'rgb(99 102 241)' }}
        />

        {/* Remote cursors */}
        {remoteCursors.map((cursor, i) => {
          const lineHeight = 1.6 * 14;
          const top = (cursor.line - 1) * lineHeight + 12;
          return (
            <div
              key={i}
              className="absolute pointer-events-none transition-all duration-150"
              style={{ top: `${top}px`, left: `${cursor.col * 8 + 12}px` }}
            >
              <div className="w-0.5 h-5" style={{ backgroundColor: cursor.color }} />
              <div
                className="absolute -top-5 left-0 px-1.5 py-0.5 text-[10px] font-medium text-white rounded whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
