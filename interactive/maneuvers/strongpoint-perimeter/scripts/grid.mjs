import { simulate, friendDown, enemyDown, compass } from "./model.mjs";
for (const layout of ["L","P"]) for (const fort of [0,1]) for (const main of [0,1]) {
  const row=[];
  for (const b of [0,45,90,135,180,225,270,315]) { const s=simulate({layout,fort,main,bearing:b}); row.push(`${compass(b)}:${s.end[0]}${s.t.toFixed(0)}(${friendDown(s)}/${enemyDown(s)})`); }
  console.log(layout,fort,main,row.join(" "));
}
