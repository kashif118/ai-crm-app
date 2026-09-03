import { Fragment } from "react";

/**
 * A deliberately small Markdown subset renderer — headings are not needed in a
 * chat bubble, but bold, bullets and numbered lists are.
 *
 * It builds React elements rather than HTML strings: model output is never
 * passed through `dangerouslySetInnerHTML`, so a response containing markup
 * cannot inject anything into the page.
 */
export function MarkdownLite({ text }: { text: string }) {
  const blocks = groupIntoBlocks(text.trim().split("\n"));

  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed">
      {blocks.map((block, index) => {
        if (block.type === "rule") {
          return <hr key={index} className="border-line" />;
        }
        if (block.type === "ul") {
          return (
            <ul key={index} className="ml-4 list-disc space-y-1 marker:text-ink-muted">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={index} className="ml-4 list-decimal space-y-1 marker:text-ink-muted">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline text={item} />
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            <Inline text={block.items.join("\n")} />
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { type: "p" | "ul" | "ol"; items: string[] }
  | { type: "rule"; items: never[] };

function groupIntoBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;

  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) {
      flush();
      blocks.push({ type: "rule", items: [] });
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (bullet) {
      if (current?.type !== "ul") {
        flush();
        current = { type: "ul", items: [] };
      }
      current.items.push(bullet[1]);
      continue;
    }
    if (numbered) {
      if (current?.type !== "ol") {
        flush();
        current = { type: "ol", items: [] };
      }
      current.items.push(numbered[1]);
      continue;
    }

    // A continuation line inside a list belongs to the last item.
    if ((current?.type === "ul" || current?.type === "ol") && /^\s{2,}\S/.test(raw)) {
      current.items[current.items.length - 1] += ` ${line.trim()}`;
      continue;
    }

    if (current?.type !== "p") {
      flush();
      current = { type: "p", items: [] };
    }
    current.items.push(line);
  }

  flush();
  return blocks;
}

/** Handles **bold**, *italic* and `code` inside a line. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold text-ink">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              className="rounded bg-sunken px-1 py-0.5 font-mono text-[12px] text-ink"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}
