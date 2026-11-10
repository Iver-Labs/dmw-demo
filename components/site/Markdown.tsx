import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders content/kb Markdown. No raw HTML; every link opens the real site in a new tab. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-kb">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
