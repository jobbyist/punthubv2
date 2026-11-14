import { describe, expect, it } from "vitest";

import { sanitizeBlueprintHtml } from "./dev-sanitize";

describe("sanitizeBlueprintHtml", () => {
  it("keeps the markup the blueprint's copy buttons need", () => {
    const html =
      '<div class="pcard"><h3>Prompt</h3><pre id="p1">text</pre><button class="copy" data-target="p1">Copy</button></div>';
    expect(sanitizeBlueprintHtml(html)).toBe(html);
  });

  it("removes script elements with their content", () => {
    expect(sanitizeBlueprintHtml("<p>a</p><script>alert(1)</script><p>b</p>")).toBe(
      "<p>a</p><p>b</p>",
    );
    expect(sanitizeBlueprintHtml("<SCRIPT src=x></SCRIPT>ok")).toBe("ok");
    expect(sanitizeBlueprintHtml("<script>unterminated")).not.toContain("alert");
  });

  it("removes inline event handlers in every quoting style", () => {
    const out = sanitizeBlueprintHtml(
      `<img src="a.png" onerror="alert(1)"><b onclick='x()'>t</b><i onmouseover=x()>u</i>`,
    );
    expect(out).not.toMatch(/on[a-z]+\s*=/i);
    expect(out).toContain('src="a.png"');
  });

  it("removes javascript: and data:text/html URLs", () => {
    const out = sanitizeBlueprintHtml(
      `<a href="javascript:alert(1)">x</a><a href='JavaScript:void(0)'>y</a><iframe src="data:text/html,hi"></iframe><a href="https://puntr.co.za">ok</a>`,
    );
    expect(out.toLowerCase()).not.toContain("javascript:");
    expect(out.toLowerCase()).not.toContain("iframe");
    expect(out).toContain('href="https://puntr.co.za"');
  });

  it("removes embeds, forms, srcdoc and base tags", () => {
    const out = sanitizeBlueprintHtml(
      `<object data=x></object><embed src=x><form action=x><input></form><base href="//evil"><div srcdoc="<b>">z</div>`,
    );
    expect(out).not.toMatch(/<(object|embed|form|base)/i);
    expect(out).not.toContain("srcdoc");
  });
});
