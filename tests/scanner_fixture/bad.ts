import "./element-a.ts";

const html = (strings: TemplateStringsArray): TemplateStringsArray => strings;
export const view = html`
  <cl-a></cl-a>
  <cl-b></cl-b>
`;
