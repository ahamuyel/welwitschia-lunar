/**
 * Welwitschia Lunar - Motor Híbrido de Chat da Welly (IA Conversacional)
 * Arquitetura Híbrida:
 * 1. Online LLM (se VITE_GEMINI_API_KEY estiver configurado): Conecta à API do Gemini com telemetria injetada.
 * 2. Motor Offline Inteligente (100% funcional sem rede): Reconhecimento semântico por intenção,
 *    sinônimos e respostas contextualizadas em tempo real com bateria, oxigênio, distância e estado da missão.
 */

import type { TelemetryData, ResourceState, GameState, WellyMood } from '../types/game';

export interface ChatResponse {
  text: string;
  mood: WellyMood;
  isOnline: boolean;
}

export class WellyChatEngine {
  private geminiApiKey: string = '';

  constructor() {
    // Carrega a chave de API de variáveis de ambiente do Vite se disponível
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      this.geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
    }
  }

  public setApiKey(key: string): void {
    this.geminiApiKey = key.trim();
  }

  public getIsOnlineConfigured(): boolean {
    return Boolean(this.geminiApiKey && this.geminiApiKey.length > 5);
  }

  /**
   * Processa a pergunta do jogador combinando contexto de telemetria
   */
  public async askWelly(
    prompt: string,
    telemetry: TelemetryData,
    resources: ResourceState,
    gameState: GameState
  ): Promise<ChatResponse> {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      return {
        text: 'Estou atenta, Comandante! Pode enviar sua dúvida ou comando pelo terminal.',
        mood: 'NEUTRAL',
        isOnline: false
      };
    }

    // 1. Tenta resposta online se houver API key configurada
    if (this.getIsOnlineConfigured()) {
      try {
        const onlineReply = await this.queryGeminiOnline(cleanPrompt, telemetry, resources, gameState);
        if (onlineReply) {
          return {
            text: onlineReply,
            mood: 'HAPPY',
            isOnline: true
          };
        }
      } catch (e) {
        console.warn('Welly Online falhou, alternando para motor offline inteligente:', e);
      }
    }

    // 2. Motor Offline Inteligente (Zero dependência externa)
    const offlineReply = this.queryOfflineEngine(cleanPrompt, telemetry, resources, gameState);
    return {
      text: offlineReply.text,
      mood: offlineReply.mood,
      isOnline: false
    };
  }

  /**
   * Chamada direta à API do Gemini com System Prompt e contexto de telemetria
   */
  private async queryGeminiOnline(
    userPrompt: string,
    telemetry: TelemetryData,
    resources: ResourceState,
    gameState: GameState
  ): Promise<string | null> {
    const systemPrompt = `Você é a Welly, uma copiloto IA avançada e amigável da Estação Welwitschia (ano 2032, Programa Artemis, borda da Cratera Shackleton no Polo Sul da Lua).
Sua missão é auxiliar e educar o jogador (jovens de 10 a 16 anos).
Responda SEMPRE em português, com tom científico, caloroso e encorajador.
Suas respostas devem ser CURTAS e OBJETIVAS (máximo de 2 a 3 frases).
Dados atuais da telemetria da missão para você usar em suas respostas:
- Fase da Missão: ${gameState}
- Bateria do Rover: ${Math.round(resources.roverBattery)}%
- Oxigênio do Traje: ${Math.round(resources.suitOxygen)}%
- Integridade do Rover: ${Math.round(resources.roverIntegrity)}%
- Distância até o Rover LRO-Scout: ${telemetry.distanceToTargetM} metros (Rumo: 045° NE)
- Distância de volta até a Base Welwitschia: ${telemetry.distanceToBaseM} metros
- Velocidade Atual: ${telemetry.speedKmh.toFixed(1)} km/h
- Status da Tempestade de Micrometeoritos: ${telemetry.isInStorm ? 'EM TEMPESTADE (VISIBILIDADE BAIXA)' : 'Normal'}
- Faróis do Rover: ${telemetry.isHeadlightsOn ? 'Ligados' : 'Desligados'}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nPergunta do Comandante: "${userPrompt}"` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 150
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText ? candidateText.trim() : null;
  }

  /**
   * Motor Semântico Offline com reconhecimento de intenção, sinônimos e telemetria dinâmica
   */
  private queryOfflineEngine(
    prompt: string,
    telemetry: TelemetryData,
    resources: ResourceState,
    gameState: GameState
  ): { text: string; mood: WellyMood } {
    const p = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Dúvidas sobre Bateria / Energia
    if (p.includes('bateria') || p.includes('energia') || p.includes('carga') || p.includes('eletric') || p.includes('descarreg')) {
      const bat = Math.round(resources.roverBattery);
      if (bat > 75) {
        return {
          text: `Nossa bateria está excelente em ${bat}%, Comandante! Temos autonomia suficiente para cruzar as crateras e alcançar o LRO-Scout com tranquilidade.`,
          mood: 'HAPPY'
        };
      } else if (bat > 30) {
        return {
          text: `A bateria está em ${bat}%. O motor elétrico consome mais quando aceleramos em aclives. Lembre-se que desligar os faróis quando houver luz economiza 0.02%/s!`,
          mood: 'NEUTRAL'
        };
      } else {
        return {
          text: `ALERTA! Bateria em nível crítico: ${bat}%! Evite correr em alta velocidade e mantenha o foco no resgate ou no retorno imediato à base.`,
          mood: 'ALERT'
        };
      }
    }

    // 2. Dúvidas sobre Oxigênio / Ar / Respiração
    if (p.includes('oxigenio') || p.includes('ar') || p.includes('respir') || p.includes('traje') || p.includes('o2')) {
      const o2 = Math.round(resources.suitOxygen);
      if (o2 > 60) {
        return {
          text: `Os tanques do seu traje estão com ${o2}% de O₂. O consumo é constante em 0.12% por segundo fora da cúpula, garantindo boa margem de exploração.`,
          mood: 'HAPPY'
        };
      } else if (o2 > 25) {
        return {
          text: `Oxigênio em ${o2}%. Nossos sistemas de reciclagem estão operando normalmente, mas fique de olho no relógio da missão.`,
          mood: 'NEUTRAL'
        };
      } else {
        return {
          text: `ATENÇÃO, Comandante! Oxigênio em apenas ${o2}%! Se atingir zero, o protocolo automático de resgate de emergência terá que ser acionado!`,
          mood: 'ALERT'
        };
      }
    }

    // 3. Onde está o alvo / LRO-Scout / Navegação
    if (p.includes('alvo') || p.includes('onde') && (p.includes('rover') || p.includes('scout') || p.includes('ir') || p.includes('caminho'))) {
      if (telemetry.distanceToTargetM <= 15) {
        return {
          text: 'Estamos exatamente ao lado do LRO-Scout! Aproxime-se e pressione a tecla [E] para extrair o módulo de dados científicos.',
          mood: 'HAPPY'
        };
      }
      if (telemetry.isInStorm && !telemetry.isGpsActive) {
        return {
          text: `O sinal GPS foi afetado pelos impactos! Mantenha o rumo em 045° Nordeste na bússola e oriente-se pela aceleração dos bipes do nosso sonar acústico.`,
          mood: 'ALERT'
        };
      }
      return {
        text: `O rover LRO-Scout está a ${telemetry.distanceToTargetM.toLocaleString('pt-BR')} metros daqui, no rumo 045° Nordeste. Siga a agulha âmbar no radar!`,
        mood: 'NEUTRAL'
      };
    }

    // 4. Origem do Nome Welwitschia & Botânica Espacial
    if (p.includes('welwitschia') || p.includes('nome') || p.includes('angola') || p.includes('namibe') || p.includes('planta')) {
      return {
        text: 'Nossa estação foi batizada em homenagem à Welwitschia mirabilis, uma planta extraordinária do deserto do Namibe, em Angola. Ela vive por mais de 1.000 anos em condições ultra-áridas, assim como nós prosperamos no gelo lunar!',
        mood: 'HAPPY'
      };
    }

    // 5. Onde está a Base / Voltar para casa
    if (p.includes('base') || p.includes('voltar') || p.includes('estacao') || p.includes('casa') || p.includes('recuar')) {
      return {
        text: `A Estação Welwitschia está a ${telemetry.distanceToBaseM.toLocaleString('pt-BR')} metros de nós. Olhe o ponto VERDE [BASE] no seu radar circular no canto inferior direito!`,
        mood: 'HAPPY'
      };
    }

    // 6. Eletrólise / Combustível / Gelo / Água / Marte
    if (p.includes('eletrolise') || p.includes('combustivel') || p.includes('gelo') || p.includes('agua') || p.includes('marte') || p.includes('foguete')) {
      return {
        text: 'Usamos eletricidade solar vertical para quebrar a molécula da água (2 H₂O ➔ 2 H₂ + O₂). Resfriados, o hidrogênio líquido vira combustível e o oxigênio vira comburente para o foguete de Marte!',
        mood: 'HAPPY'
      };
    }

    // 7. Por que está escuro / Sol / Sombras / Frio
    if (p.includes('escuro') || p.includes('sombra') || p.includes('frio') || p.includes('temperatura') || p.includes('sol')) {
      return {
        text: 'No Polo Sul da Lua, o Sol nunca sobe alto — ele gira a apenas 5° tangenciando o horizonte! Por isso as sombras são gigantescas e as crateras profundas chegam a -200 °C no fundo.',
        mood: 'NEUTRAL'
      };
    }

    // 8. Por que não tem vento / Atmosfera
    if (p.includes('vento') || p.includes('ar') || p.includes('atmosfera') || p.includes('clima') || p.includes('tempestade')) {
      if (telemetry.isInStorm) {
        return {
          text: 'Esta nuvem não é vento! Como não há ar na Lua, são partículas de regolito eletrostático levantadas pelo impacto balístico de micrometeoritos na borda da cratera.',
          mood: 'ALERT'
        };
      }
      return {
        text: 'A Lua não tem atmosfera! Sem gases, não há vento nem nuvens, e qualquer poeira cai em parábola perfeita direto no chão por causa da gravidade de 1,62 m/s².',
        mood: 'NEUTRAL'
      };
    }

    // 9. Quem são os Mochileiros da Galáxia / Artemis
    if (p.includes('mochileiros') || p.includes('galaxia') || p.includes('equipe') || p.includes('artemis')) {
      return {
        text: 'Os Mochileiros da Galáxia são a equipe de jovens inovadores que conceberam este simulador educacional em 2032 para aproximar o Programa Artemis e a ciência espacial do público!',
        mood: 'HAPPY'
      };
    }

    // 10. O que devo fazer agora? / Instruções contextuais do GameState
    if (p.includes('fazer') || p.includes('ajuda') || p.includes('missao') || p.includes('objetivo') || p.includes('proximo')) {
      switch (gameState) {
        case 'STATE_PROLOGUE':
          return {
            text: 'Clique no botão [ INICIAR MISSÃO ] na tela para assumirmos o comando da Estação Welwitschia!',
            mood: 'HAPPY'
          };
        case 'STATE_DOME_MANAGEMENT':
          return {
            text: 'Conclua os 3 preparativos no painel: transfira energia para o rover, encha o oxigênio do traje e leia o briefing antes de abrir o airlock.',
            mood: 'NEUTRAL'
          };
        case 'STATE_ROVER_EXPLORATION':
          return {
            text: `Pilote o rover até o LRO-Scout a ${telemetry.distanceToTargetM}m. Use W/A/S/D para guiar e mantenha a velocidade abaixo de 15 km/h para não derrapar na baixa gravidade.`,
            mood: 'NEUTRAL'
          };
        case 'STATE_STORM_DILEMMA':
          return {
            text: 'Reduza a velocidade imediatamente! Mantenha a bússola em 045° Nordeste e use o ritmo do sonar para encontrar o rover no meio do regolito.',
            mood: 'ALERT'
          };
        case 'STATE_RESCUE_AND_ISRU':
          return {
            text: 'Missão cumprida! Nossos módulos ISRU estão sintetizando o combustível criogênico para o foguete interplanetário.',
            mood: 'HAPPY'
          };
      }
    }

    // 11. Saudações e interações casuais
    if (p.includes('ola') || p.includes('oi') || p.includes('bom dia') || p.includes('boa noite') || p.includes('tudo bem') || p.includes('welly')) {
      return {
        text: `Olá, Comandante Alberto! Sistemas da Estação Welwitschia operando com 100% de precisão. Em que posso auxiliá-lo neste setor lunar?`,
        mood: 'HAPPY'
      };
    }

    // 12. Fallback inteligente padrão
    return {
      text: `Excelente pergunta, Comandante. No ambiente lunar hostil de 2032, cada dado científico nos ajuda a viabilizar a exploração sustentável de Marte. Como posso apoiar sua rota agora?`,
      mood: 'NEUTRAL'
    };
  }
}

export const wellyChatEngine = new WellyChatEngine();
