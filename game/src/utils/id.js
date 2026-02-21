/**
 * Shared ID generator — consistent, collision-resistant IDs.
 * Uses monotonic counter + timestamp for uniqueness.
 */
let counter = 0;

export function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${(counter++).toString(36)}`;
}
