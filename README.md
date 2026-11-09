# WellBePro

Welcome to WellBePro! This project is a modern web application built with Next.js, React, TypeScript, Tailwind CSS, and a rich set of UI libraries. Below you'll find a comprehensive overview of the architecture, technologies, and structure of the codebase.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Key Features](#key-features)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Development](#development)
- [Linting & Formatting](#linting--formatting)
- [Icons & Assets](#icons--assets)
- [Contributing](#contributing)

---

## Project Overview
WellBePro is designed to be scalable, maintainable, and developer-friendly. It leverages Next.js for server-side rendering and routing, React for UI, and TypeScript for type safety. Tailwind CSS is used for rapid and consistent styling.

## Tech Stack
- **Next.js**: App framework for React, SSR, routing
- **React**: UI library
- **TypeScript**: Static typing
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI & Shadcn UI**: Accessible, composable UI primitives
- **MUI (Material UI)**: Advanced UI components
- **Lucide Icons**: Icon library
- **Other Libraries**: date-fns, file-saver, html2canvas, recharts, etc.

## Directory Structure
```
/Users/x/Desktop/WbePro
├── app/                # Next.js app directory (pages, layouts, etc.)
├── components/         # Reusable React components
├── public/             # Static assets (SVGs, images)
├── lib/                # Utility functions
├── hooks/              # Custom React hooks
├── styles/             # Global and component styles
├── .next/              # Next.js build output (ignored)
├── node_modules/       # Dependencies
├── package.json        # Project metadata & scripts
├── tsconfig.json       # TypeScript configuration
├── next.config.ts      # Next.js configuration
├── postcss.config.mjs  # PostCSS/Tailwind config
├── eslint.config.mjs   # ESLint configuration
├── components.json     # UI registry config
└── ...                 # Other config and support files
```

## Key Features
- **Type Safety**: All code is written in TypeScript for reliability.
- **Modern UI**: Uses Radix, Shadcn, MUI, and Lucide for beautiful, accessible interfaces.
- **Customizable Styling**: Tailwind CSS with custom config and CSS variables.
- **SVG Icons**: All icons are stored in `/public` as SVGs for easy use and customization.
- **Utility Libraries**: Includes date handling, color manipulation, PDF generation, and more.

## Configuration
- **TypeScript**: Configured for strict type checking and modern module resolution.
- **ESLint**: Enforces code quality and style.
- **Tailwind CSS**: Configured via `postcss.config.mjs` and referenced in `components.json`.
- **Next.js**: Custom config in `next.config.ts`.

## Scripts
- `dev`: Start development server
- `build`: Build for production
- `start`: Start production server
- `lint`: Run ESLint

## Development
1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start development server**:
   ```bash
   npm run dev
   ```
3. **Build for production**:
   ```bash
   npm run build
   ```

## Linting & Formatting
- ESLint is set up for Next.js and TypeScript. Run `npm run lint` to check code quality.
- Tailwind CSS is used for styling; see `app/globals.css` for base styles.

## Icons & Assets
- SVG icons are stored in `/public` (e.g., `file.svg`, `globe.svg`, `window.svg`, etc.).
- Use them in your components via `<img src="/file.svg" />` or as inline SVGs.

## Contributing
Pull requests and issues are welcome! Please follow the code style and conventions enforced by ESLint and TypeScript.

---

## License
This project is for educational and demonstration purposes. No sensitive data is included.

---

## Contact
For questions or feedback, open an issue or contact the maintainer.

---

## System Architecture
WellBePro follows a modular, layered architecture to ensure scalability and maintainability:

- **Presentation Layer**: Built with React and Next.js, responsible for rendering UI and handling user interactions.
- **Routing Layer**: Managed by Next.js, supports file-based routing and API routes for server-side logic.
- **Component Layer**: Reusable UI components organized in `/components`, leveraging Radix UI, Shadcn UI, and MUI for accessibility and design consistency.
- **State Management**: Utilizes React's built-in state and context APIs. For more complex scenarios, custom hooks in `/hooks` are used.
- **Utility Layer**: Shared functions and helpers are placed in `/lib` for tasks like formatting, data manipulation, and API calls.
- **Styling Layer**: Tailwind CSS provides utility-first styling, with global styles in `app/globals.css` and component-level customization.
- **Assets Layer**: Static files (SVGs, images) are stored in `/public` for easy access and CDN optimization.

## Design Patterns
- **Component-Based Architecture**: UI is broken into small, reusable components for maintainability and scalability.
- **Hooks Pattern**: Custom hooks encapsulate logic and state, promoting code reuse and separation of concerns.
- **Context API**: Used for global state management where needed (e.g., theme, user session).
- **Factory Pattern**: Utility functions in `/lib` often use factory patterns for creating reusable logic (e.g., color manipulation, date formatting).
- **Composition**: Components are composed together using props and slots (Radix UI), enabling flexible layouts and behaviors.
- **Separation of Concerns**: Logic, presentation, and data fetching are separated into distinct modules and layers.
