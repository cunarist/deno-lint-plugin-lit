export class ElementA extends HTMLElement {}
declare global {
  interface HTMLElementTagNameMap {
    "cl-a": ElementA;
  }
}
