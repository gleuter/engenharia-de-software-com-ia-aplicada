console.assert(
    process.env.OPENROUTER_API_KEY,
    "OPENROUTER_API_KEY is not set in the environment variables"
);

export type ModelConfig = {
    apiKey: string;
    httpReferer: string;
    xTitle: string;
    port: number;
    models: string[];
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    provider: {
        sort: {
            by: string;
            partition: string;
        };
    };
};

export const config: ModelConfig = {
    apiKey: process.env.OPENROUTER_API_KEY!,
    httpReferer: "http://pos-ia.com",
    xTitle: "SmartModelRouterGateway",
    port: 3000,
    models: [
        "google/gemma-4-26b-a4b-it:free",
        "apodex/apodex-1.1-mini:free",
    ],
    temperature: 0.2,
    maxTokens: 100,
    systemPrompt: "que dia e hoje em portugues",
    provider: {
        sort: {
            by: 'price',
            partition: 'none',
        }
    }
};