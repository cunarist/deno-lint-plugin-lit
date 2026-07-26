export class ElementB extends HTMLElement {}
declare global {
  interface HTMLElementTagNameMap {
    "cl-b": ElementB;
  }
}
