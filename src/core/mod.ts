/**
 * `lit-core` — rules for Lit code that does not do what it looks like it
 * does.
 *
 * @module
 */

import "@cunarist/typescript-deno-lint/types";

import { attributeValueEntities } from "./attribute-value-entities.ts";
import { bindingPositions } from "./binding-positions.ts";
import { composedRequiresBubbles } from "./composed-requires-bubbles.ts";
import { lifecycleSuper } from "./lifecycle-super.ts";
import { noArrayMutationWithoutReassign } from "./no-array-mutation-without-reassign.ts";
import { noAsyncLifecycle } from "./no-async-lifecycle.ts";
import { noAsyncRender } from "./no-async-render.ts";
import { noAttributePropertyBindingConflict } from "./no-attribute-property-binding-conflict.ts";
import { noClassfieldShadowing } from "./no-classfield-shadowing.ts";
import { noContextMutationByConsumer } from "./no-context-mutation-by-consumer.ts";
import { noDispatchInRender } from "./no-dispatch-in-render.ts";
import { noDuplicateContextProvider } from "./no-duplicate-context-provider.ts";
import { noDuplicatePropertyDeclaration } from "./no-duplicate-property-declaration.ts";
import { noDuplicateSlotNames } from "./no-duplicate-slot-names.ts";
import { noDuplicateTagRegistration } from "./no-duplicate-tag-registration.ts";
import { noDuplicateTemplateBindings } from "./no-duplicate-template-bindings.ts";
import { noIndexAsRepeatKey } from "./no-index-as-repeat-key.ts";
import { noInlineEventAttribute } from "./no-inline-event-attribute.ts";
import { noInnerHtmlAssignment } from "./no-inner-html-assignment.ts";
import { noInvalidEscapeSequences } from "./no-invalid-escape-sequences.ts";
import { noInvalidHtml } from "./no-invalid-html.ts";
import { noJsxAttributeNames } from "./no-jsx-attribute-names.ts";
import { noLegacyImports } from "./no-legacy-imports.ts";
import { noLegacyTemplateSyntax } from "./no-legacy-template-syntax.ts";
import { noMultipleDefaultSlots } from "./no-multiple-default-slots.ts";
import { noNativeAttributes } from "./no-native-attributes.ts";
import { noPartialPropertyBinding } from "./no-partial-property-binding.ts";
import { noPrivateProperties } from "./no-private-properties.ts";
import { noPropertyChangeInUpdated } from "./no-property-change-in-updated.ts";
import { noPropertyChangeUpdate } from "./no-property-change-update.ts";
import { noPropertyNamedLikeLifecycle } from "./no-property-named-like-lifecycle.ts";
import { noRequestUpdateInUpdated } from "./no-request-update-in-updated.ts";
import { noScriptInTemplate } from "./no-script-in-template.ts";
import { noSelfClosingNonVoid } from "./no-self-closing-non-void.ts";
import { noThisAssignInRender } from "./no-this-assign-in-render.ts";
import { noThisInStaticStyles } from "./no-this-in-static-styles.ts";
import { noUnsafeCss } from "./no-unsafe-css.ts";
import { noUnsafeHtml } from "./no-unsafe-html.ts";
import { noUselessTemplateLiterals } from "./no-useless-template-literals.ts";
import { noValueAttribute } from "./no-value-attribute.ts";
import { preferStaticStyles } from "./prefer-static-styles.ts";
import { requireAccessorWithDecorators } from "./require-accessor-with-decorators.ts";
import { requireContextType } from "./require-context-type.ts";
import { requireDashedTag } from "./require-dashed-tag.ts";
import { requireDirectRegistrationImport } from "./require-direct-registration-import.ts";
import { requireDispatchOnThis } from "./require-dispatch-on-this.ts";
import { requirePropertyType } from "./require-property-type.ts";
import { requireRepeatKey } from "./require-repeat-key.ts";
import { requireScalarReflect } from "./require-scalar-reflect.ts";
import { simpleTemplateExpressions } from "./simple-template-expressions.ts";
import { svgTemplateForSvgContent } from "./svg-template-for-svg-content.ts";
import { valueAfterConstraints } from "./value-after-constraints.ts";

/** The `lit-core` rules, for composing your own plugin. */
export const coreRules: Record<string, Deno.lint.Rule> = {
  "attribute-value-entities": attributeValueEntities,
  "binding-positions": bindingPositions,
  "composed-requires-bubbles": composedRequiresBubbles,
  "lifecycle-super": lifecycleSuper,
  "no-array-mutation-without-reassign": noArrayMutationWithoutReassign,
  "no-async-lifecycle": noAsyncLifecycle,
  "no-async-render": noAsyncRender,
  "no-attribute-property-binding-conflict": noAttributePropertyBindingConflict,
  "no-classfield-shadowing": noClassfieldShadowing,
  "no-context-mutation-by-consumer": noContextMutationByConsumer,
  "no-dispatch-in-render": noDispatchInRender,
  "no-duplicate-context-provider": noDuplicateContextProvider,
  "no-duplicate-property-declaration": noDuplicatePropertyDeclaration,
  "no-duplicate-slot-names": noDuplicateSlotNames,
  "no-duplicate-tag-registration": noDuplicateTagRegistration,
  "no-duplicate-template-bindings": noDuplicateTemplateBindings,
  "no-index-as-repeat-key": noIndexAsRepeatKey,
  "no-inline-event-attribute": noInlineEventAttribute,
  "no-inner-html-assignment": noInnerHtmlAssignment,
  "no-invalid-escape-sequences": noInvalidEscapeSequences,
  "no-invalid-html": noInvalidHtml,
  "no-jsx-attribute-names": noJsxAttributeNames,
  "no-legacy-imports": noLegacyImports,
  "no-legacy-template-syntax": noLegacyTemplateSyntax,
  "no-multiple-default-slots": noMultipleDefaultSlots,
  "no-native-attributes": noNativeAttributes,
  "no-partial-property-binding": noPartialPropertyBinding,
  "no-private-properties": noPrivateProperties,
  "no-property-change-in-updated": noPropertyChangeInUpdated,
  "no-property-change-update": noPropertyChangeUpdate,
  "no-property-named-like-lifecycle": noPropertyNamedLikeLifecycle,
  "no-request-update-in-updated": noRequestUpdateInUpdated,
  "no-script-in-template": noScriptInTemplate,
  "no-self-closing-non-void": noSelfClosingNonVoid,
  "no-this-assign-in-render": noThisAssignInRender,
  "no-this-in-static-styles": noThisInStaticStyles,
  "no-unsafe-css": noUnsafeCss,
  "no-unsafe-html": noUnsafeHtml,
  "no-useless-template-literals": noUselessTemplateLiterals,
  "no-value-attribute": noValueAttribute,
  "prefer-static-styles": preferStaticStyles,
  "require-accessor-with-decorators": requireAccessorWithDecorators,
  "require-context-type": requireContextType,
  "require-dashed-tag": requireDashedTag,
  "require-direct-registration-import": requireDirectRegistrationImport,
  "require-dispatch-on-this": requireDispatchOnThis,
  "require-property-type": requirePropertyType,
  "require-repeat-key": requireRepeatKey,
  "require-scalar-reflect": requireScalarReflect,
  "simple-template-expressions": simpleTemplateExpressions,
  "svg-template-for-svg-content": svgTemplateForSvgContent,
  "value-after-constraints": valueAfterConstraints,
};

/**
 * The `lit-core` plugin: every rule in this module, ready for `deno.json`.
 */
const plugin: Deno.lint.Plugin = {
  name: "lit-core",
  rules: coreRules,
};

// Individual rules, re-exported for composition.
export { attributeValueEntities } from "./attribute-value-entities.ts";
export { bindingPositions } from "./binding-positions.ts";
export { composedRequiresBubbles } from "./composed-requires-bubbles.ts";
export { lifecycleSuper } from "./lifecycle-super.ts";
export { noArrayMutationWithoutReassign } from "./no-array-mutation-without-reassign.ts";
export { noAsyncLifecycle } from "./no-async-lifecycle.ts";
export { noAsyncRender } from "./no-async-render.ts";
export { noAttributePropertyBindingConflict } from "./no-attribute-property-binding-conflict.ts";
export { noClassfieldShadowing } from "./no-classfield-shadowing.ts";
export { noContextMutationByConsumer } from "./no-context-mutation-by-consumer.ts";
export { noDispatchInRender } from "./no-dispatch-in-render.ts";
export { noDuplicateContextProvider } from "./no-duplicate-context-provider.ts";
export { noDuplicatePropertyDeclaration } from "./no-duplicate-property-declaration.ts";
export { noDuplicateSlotNames } from "./no-duplicate-slot-names.ts";
export { noDuplicateTagRegistration } from "./no-duplicate-tag-registration.ts";
export { noDuplicateTemplateBindings } from "./no-duplicate-template-bindings.ts";
export { noIndexAsRepeatKey } from "./no-index-as-repeat-key.ts";
export { noInlineEventAttribute } from "./no-inline-event-attribute.ts";
export { noInnerHtmlAssignment } from "./no-inner-html-assignment.ts";
export { noInvalidEscapeSequences } from "./no-invalid-escape-sequences.ts";
export { noInvalidHtml } from "./no-invalid-html.ts";
export { noJsxAttributeNames } from "./no-jsx-attribute-names.ts";
export { noLegacyImports } from "./no-legacy-imports.ts";
export { noLegacyTemplateSyntax } from "./no-legacy-template-syntax.ts";
export { noMultipleDefaultSlots } from "./no-multiple-default-slots.ts";
export { noNativeAttributes } from "./no-native-attributes.ts";
export { noPartialPropertyBinding } from "./no-partial-property-binding.ts";
export { noPrivateProperties } from "./no-private-properties.ts";
export { noPropertyChangeInUpdated } from "./no-property-change-in-updated.ts";
export { noPropertyChangeUpdate } from "./no-property-change-update.ts";
export { noPropertyNamedLikeLifecycle } from "./no-property-named-like-lifecycle.ts";
export { noRequestUpdateInUpdated } from "./no-request-update-in-updated.ts";
export { noScriptInTemplate } from "./no-script-in-template.ts";
export { noSelfClosingNonVoid } from "./no-self-closing-non-void.ts";
export { noThisAssignInRender } from "./no-this-assign-in-render.ts";
export { noThisInStaticStyles } from "./no-this-in-static-styles.ts";
export { noUnsafeCss } from "./no-unsafe-css.ts";
export { noUnsafeHtml } from "./no-unsafe-html.ts";
export { noUselessTemplateLiterals } from "./no-useless-template-literals.ts";
export { noValueAttribute } from "./no-value-attribute.ts";
export { preferStaticStyles } from "./prefer-static-styles.ts";
export { requireAccessorWithDecorators } from "./require-accessor-with-decorators.ts";
export { requireContextType } from "./require-context-type.ts";
export { requireDashedTag } from "./require-dashed-tag.ts";
export { requireDirectRegistrationImport } from "./require-direct-registration-import.ts";
export { requireDispatchOnThis } from "./require-dispatch-on-this.ts";
export { requirePropertyType } from "./require-property-type.ts";
export { requireRepeatKey } from "./require-repeat-key.ts";
export { requireScalarReflect } from "./require-scalar-reflect.ts";
export { simpleTemplateExpressions } from "./simple-template-expressions.ts";
export { svgTemplateForSvgContent } from "./svg-template-for-svg-content.ts";
export { valueAfterConstraints } from "./value-after-constraints.ts";

export default plugin;
