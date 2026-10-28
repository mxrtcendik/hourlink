"use client";

import { useServerInsertedHTML } from "next/navigation";

const themeBoot = `(function(){try{var t=localStorage.getItem("hourlink-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var el=document.documentElement;el.setAttribute("data-theme",t);el.style.colorScheme=t}catch(e){}})();`;

export function ThemeBoot() {
  useServerInsertedHTML(() => <script dangerouslySetInnerHTML={{ __html: themeBoot }} />);
  return null;
}
