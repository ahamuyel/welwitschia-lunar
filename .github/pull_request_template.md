## 🚀 Resumo das Alterações
- Descreve de forma concisa as melhorias ou correções introduzidas neste PR.

## 🧪 Checklist de Qualidade (Welwitschia Lunar — NASA Space Apps 2026)
- [ ] `npm run lint` (Oxlint) sem erros
- [ ] `npx tsc -b --noEmit` com 0 erros de TypeScript
- [ ] `npm run build` gera `dist/` e `dist/sw.js` corretamente
- [ ] Testado Modo VR (Giroscópio + Gaze Fuse 0.8s) e Modo Normal 360° (Toque/Arrastar) no interior e exterior
- [ ] Responsividade Mobile-First preservada (`pointer-events: none` nos wrappers de UI)

## Fluxo de Branches
- `feat/*` / `fix/*` ➡️ `develop` ➡️ `main` (Produção Vercel)
