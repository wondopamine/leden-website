# Local Markdown Wayfinder Tracker

GitHub is the intended shared tracker for this repository, but the configured
`gh` credential was invalid when this map was charted. Until the map is migrated,
this directory is the tracker of record.

## Wayfinding operations

- Maps live in `maps/` and carry `label: wayfinder:map`.
- Tickets live in `tickets/` and identify their parent with `parent:`.
- The local tracker has no native dependency graph, so `blocked_by:` is the
  documented fallback for blocking relationships.
- The frontier is every open, unassigned ticket whose `blocked_by` list is empty
  or contains only closed tickets.
- Claim a ticket by setting `assignee:` before starting work.
- Resolve a ticket by adding a `## Resolution comment`, setting `status: closed`,
  and appending one linked gist to the parent map's `Decisions so far` section.
- Open tickets are discovered by their front matter and are deliberately not
  duplicated in a map body.
