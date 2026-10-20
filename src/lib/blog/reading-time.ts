/** Reading time in whole minutes: prose at 225 words a minute, code at 100 (it is read slowly). Minimum 1. */
export function readingTime(markdown: string): number {
  let code = 0;
  const prose = markdown.replace(/```[\s\S]*?```/g, (block) => {
    code += (block.replace(/^```.*$/gm, "").match(/[^\s]+/g) || []).length;
    return " ";
  });
  const words = (prose.replace(/[#>*_`~\[\]()!|-]/g, " ").match(/[^\s]+/g) || []).length;
  return Math.max(1, Math.ceil(words / 225 + code / 100));
}
