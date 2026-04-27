# Echo — Design System

## Aesthetic: Tactile Editorial Light Mode
Inspired by Stripe's precision engineering, Anthropic's warmth, and OpenAI's restraint.
Every surface feels physical, touchable, and considered.

## Hard Rules
- **Light mode only** — `#F4F2ED` warm parchment background
- **No gradients** — flat, solid colors only; no `linear-gradient`, no `radial-gradient` on UI elements
- **No purple** — none, anywhere
- **No light pink** — the accent is deep coral `#CF4462`, never pastel
- **3D depth** — achieved through multi-layer `box-shadow`, not color
- **Interactive** — CSS perspective tilt on cards via `onMouseMove` + `useTilt` hook

## Typography
- **Headings / Display:** `Syne` (Google Fonts) — geometric grotesque, 400–800 weight
- **Body / UI:** `Karla` (Google Fonts) — humanist sans, warm and readable
- **Monospace:** system monospace for IDs/codes

## Color Tokens (in `index.css` :root)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#F4F2ED` | Page background |
| `--surface` | `#FFFFFF` | Cards, inputs |
| `--border` | `#DDD9D2` | Default border |
| `--border-strong` | `#BAB5AD` | Emphasized border |
| `--text` | `#100E0C` | Primary text |
| `--text-muted` | `#6B6560` | Secondary text |
| `--text-faint` | `#AAA59D` | Placeholders, timestamps |
| `--accent` | `#CF4462` | Primary action, coral |
| `--accent-dark` | `#9C2F47` | Button depth edge shadow |
| `--accent-bg` | `#FEF1F4` | Tinted selection bg |
| `--amber` | `#B87318` | Mutual outcome |
| `--amber-dark` | `#8A5510` | Amber button edge |
| `--amber-bg` | `#FDF8EE` | Amber tinted bg |
| `--green` | `#1C7C50` | Success states |
| `--slate` | `#4A4640` | No-interest outcome |

## 3D Depth System
Buttons have a bottom-edge `box-shadow` in the darker variant of their color,
creating a physical "raised" look. On `:active`, `translateY(3px)` collapses the button.

Cards use 3-layer box shadows:
```
var(--shadow-md) = 0 2px 4px rgba(16,14,12,0.05),
                   0 8px 24px rgba(16,14,12,0.07),
                   0 20px 40px rgba(16,14,12,0.04)
```

Interactive cards use `useTilt(strength)` — a `onMouseMove` hook that applies
`perspective(800px) rotateX() rotateY() translateZ()` on hover.

## DO NOT
- No `linear-gradient` or `radial-gradient` on buttons, cards, text, or backgrounds
- No dark mode styles
- No purple or violet tones anywhere
- No Inter, Roboto, or system-ui as primary fonts
- No generic "AI" aesthetics (glowing orbs on dark bg, purple gradients, etc.)
