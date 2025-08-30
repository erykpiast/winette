import { z } from 'zod';

export type Edit =
  | { op: 'move'; id: string; dx: number; dy: number }
  | { op: 'resize'; id: string; dw: number; dh: number }
  | {
      op: 'recolor';
      id: string;
      color: 'primary' | 'secondary' | 'accent' | 'background';
    }
  | { op: 'reorder'; id: string; z: number }
  | { op: 'update_font_size'; id: string; fontSize: number };

export const EditSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('move'),
    id: z.string().min(1),
    dx: z.number(),
    dy: z.number(),
  }),
  z.object({
    op: z.literal('resize'),
    id: z.string().min(1),
    dw: z.number(),
    dh: z.number(),
  }),
  z.object({
    op: z.literal('recolor'),
    id: z.string().min(1),
    color: z.enum(['primary', 'secondary', 'accent', 'background']),
  }),
  z.object({
    op: z.literal('reorder'),
    id: z.string().min(1),
    z: z.number().int(),
  }),
  z.object({
    op: z.literal('update_font_size'),
    id: z.string().min(1),
    fontSize: z.number().int().positive(),
  }),
]);

export const EditsArraySchema = z.array(EditSchema).max(10);

export interface EditValidationOptions {
  maxEdits: number;
  maxDelta: number;
  existingElementIds: string[];
}

export interface EditValidationResult {
  validEdits: Edit[];
  rejectedEdits: Array<{
    edit: unknown;
    reason: string;
  }>;
  clampedEdits: Array<{
    original: Edit;
    clamped: Edit;
    reason: string;
  }>;
}
