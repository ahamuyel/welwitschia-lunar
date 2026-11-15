## 🌕 Welwitschia Lunar // Pull Request

### 🚀 Resumo das Alterações
- MVP 3D em circuito fechado para exploração do Polo Sul Lunar (Cratera Shackleton, ano 2032).
- Iluminação astronômica realista com Sol polar a 5° e Terra procedural com halo atmosférico.
- Terreno procedural de 2.500m x 2.500m com relevo Perlin/Simplex e crateras de impacto.
- Física lunar ($g = -1.62\text{ m/s}^2$), inércia de condução e sistema de colisão real com ricochete.
- Copiloto IA **Welly** com fila sequencial de mensagens passo a passo e FAQ científica offline.
- Radar circular com referência contínua da Estação Welwitschia (0, 0).
- Pós-processamento com `EffectComposer` e `UnrealBloomPass`.
- Simulação de refinaria ISRU com eletrólise de água lunar ($\text{H}_2\text{O} \rightarrow \text{O}_2 + \text{H}_2$).

### 🧪 Testes Realizados
- [x] Compilação limpa via `npm run build` (sem erros de tipagem).
- [x] Validação funcional a 60 FPS com Three.js e Web Audio API.
- [x] Testes de máquina de estados (5 estados) e transições validadas.
- [x] Verificação do radar minimapa e sistema de colisão.
