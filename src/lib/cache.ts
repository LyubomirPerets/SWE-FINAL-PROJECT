// Read-through cache helpers on top of src/lib/valkey.ts.
// Postgres stays the source of truth; everything here must be safe to wipe.

// TODO: getOrSet(key, ttlSeconds, loader): return cached JSON, else call loader, store, return
// TODO: invalidate(key) / invalidatePrefix(prefix) for writes that change cached data
// TODO: key naming convention, e.g. crm:<entity>:<id> (crm:customer:42:context)
// TODO: default TTLs per entity; keep them short (minutes) to limit stale reads
// TODO: fail open: if Valkey is down, log and fall through to the loader instead of erroring
// TODO: first candidate: customer context (contact + recent jobs) for the customer detail page
// TODO: call invalidate() from customers.service.ts update/delete once caching is wired in
