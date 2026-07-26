import "./element-a.ts";
import "./element-b.ts";

const html = (strings: TemplateStringsArray): TemplateStringsArray => strings;
export const view = html`
  <cl-a></cl-a>
  <cl-b></cl-b>
`;
