import { z } from 'zod';
import { MAX_ROOM_TITLE_LENGTH } from './constants';
import { isValidRoomSlug } from '@/lib/rooms/identifiers';
import { isSupportedLanguageId } from '@/lib/languages';

export const CreateRoomSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_ROOM_TITLE_LENGTH, `Title cannot exceed ${MAX_ROOM_TITLE_LENGTH} characters`).default('Untitled Room'),
  language: z.string().trim().min(1).max(30).refine(isSupportedLanguageId, 'Unsupported language').default('typescript'),
  visibility: z.enum(['public', 'unlisted', 'private']).default('unlisted'),
  defaultAccessMode: z.enum(['editor', 'viewer']).default('editor'),
  customSlug: z.string().trim().max(40).optional().refine(
    (slug) => !slug || isValidRoomSlug(slug),
    'Room link can only contain letters, numbers, hyphens, and underscores'
  ),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;

export const UpdateRoomSchema = z.object({
  title: z.string().trim().min(1).max(MAX_ROOM_TITLE_LENGTH).optional(),
  visibility: z.enum(['public', 'unlisted', 'private']).optional(),
  defaultAccessMode: z.enum(['editor', 'viewer']).optional(),
  isClosed: z.boolean().optional(),
}).refine((update) => Object.keys(update).length > 0, 'At least one room field must be provided');

export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;

export const PersistSnapshotSchema = z.object({
  content: z.string().max(1024 * 1024, 'Document exceeds maximum size of 1MB'),
  language: z.string().trim().max(30).optional().refine(
    (language) => language === undefined || isSupportedLanguageId(language),
    'Unsupported language'
  ),
  yjsState: z.string().optional(), // base64 encoded
  revision: z.number().int().nonnegative(),
});

export type PersistSnapshotInput = z.infer<typeof PersistSnapshotSchema>;
