# CLAUDE.md - Beneficios ATT Master Guidelines

This file provides strict guidance for Claude Code and any AI agent working with the "Beneficios ATT" project.

## 1. Project Overview & Architecture
- **Stack**: Vanilla HTML5, CSS3, and modern JavaScript (ES6+).
- **Core Files**:
  - `ABRIR-APP.HTML`: Main modular app entrypoint.
  - `css/`: Stylesheets for layout, UI, and design system.
  - `js/`: Application logic, DOM manipulation, and dynamic functionality.

## 2. Agent Skills: Antigravity Kit (UI/UX Pro Max)
Este proyecto utiliza tu base de datos local `Antigravity Kit`. NO inventes variables de diseño, búscalas.

**Ruta canónica del skill (source):** `Skills/Diseño web/src/ui-ux-pro-max/scripts/search.py`
> Nota: `.claude/skills/ui-ux-pro-max/` contiene punteros de texto al source, no symlinks reales del SO.

**Consultar Estilos y Tokens:**
Para buscar un estilo, corre esto en una terminal local:
`python "Skills/Diseño web/src/ui-ux-pro-max/scripts/search.py" "<query>" --domain style`
(Ej: busca "glassmorphism", "premium dark mode", etc. para ver los `[Design System Variables]` y el `[Implementation Checklist]`).

**Generar Design System completo del proyecto:**
`python "Skills/Diseño web/src/ui-ux-pro-max/scripts/search.py" "telecom corporate employee benefits dashboard" --design-system -p "Beneficios ATT" --persist`
(Genera `design-system/beneficios-att/MASTER.md` — fuente de verdad de tokens, colores y tipografía del proyecto).

## 3. Workflow Implementation Rules
1. **Design First**: Antes de añadir CSS, extrae las variables maestras de la base de datos (Ej: `styles.csv`, `colors.csv`).
2. **Modular Code**: Respeta el archivo `variables.css` local sin eliminar las variables del modelo original (Ej: `--cat0`, `--cat1` son vitales para JS).
3. **No Mates Funcionalidades**: Cuando refactorices estilos `.css` fíjate de no pisar ni cambiar nombres de clases que el JS ya utiliza (e.g. `dash-card`, `fade-hide`).
4. **Cache Busting**: El servidor local es agresivo. Cuando modifiques CSS inserta o actualiza tags `?v=X` en `ABRIR-APP.HTML`.

## 4. Run & Test Instructions
- Ejecutar el server de Python en background (ya corriendo en 8001).
- Visualizar siempre `ABRIR-APP.HTML` (e.g., `http://localhost:8001/ABRIR-APP.HTML`).
