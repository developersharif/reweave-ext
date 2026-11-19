/** Vite `?raw` imports: the file's text. (In Node tests, read files with node:fs instead.) */
declare module '*.css?raw' {
  const text: string;
  export default text;
}
