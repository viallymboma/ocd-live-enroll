/** Theme preference — shared by the server (cookie) and the browser (switch). */
export const THEME_COOKIE = "ocd_theme";
export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";

/**
 * Runs in <head> BEFORE the first paint:
 *  - marks <html class="js"> (lets CSS hide text that GSAP is about to reveal),
 *  - resolves "system" to light/dark and follows the OS live.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');var p=d.getAttribute('data-theme-pref');if(p!=='system')return;var m=window.matchMedia('(prefers-color-scheme: dark)');var a=function(){if(d.getAttribute('data-theme-pref')==='system')d.setAttribute('data-theme',m.matches?'dark':'light')};a();m.addEventListener('change',a)})();`;
