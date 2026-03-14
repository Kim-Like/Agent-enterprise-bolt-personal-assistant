# Personal Assistant Styling Guidelines

These rules exist so the Personal Assistant suite feels like it belongs inside Agent Enterprise, not like a separate template pack.

## Design Direction

Use the existing Agent Enterprise dashboard language:

- dark shell framing
- light or frosted content cards
- strong, editorial typography
- clean metric cards
- purposeful gradients, not flat screens
- compact but high-signal layouts

## Typography

Use:

- `Plus Jakarta Sans` for UI
- `JetBrains Mono` for stats, metadata, code-ish labels, timestamps, IDs

Do not introduce a new primary font family for this program.

## Color System

Personal Assistant should inherit its theme from the existing project catalog entry:

- accent: `#0F766E`
- shell: `#134E4A`
- surface: `#F0FDFA`

Recommended neutrals:

- text: `#0f172a`
- muted text: `#64748b`
- border: `#dbe4e8`
- canvas: `#f8fafc`

Support tones:

- success: `#16a34a`
- warning: `#d97706`
- danger: `#dc2626`
- info: `#2563eb`

## Layout Rules

- prefer dashboard and workspace layouts over marketing-page layouts
- use 20px to 24px radius on major cards
- keep borders subtle and visible
- use spacing generously; avoid cramped admin grids
- mobile must still work, but desktop operator usage is the primary mode

## Shell Rules

- reuse current Agent Enterprise nav/shell patterns where possible
- if a dedicated PA shell is introduced, it should still look like a sibling of `/`, `/agents`, and `/workboard`
- do not build a visually unrelated module UI

## Components

Preferred component vocabulary:

- stat cards
- grouped section panels
- timeline blocks
- pills and status badges
- split-pane layouts for dense operational screens
- tables only where scanning density matters

Avoid:

- generic Tailwind-looking admin scaffolds
- purple gradients
- bootstrap-style grey UI
- oversized empty whitespace without information density

## CSS Rules

- no mandatory new CSS framework
- scoped CSS or shared stylesheet additions are preferred
- reuse existing dashboard patterns before inventing a new system

## Module-Specific Guidance

### Overview

- should feel like a daily command center
- lead with summary, alerts, and next actions

### Task + Calendar

- task/calendar views must feel coordinated
- scheduling pressure and today/tomorrow context matter more than decorative visuals

### Email

- dense operational layout
- folder/list/reading pane mental model is acceptable
- do not mimic a full SaaS mail client if the backing capability is not there yet

### Social

- emphasize workflow stages, content readiness, and scheduling clarity

### Fitness

- prioritize trends, goals, and recent performance over gimmicky visualizations
