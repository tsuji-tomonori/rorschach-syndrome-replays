import fs from "node:fs";
import path from "node:path";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function loadWorkMarkdown(root, work) {
  let markdown = fs.readFileSync(path.join(root, "content", work.file), "utf8");
  const chapterDirectory = path.join(root, "content", "chapters", work.slug);
  if (!fs.existsSync(chapterDirectory)) return markdown;

  const files = fs.readdirSync(chapterDirectory)
    .filter((file) => file.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right, "ja"));
  for (const file of files) {
    const overlay = fs.readFileSync(path.join(chapterDirectory, file), "utf8").trim();
    const title = overlay.match(/^## (.+)$/mu)?.[1];
    if (!title) throw new Error(path.join("content", "chapters", work.slug, file) + ": chapter heading missing");
    const heading = new RegExp("^## " + escapeRegExp(title) + "$", "mu").exec(markdown);
    if (!heading) throw new Error(work.slug + ": overlay has no base chapter named " + title);
    const afterHeading = heading.index + heading[0].length;
    const remainder = markdown.slice(afterHeading);
    const nextChapter = /^## .+$/mu.exec(remainder)?.index;
    const audit = remainder.indexOf("\n---\n\n### 照合記録");
    const candidates = [nextChapter, audit].filter((index) => Number.isInteger(index) && index >= 0);
    const end = candidates.length ? afterHeading + Math.min(...candidates) : markdown.length;
    markdown = markdown.slice(0, heading.index) + overlay + "\n\n" + markdown.slice(end).replace(/^\n+/u, "");
  }
  return markdown.trimEnd() + "\n";
}
