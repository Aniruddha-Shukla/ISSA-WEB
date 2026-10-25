/**
 * The website flag hunt. Each flag is hidden somewhere any visitor can reach (page
 * source, console, robots.txt, response headers, security.txt), so they necessarily
 * live in the code. The database only stores their hashes (supabase/play-starter.sql);
 * if you change a flag here, change the matching challenge's flag in the admin dashboard.
 */
export const huntFlags = {
  source: "ISSA{v13w_s0urc3_s33s_4ll}",
  console: "ISSA{c0ns0l3_wh1sp3rs}",
  robots: "ISSA{r0b0ts_txt_t3lls_s3cr3ts}",
  headers: "ISSA{h34d3rs_sp34k_l0ud}",
  securityTxt: "ISSA{r3sp0ns1bl3_d1scl0sur3}",
} as const;

/** Listed under Disallow in robots.txt. */
export const vaultPath = "/vault";

export const rot13 = (text: string) =>
  text.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
