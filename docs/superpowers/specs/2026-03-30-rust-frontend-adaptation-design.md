# Rust Frontend Adaptation Design

## Goal

Adapt `jmal-cloud-view` to the Rust core backend with the smallest practical frontend change set while keeping the core user flows smooth:

- login and first-time initialization
- file browsing and preview
- upload and file mutations
- sharing and public share access
- search
- recycle bin
- basic user settings and admin user management

This frontend will be Rust-only. It does not need to remain compatible with the legacy Java backend.

## Constraints

- Prefer concentrated changes in request/config/navigation layers over broad page rewrites.
- Remove or hide frontend entry points for backend features that were intentionally removed from the Rust core:
  - OCR
  - Office collaboration and document server integration
  - video transcode/HLS
  - object storage
  - article/markdown system
  - role/group/menu management
- Replace backend-driven menu and website-branding dependencies with static frontend configuration.
- Preserve existing core page components wherever possible.

## Chosen Approach

Use a thin Rust compatibility layer inside the frontend:

1. Static runtime config replaces branding and feature capabilities previously fetched from backend settings endpoints.
2. Static frontend menu replaces backend-driven `menu/tree`.
3. Existing API modules stay in place, but only the Rust-core-critical calls are remapped or simplified.
4. Unsupported feature entry points are hidden before the user can trigger failing requests.

This approach is preferred over a large frontend cleanup because it minimizes regression risk and keeps the diff concentrated in a small number of files.

## Scope

### In Scope

- login page
- admin initialization flow
- file list and file tree navigation
- text preview and standard file preview paths that still exist in Rust core
- upload, merge, rename, move, copy, delete, restore, clear trash
- share creation, share list, public share access, package download
- search and search history
- WebDAV URL display
- basic user info and admin user CRUD
- static branding config
- static menu config

### Out of Scope

- office preview/editor integration
- OCR UI and settings
- video/HLS playback paths that depend on transcode
- object storage settings and upload variants
- article and markdown editing/publishing flows
- menu, role, and group management UIs
- burn note, favorite, tag, recently-used, and other secondary modules that depend on removed backend capability or create extra adaptation surface

## Design

### 1. Static Runtime Config

Add a frontend-owned config module that provides:

- `baseApi`
- `brandName`
- `brandLogo`
- feature flags such as `search`, `shares`, `webdav`, `userAdmin`

This config becomes the only source for login-page branding and capability visibility. It replaces the need to call:

- `/public/website/record`
- `/website/setting`
- other backend branding/setting endpoints that no longer exist in Rust core

The initial design uses build-time or environment-backed values rather than a new backend endpoint.

### 2. Static Navigation

Replace backend menu loading with a local Rust-core menu definition.

The static menu contains only:

- all files
- upload
- share
- trash
- settings
- user management for admin users

Routes for removed modules remain in the codebase initially only if they are required to avoid large import churn, but they will not appear in navigation and should not be reachable through normal user flow.

### 3. API Compatibility Layer

Keep `src/api/*.js` structure intact, but remap only the core routes needed by retained pages.

Examples:

- login and initialization continue using current auth module with Rust-compatible payloads
- search requests map to Rust search routes
- recycle-bin clearing maps to Rust `clear-trash`
- removed APIs are not generally handled by request-time fallback; their page/button entry points are removed instead

Where the Rust backend already provides a compatibility route, the frontend should continue using the existing path. Where the frontend currently depends on a legacy-only route, adapt the corresponding API method rather than rewriting all callers.

### 4. Component and Page-Level Hiding

Core pages should keep their existing layout and behavior where possible, but UI affordances tied to removed backend modules must be hidden:

- article creation buttons
- office preview/editor branches
- OCR configuration links
- transcode/video-management actions
- favorite/tag/recently-specific actions if they depend on missing backend support

This is intentionally done at the entry-point level so users do not encounter `501` paths during normal usage.

### 5. Login and Initialization

The login page should stop depending on backend website-record data for:

- title/logo
- footer brand data
- login background metadata

Instead, it should read static branding config and keep only the retained flows:

- `has_user`
- `initialization`
- `login`

If backend branding is absent, the page should not enter a degraded loading state; it should render immediately with configured defaults.

### 6. User State and Menu Bootstrap

`store/modules/user.js` currently mixes login bootstrap with backend menu loading.

For the Rust-only frontend:

- login still stores token, username, userId, and user info
- menu bootstrap should build from static frontend config
- dynamic route injection should consume the static route list rather than backend-returned menu JSON

This keeps the existing Vuex and router architecture, but removes the dependency on Rust implementing the old menu system.

## Key File Targets

Expected primary touch points:

- `src/utils/request.js`
- `src/utils/file-config.js`
- `src/api/user.js`
- `src/api/file-api.js`
- `src/api/menu.js` or its callers
- `src/api/setting-api.js` or its callers
- `src/store/modules/user.js`
- `src/router/index.js`
- `src/views/login/index.vue`
- `src/layout/components/Sidebar/index.vue`
- a small number of preview and file-action components

The design intentionally avoids broad edits across all views.

## Error Handling

- Missing removed capability should be prevented by hidden UI, not left to backend `501` handling during normal interaction.
- Static config should provide defaults so login and shell layout can always render.
- Request-layer adaptation should preserve existing global token and message behavior in `request.js`.
- Rust-core errors on retained flows should continue through the existing global error handling path.

## Verification Strategy

Minimum validation scenarios after implementation:

1. First boot: no users, initialization creates admin successfully.
2. Login: token, user info, and initial navigation work.
3. File list: load root, navigate folders, fetch file info, preview text.
4. File mutations: upload, rename, move, copy, delete, restore, clear trash.
5. Search: query and recent-search history.
6. Share: create share, open public share, download package.
7. User admin: list users, add/update/reset/delete user.
8. Shell UX: sidebar renders from static menu, removed entries are absent.

## Risks and Mitigations

- Risk: hidden legacy entry points still remain in deep components.
  - Mitigation: search by removed module keywords and remove access paths from visible core flows.
- Risk: frontend assumes richer user/menu payloads than Rust provides.
  - Mitigation: normalize user bootstrap state in Vuex rather than duplicating shape fixes across views.
- Risk: file preview code still branches into office/video/article logic.
  - Mitigation: gate preview branches through explicit feature checks and suffix filters for Rust-supported preview only.

## Implementation Notes

- Do not attempt to keep one frontend compatible with both backends.
- Do not perform a sweeping module deletion in the first pass.
- Prefer local compatibility shims and static config over large-scale component rewrites.
