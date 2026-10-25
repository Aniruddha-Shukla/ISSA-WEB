import { siteConfig } from "@/config/site";
import { huntFlags } from "@/content/flag-hunt";

// RFC 9116: where to report security issues. Regenerated daily so Expires stays in the future.
export const revalidate = 86400;

export function GET() {
  const expires = new Date(Date.now() + 180 * 86_400_000).toISOString();
  const body = [
    `# Security contact for the ${siteConfig.name} website.`,
    "# Found a real vulnerability? Please report it privately and don't exploit it.",
    `Contact: mailto:${siteConfig.email}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    `Canonical: ${siteConfig.url}/.well-known/security.txt`,
    "",
    `# Flag hunt: ${huntFlags.securityTxt}  (submit it at /play/flag-hunt)`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
