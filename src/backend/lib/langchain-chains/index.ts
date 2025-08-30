export { runDesignScheme } from './run-design-scheme.js';
export { runDetailedLayout } from './run-detailed-layout.js';
export { runImageGenerate } from './run-image-generate.js';
export { runImagePrompts } from './run-image-prompts.js';
export {
  type RefinementOptions,
  type RefinementResult,
  runRefine,
} from './run-refine.js';
export { runRender } from './run-render.js';

// Chain Function Registry
import { runDesignScheme } from './run-design-scheme.js';
import { runDetailedLayout } from './run-detailed-layout.js';
import { runImageGenerate } from './run-image-generate.js';
import { runImagePrompts } from './run-image-prompts.js';
import { runRefine } from './run-refine.js';
import { runRender } from './run-render.js';

export const chains = {
  'design-scheme': runDesignScheme,
  'image-prompts': runImagePrompts,
  'image-generate': runImageGenerate,
  'detailed-layout': runDetailedLayout,
  render: runRender,
  refine: runRefine,
} as const;

export type ChainFunction = (typeof chains)[keyof typeof chains];
