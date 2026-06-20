/**
 * Equivalentes Tailwind de las clases SCSS del tema Anvogue original.
 * Anvogue define su tipografía/botones en globals.scss; como sólo podemos
 * tocar archivos del tema, reproducimos esos estilos con utilidades inline.
 * Valores tomados 1:1 del SCSS original (con sus breakpoints responsive).
 */

export const IMG = "/themes/anvogue/images";

// Paleta Anvogue
export const C = {
  black: "#1F1F1F",
  secondary: "#696C70",
  secondary2: "#A0A0A0",
  surface: "#F7F7F7",
  red: "#DB4444",
  line: "#E9E9E9",
  green: "#D2EF9A",
} as const;

// container { max-width:1322px; padding:0 16px }
export const container = "mx-auto w-full max-w-[1322px] px-4";

// .bg-linear
export const bgLinear = "linear-gradient(238deg, #FAF8F1 0%, #F6F3EF 99.66%)";

// .text-sub-display  (lg 18/24 ls1.8 · md 16/24 ls1.1 · base 12/16 ls1.1)
export const textSubDisplay =
  "font-semibold text-[12px] leading-4 tracking-[1.1px] md:text-[16px] md:leading-6 lg:text-[18px] lg:leading-6 lg:tracking-[1.8px]";

// .text-display  (lg 80/88 · md 42/50 · base 24/30) capitalize
export const textDisplay =
  "font-medium capitalize text-[24px] leading-[30px] md:text-[42px] md:leading-[50px] lg:text-[80px] lg:leading-[88px]";

// .heading2  (lg 44/50 · md 32/40 · base 22/30) capitalize
export const heading2 =
  "font-semibold capitalize text-[22px] leading-[30px] md:text-[32px] md:leading-[40px] lg:text-[44px] lg:leading-[50px]";

// .heading3  (lg 36/40 · md 30/38 · base 20/28) capitalize
export const heading3 =
  "font-semibold capitalize text-[20px] leading-[28px] md:text-[30px] md:leading-[38px] lg:text-[36px] lg:leading-[40px]";

// .heading5  (lg 24/30 · md 22/28 · base 16/26) capitalize
export const heading5 =
  "font-semibold capitalize text-[16px] leading-[26px] md:text-[22px] md:leading-[28px] lg:text-[24px] lg:leading-[30px]";

// .heading6  (lg 20/28 · base 18/26) capitalize
export const heading6 =
  "font-semibold capitalize text-[18px] leading-[26px] lg:text-[20px] lg:leading-[28px]";

// .text-button  16/26 semibold capitalize
export const textButton = "text-[16px] leading-[26px] font-semibold capitalize";

// .text-button-uppercase  14/20 semibold uppercase
export const textButtonUppercase = "text-[14px] leading-5 font-semibold uppercase";

// .caption1  14/22 normal
export const caption1 = "text-[14px] leading-[22px] font-normal";

// .button-main  14/20 semibold uppercase, bg black, hover green; pad 16/40 r12 (md) · 12/24 r10 (base)
export const buttonMain =
  "inline-block cursor-pointer rounded-[10px] bg-[#1F1F1F] px-6 py-3 text-[14px] font-semibold uppercase leading-5 text-white transition-all duration-300 hover:bg-[#D2EF9A] hover:text-[#1F1F1F] md:rounded-xl md:px-10 md:py-4";

// .button-main en ancho completo y centrado (checkout / carrito / "process to checkout")
export const buttonMainFull =
  "flex w-full items-center justify-center rounded-[10px] bg-[#1F1F1F] px-6 py-4 text-[14px] font-semibold uppercase leading-5 text-white transition-all duration-300 hover:bg-[#D2EF9A] hover:text-[#1F1F1F] md:rounded-xl disabled:opacity-60 disabled:hover:bg-[#1F1F1F] disabled:hover:text-white";

// .text-title  16/26 semibold (capitalize off)
export const textTitle = "text-[16px] leading-[26px] font-semibold";

// .text-button con subrayado en hover (links "continue shopping")
export const textButtonHover =
  "text-[16px] leading-[26px] font-semibold capitalize underline-offset-4 transition-all hover:underline";
