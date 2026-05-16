"use client";

/**
 * Tiny, dependency-free, XSS-safe markdown renderer for ReFile chat replies.
 *
 * Deliberately minimal — chat replies are short and only ever use:
 *   ```fenced code blocks```
 *   `inline code`
 *   **bold**
 *   - bullet lists
 *   paragraphs / line breaks
 *
 * We DON'T use react-markdown/remark/rehype: it's a heavy dependency tree
 * and a real XSS surface (raw HTML passthrough). Everything here renders as
 * plain React text nodes — no dangerouslySetInnerHTML anywhere — so a
 * malicious model output can never inject markup.
 */

// Split a string into [text, code, text, code, ...] by ``` fences.
function splitFences(src) {
  const parts = [];
  const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: src.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1] || "", value: m[2].replace(/\n$/, "") });
    last = m.index + m[0].length;
  }
  if (last < src.length) parts.push({ type: "text", value: src.slice(last) });
  return parts;
}

// Inline: **bold** and `code`, safely as React nodes.
function renderInline(text, keyBase) {
  const nodes = [];
  // Tokenize on `code` and **bold** (code wins to avoid styling inside it).
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      nodes.push(
        <code
          key={`${keyBase}-c${i}`}
          className="rounded bg-muted px-1.5 py-0.5 text-mono text-[12.5px]"
        >
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// A non-code text block → paragraphs + bullet lists.
function renderTextBlock(text, keyBase) {
  const lines = text.split("\n");
  const out = [];
  let list = [];
  let p = [];

  const flushP = () => {
    if (!p.length) return;
    const joined = p.join("\n").trim();
    if (joined)
      out.push(
        <p key={`${keyBase}-p${out.length}`} className="whitespace-pre-wrap">
          {renderInline(joined, `${keyBase}-p${out.length}`)}
        </p>
      );
    p = [];
  };
  const flushList = () => {
    if (!list.length) return;
    out.push(
      <ul
        key={`${keyBase}-ul${out.length}`}
        className="ml-1 list-disc space-y-1 pl-4"
      >
        {list.map((li, idx) => (
          <li key={idx}>{renderInline(li, `${keyBase}-li${idx}`)}</li>
        ))}
      </ul>
    );
    list = [];
  };

  for (const raw of lines) {
    const bullet = raw.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushP();
      list.push(bullet[1]);
    } else {
      flushList();
      p.push(raw);
    }
  }
  flushP();
  flushList();
  return out;
}

export function ChatMarkdown({ children }) {
  const src = typeof children === "string" ? children : "";
  if (!src.trim()) return null;
  const parts = splitFences(src);

  return (
    <div className="space-y-2.5 text-[14px] leading-relaxed text-foreground">
      {parts.map((part, i) =>
        part.type === "code" ? (
          <pre
            key={i}
            className="overflow-x-auto rounded-lg border border-border bg-muted/60 p-3 text-mono text-[12.5px] leading-relaxed"
          >
            <code>{part.value}</code>
          </pre>
        ) : (
          <div key={i}>{renderTextBlock(part.value, `t${i}`)}</div>
        )
      )}
    </div>
  );
}
