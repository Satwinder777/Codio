import { z } from 'zod';

export const CreateRoomSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters').default('Untitled Room'),
  language: z.string().min(1).max(30).default('typescript'),
  visibility: z.enum(['public', 'unlisted', 'private']).default('unlisted'),
  defaultAccessMode: z.enum(['editor', 'viewer']).default('editor'),
  customSlug: z.string().max(40).optional(),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;

export const UpdateRoomSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  visibility: z.enum(['public', 'unlisted', 'private']).optional(),
  defaultAccessMode: z.enum(['editor', 'viewer']).optional(),
  isClosed: z.boolean().optional(),
});

export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;

export const PersistSnapshotSchema = z.object({
  content: z.string().max(1024 * 1024, 'Document exceeds maximum size of 1MB'),
  language: z.string().max(30).optional(),
  yjsState: z.string().optional(), // base64 encoded
  revision: z.number().int().nonnegative(),
});

export type PersistSnapshotInput = z.infer<typeof PersistSnapshotSchema>;
