import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import { cn } from "@/lib/utils";

const components: Components = {
  a({ href, children }) {
    if (href?.startsWith("/")) return <Link href={href}>{children}</Link>;
    const safe = href && /^(https?:|mailto:)/.test(href) ? href : undefined;
    return (
      <a href={safe} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  img: () => null,
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h3>{children}</h3>,
};

/** Safe markdown (raw HTML is skipped) for admin-authored content. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-issa", className)}>
      <ReactMarkdown skipHtml components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
