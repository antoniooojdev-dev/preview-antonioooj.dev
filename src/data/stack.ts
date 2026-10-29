export interface StackGroup {
  label: string;
  items: string[];
}

export const stack: StackGroup[] = [
  { label: "frontend", items: ["HTML5", "CSS3", "JavaScript", "TypeScript", "Astro", "React"] },
  { label: "backend", items: ["PHP", "Laravel", "Node.js", "API REST"] },
  { label: "datos", items: ["MySQL", "MariaDB", "SQLite"] },
  { label: "gaming", items: ["Lua", "FiveM", "ox_lib", "discord.js"] },
  { label: "herramientas", items: ["Git", "Docker", "Linux", "Vercel", "Figma"] },
];
