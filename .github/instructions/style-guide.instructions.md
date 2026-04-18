---
description: "Required visual design and brand style rules for all frontend HTML, CSS, and UI work"
applyTo: "src/**"
---

# Visual Style Guide

All frontend UI in this project follows a consistent visual identity. Apply these rules when creating or modifying HTML, CSS, or any user-facing component.

## Primary Color — Nintendo Red

| Property | Value |
|----------|-------|
| Hex | `#E60012` |
| RGB | `rgb(230, 0, 18)` |
| Hover | `#cc0010` |
| Light bg | `#fef2f2` |

Use Nintendo Red for primary buttons, interactive states, critical affordances, navigation highlights, and brand accents.

## Typography

| Property | Value |
|----------|-------|
| Font | Inter (Google Fonts) |
| Weights | 400, 500, 600, 700 |

Do not introduce additional typefaces. Use Inter for all UI text.

## Color Palette

| Role | Value |
|------|-------|
| Primary | `#E60012` (Nintendo Red) |
| Primary hover | `#cc0010` |
| Primary light bg | `#fef2f2` |
| Text primary | `#1f2937` |
| Text secondary | `#6b7280` |
| Background | `#f9fafb` to `#f3f4f6` gradient |
| Card background | `#ffffff` |
| Border | `#e5e7eb` |
| Success | `#16a34a` |

## File Type Icon Colors

All file categories use Nintendo Red as the icon background with a white icon stroke. Preserve this when adding or modifying file type icons:

| Category | Background | Icon Color |
|----------|-----------|------------|
| Image | `#E60012` | `#ffffff` |
| PDF | `#E60012` | `#ffffff` |
| Code | `#E60012` | `#ffffff` |
| Archive | `#E60012` | `#ffffff` |
| Audio | `#E60012` | `#ffffff` |
| Video | `#E60012` | `#ffffff` |
| Document | `#E60012` | `#ffffff` |
| Default | `#E60012` | `#ffffff` |

## Component Patterns

### Corners and Depth

* Rounded corners: `border-radius: 8px` (small), `12px` (medium), `16px` (large)
* Shadows: `shadow-sm` for flat elements, `shadow-md` for elevated cards
* Generous spacing for readability

### Buttons

* Primary: Nintendo Red background, white text, 8px border-radius
* Hover: darken to `#cc0010`
* Minimum touch target: 44×44px
* Font: Inter 600 weight

### Cards

* White background on neutral page
* `border-radius: 16px`, `shadow-md`
* 24px internal padding

### Icons

* SVG stroke-based icons (Lucide style)
* 2px stroke width, round caps and joins
* Consistent sizing per context (16px inline, 20px headings, 48px hero)

## Mobile-First Guardrails

* Minimum 44×44px touch targets on all interactive elements
* Responsive layout with max-width containers
* Design for thumb-reach on mobile
* Progressive enhancement for wider viewports

## Do

* Use Nintendo Red for all primary actions and brand accents
* Use Inter for all text
* Maintain rounded edges and soft shadows
* Keep file type icon colors consistent with the table above
* Design mobile-first

## Do Not

* Introduce new primary colors (especially blues)
* Swap fonts or mix typefaces
* Use harsh corners or heavy shadows
* Ship desktop-only layouts
* Remove or flatten the colorful file type icons
