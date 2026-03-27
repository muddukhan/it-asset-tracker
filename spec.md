# Brandscapes Assets - Dashboard Theme & View Options

## Current State
The dashboard has a fixed blue/dark theme defined in index.css CSS variables. There are no user-facing theme or layout options. The layout is a fixed multi-panel grid.

## Requested Changes (Diff)

### Add
- Theme switcher: 5 preset themes (Blue Steel (default), Ocean Dark, Forest Green, Sunset Orange, Purple Haze)
- View mode switcher: Compact, Comfortable, Wide layouts for dashboard panels
- Settings persist to localStorage so they survive page refresh
- Theme picker and view switcher accessible from a toolbar on the Dashboard page header

### Modify
- DashboardPage.tsx: Add a theme/view toolbar at the top with palette and layout icons, apply view classes to panel grid
- index.css: Add theme CSS variable overrides for each theme as data-theme attributes on :root
- App.tsx or a new ThemeContext: Inject data-theme on the root element when theme changes

### Remove
- Nothing removed

## Implementation Plan
1. Create a ThemeContext (src/frontend/src/context/ThemeContext.tsx) exposing currentTheme, setTheme, viewMode, setViewMode with localStorage persistence
2. Add 5 theme definitions as CSS variable overrides in index.css using [data-theme="..."] selectors
3. In App.tsx, wrap with ThemeProvider and apply data-theme attribute to root div
4. In DashboardPage.tsx, add a toolbar row at the top with Palette icon button opening a theme picker popover, and a Layout icon toggle for view modes (compact/comfortable/wide)
5. Apply view mode classes to the stats grid and panels grid
