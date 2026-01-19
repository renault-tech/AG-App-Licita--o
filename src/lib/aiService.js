/**
 * Serviço de IA para aprimoramento de texto
 * Utiliza Google Gemini API para adequar textos à Lei 14.133/2021
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Prompt base para adequação de textos à lei de licitações
 */
const SYSTEM_PROMPT = `Você é um especialista em licitações públicas brasileiras e na Lei 14.133/2021.
Sua tarefa é reescrever textos de forma formal, técnica e adequada à linguagem exigida em documentos oficiais de licitação.

Regras:
1. Mantenha o sentido original do texto
2. Use linguagem formal e técnica
3. Evite coloquialismos e informalidades
4. Seja claro e objetivo
5. Quando apropriado, faça referência à Lei 14.133/2021
6. Não adicione informações que não estavam no texto original
7. Retorne APENAS o texto reescrito, sem explicações adicionais`;

/**
 * Aprimora um texto usando IA para adequá-lo à linguagem formal de licitações
 * @param {string} text - Texto original do usuário
 * @param {string} context - Contexto adicional sobre qual campo está sendo preenchido
 * @returns {Promise<string>} - Texto aprimorado
 */
export async function enhanceTextWithAI(text, context = '') {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('API Key do Gemini não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env');
    }

    if (!text || text.trim().length < 10) {
        throw new Error('Texto muito curto para aprimorar. Digite pelo menos algumas palavras.');
    }

    const userPrompt = context
        ? `Contexto: Este texto será usado no campo "${context}" de um documento de licitação.\n\nTexto para reescrever:\n${text}`
        : `Texto para reescrever:\n${text}`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${SYSTEM_PROMPT}\n\n${userPrompt}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Erro na API do Gemini');
        }

        const data = await response.json();
        const enhancedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!enhancedText) {
            throw new Error('Resposta vazia da IA');
        }

        return enhancedText.trim();
    } catch (error) {
        console.error('Erro ao aprimorar texto:', error);
        throw error;
    }
}

export default enhanceTextWithAI;
