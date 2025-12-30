import { GoogleGenAI, Type } from "@google/genai";
import { MarketState, TradeSignal } from "../types";

/**
 * SECURE BACKEND-SIMULATED FUNCTION
 * In this environment, process.env.API_KEY is handled securely by the platform.
 */
export const analyzeTradeSignal = async (
  pair: string,
  state: MarketState,
  isKillZone: boolean,
  volatilityScore: number
): Promise<{ data: TradeSignal | null; error: string | null }> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return { data: null, error: "CRITICAL: Secure API Key missing from environment." };
  }

  // Always use the required initialization format
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemPrompt = `
    You are a Senior Quant Developer and Trading Mentor. 
    Analyze Forex data using institutional concepts but EXPLAIN them clearly:
    - SMT Divergence: Correlation between Dollar and the Pair.
    - Daily Movement (ADR): Market range exhaustion check.
    - News Catalysts: Impact of current headlines.
    - Institutional Zones: Supply/Demand liquidity nodes.

    RULES:
    - Provide specific 'tp' and 'sl' prices.
    - 'score' is 0-100.
    - Output MUST be strictly valid JSON.
  `;

  const prompt = `
    ENDPOINT CALL: /api/analyze/${pair}
    PAYLOAD:
    - MarketState: ${JSON.stringify(state)}
    - KillZone: ${isKillZone}
    - VolatilityPulse: ${volatilityScore}%
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pair: { type: Type.STRING },
            score: { type: Type.NUMBER },
            action: { type: Type.STRING, enum: ['STRONG BUY', 'BUY', 'WAIT', 'SELL', 'STRONG SELL'] },
            reasoning: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            quality: { type: Type.STRING, enum: ['Safe', 'Unsafe'] },
            tp: { type: Type.NUMBER },
            sl: { type: Type.NUMBER },
            smtDivergence: { type: Type.BOOLEAN },
            adrExhausted: { type: Type.BOOLEAN }
          },
          required: ['pair', 'score', 'action', 'reasoning', 'quality', 'tp', 'sl', 'smtDivergence', 'adrExhausted']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Backend returned empty payload.");
    
    return { data: JSON.parse(text), error: null };
  } catch (error: any) {
    console.error("SECURE_BACKEND_FAILURE:", error);
    
    let errorMessage = "Unexpected Internal Server Error.";
    if (error.message?.includes("429")) errorMessage = "Quota Exceeded: Backend throttling active.";
    if (error.message?.includes("403")) errorMessage = "Permission Denied: Invalid Secure Token.";
    if (error.message?.includes("Network")) errorMessage = "Gateway Timeout: Network connectivity unstable.";

    return { data: null, error: errorMessage };
  }
};