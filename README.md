# 🌕 WELWITSCHIA LUNAR (*We Hitch a Lunar*)
> **"Das raízes de Angola às fronteiras da Lua"**  
> Criado pela equipe **Mochileiros da Galáxia** • Programa Artemis 2032 • Cratera Shackleton (Polo Sul Lunar)

---

## 🚀 Sobre o Projeto
**Welwitschia Lunar** é um simulador espacial 3D educacional em circuito fechado, projetado para jovens de 10 a 16 anos. Inspirado na resistência milenar da planta *Welwitschia mirabilis* do deserto do Namibe (Angola) e nos desafios reais da exploração humana sustentável do Programa Artemis, o jogo coloca o usuário como Comandante da **Estação Welwitschia**.

---

## 🌟 Recursos Técnicos & Inovações Gráficas

### 1. Campo de Estrelas Científico e Terra na Perspectiva Lunar
- **3.500 Estrelas Sem Cintilação:** Distribuídas esfericamente em raio de $1.800\text{m}$ com magnitudes e temperaturas de cor estelares (branco-azulado, branco puro, amarelo pálido). No vácuo lunar não há atmosfera, logo as estrelas permanecem estáticas e perfeitamente nítidas no céu negro.
- **A Terra no Horizonte Polar:** Posicionada a $8,5^\circ$ de elevação com tamanho aparente $\sim 4\times$ maior do que a Lua vista da Terra. Apresenta **fase lunar iluminada coerente** com a luz rasante do Sol (azimute $045^\circ$, elevação $5^\circ$), revelando oceanos azuis, continentes e turbilhões de nuvens no lado diurno, escuridão no lado noturno e um **halo atmosférico azul sutil com efeito Fresnel**.

### 2. Radar Circular (Minimapa) com Referência Contínua da Base
- Localizado no canto inferior direito do HUD, orientado pelo azimute do rover:
  - **Marcador Verde (`BASE`):** Aponta continuamente para a Estação Welwitschia `(0, 0)` com telemetria de distância em metros. **Permanece ativo e calibrado mesmo durante a tempestade de poeira lunar.**
  - **Marcador Âmbar (`LRO`):** Rastreia a sonda LRO-Scout a $2.000\text{m}$. Entra em estática com interferência durante o `STATE_STORM_DILEMMA`.
  - **Anéis Concêntricos:** Marcações de $500\text{m}$, $1.000\text{m}$ e $2.000\text{m}$.

### 3. Sistema de Colisão Física Real & Resposta Mecânica
- **Colisores de Terreno:** Mapeamento esférico de obstáculos rochosos (grandes blocos de ejetos basálticos), além dos limites da Estação Welwitschia e do LRO-Scout.
- **Resposta Mecânica:**
  - Bloqueio de penetração por normal de colisão;
  - Ricochete amortecido ($\vec{v} \times -0,35$);
  - Dano estrutural de $-5\%$ na blindagem caso a colisão ocorra com velocidade $> 12\text{ km/h}$;
  - Disparo de som de impacto metálico/rochoso e alerta urgente da **Welly**.

### 4. Pós-Processamento e Rastro Balístico de Poeira no Vácuo
- **EffectComposer & UnrealBloomPass:** Brilho fotométrico suave nos faróis de xenônio do rover, iluminação da cúpula geodésica e atmosfera da Terra, aliado ao mapeamento de tons `ACESFilmicToneMapping`.
- **Regolito de Alta Frequência:** Mapa de relevo/bump procedural com marcas de impacto, pedriscos e ranhuras que projetam micro-sombras dramáticas sob o sol polar de $5^\circ$.
- **Ejeção Balística de Poeira pelas Rodas:** Na ausência de ar, o regolito ejetado pelas 6 rodas não forma fumaça nem névoa; ele sobe e cai em parábolas balísticas perfeitas sob a gravidade lunar ($g = -1,62\text{ m/s}^2$).

### 5. Copiloto IA Welly — Comunicação Sequencial Passo a Passo
- **Fila Sequencial (`messageQueue`):** A Welly transmite instruções em **frases curtas e objetivas (máximo 2 linhas)**, com efeito de digitação e botão `[ Continuar ▸ ]` (ou avanço automático após pausa de leitura).
- **Prioridade para Emergências:** Alertas críticos (excesso de velocidade, colisão com rochas ou início de tempestade) são inseridos instantaneamente no topo da fila.
- **Base de Conhecimento Offline:** Drawer lateral com as 4 perguntas científicas frequentes.

---

## 🕹️ Controles do Simulador

| Tecla / Comando | Função |
| :--- | :--- |
| **`W`** ou **`▲`** | Acelerar motor elétrico do Rover |
| **`S`** ou **`▼`** | Marcha à ré |
| **`A`** / **`D`** ou **`◀`** / **`▶`** | Direção (esterçamento das 6 rodas) |
| **`Espaço`** | Freio (ativa lanternas traseiras de freio) |
| **`L`** | Ligar / Desligar Faróis SpotLight |
| **`C`** | Alternar Câmera: **3ª Pessoa Externa** $\leftrightarrow$ **Cockpit Interno** |
| **`E`** | Extrair Módulo de Dados do LRO-Scout ($\le 15\text{m}$) |
| **`? PERGUNTAR À WELLY`** | Abre painel lateral de consulta científica offline |

---

## 🏁 Como Executar o Projeto Localmente

```bash
# 1. Instalar as dependências do projeto
npm install

# 2. Iniciar o servidor de desenvolvimento
npm run dev
```

Abra o navegador no endereço exibido (geralmente **`http://localhost:5173/`**).
Para compilar a versão final otimizada:

```bash
npm run build
npm run preview
```
