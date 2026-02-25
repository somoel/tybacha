import type { StreamableOutputItem, Tool } from '@openrouter/sdk';
import { OpenRouter, stepCountIs } from '@openrouter/sdk';
import { EventEmitter } from 'eventemitter3';
import { z } from 'zod';

// Message types
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Agent events for hooks (items-based streaming model)
export interface AgentEvents {
    'message:user': (message: Message) => void;
    'message:assistant': (message: Message) => void;
    'item:update': (item: StreamableOutputItem) => void;  // Items emitted with same ID, replace by ID
    'stream:start': () => void;
    'stream:delta': (delta: string, accumulated: string) => void;
    'stream:end': (fullText: string) => void;
    'tool:call': (name: string, args: unknown) => void;
    'tool:result': (name: string, result: unknown) => void;
    'reasoning:update': (text: string) => void;  // Extended thinking content
    'error': (error: Error) => void;
    'thinking:start': () => void;
    'thinking:end': () => void;
}

// Agent configuration
export interface AgentConfig {
    apiKey: string;
    model?: string;
    instructions?: string;
    tools?: Tool<z.ZodTypeAny, z.ZodTypeAny>[];
    maxSteps?: number;
}

// The Agent class - runs independently of any UI
export class Agent extends EventEmitter<AgentEvents> {
    private client: OpenRouter;
    private messages: Message[] = [];
    private config: Required<Omit<AgentConfig, 'apiKey'>> & { apiKey: string };

    constructor(config: AgentConfig) {
        super();
        this.client = new OpenRouter({ apiKey: config.apiKey });
        this.config = {
            apiKey: config.apiKey,
            model: config.model ?? 'google/gemini-2.0-flash-001',
            instructions: config.instructions ?? 'Eres un especialista en ejercicio físico para adultos mayores.',
            tools: config.tools ?? [],
            maxSteps: config.maxSteps ?? 5,
        };
    }

    // Get conversation history
    getMessages(): Message[] {
        return [...this.messages];
    }

    // Clear conversation
    clearHistory(): void {
        this.messages = [];
    }

    // Add a system message
    setInstructions(instructions: string): void {
        this.config.instructions = instructions;
    }

    // Register additional tools at runtime
    addTool(newTool: Tool<z.ZodTypeAny, z.ZodTypeAny>): void {
        this.config.tools.push(newTool);
    }

    // Send a message and get streaming response using items-based model
    async send(content: string): Promise<string> {
        const userMessage: Message = { role: 'user', content };
        this.messages.push(userMessage);
        this.emit('message:user', userMessage);
        this.emit('thinking:start');

        try {
            const result = this.client.callModel({
                model: this.config.model,
                instructions: this.config.instructions,
                input: this.messages.map((m) => ({ role: m.role, content: m.content })),
                tools: this.config.tools.length > 0 ? this.config.tools : undefined,
                stopWhen: [stepCountIs(this.config.maxSteps)],
            });

            this.emit('stream:start');
            let fullText = '';

            for await (const item of result.getItemsStream()) {
                this.emit('item:update', item);

                switch (item.type) {
                    case 'message':
                        const textContent = item.content?.find((c: { type: string }) => c.type === 'output_text');
                        if (textContent && 'text' in textContent) {
                            const newText = textContent.text;
                            if (newText !== fullText) {
                                const delta = newText.slice(fullText.length);
                                fullText = newText;
                                this.emit('stream:delta', delta, fullText);
                            }
                        }
                        break;
                    case 'function_call':
                        if (item.status === 'completed') {
                            this.emit('tool:call', item.name, JSON.parse(item.arguments || '{}'));
                        }
                        break;
                    case 'function_call_output':
                        this.emit('tool:result', item.callId, item.output);
                        break;
                    case 'reasoning':
                        const reasoningText = item.content?.find((c: { type: string }) => c.type === 'reasoning_text');
                        if (reasoningText && 'text' in reasoningText) {
                            this.emit('reasoning:update', reasoningText.text);
                        }
                        break;
                }
            }

            if (!fullText) {
                fullText = await result.getText();
            }

            this.emit('stream:end', fullText);

            const assistantMessage: Message = { role: 'assistant', content: fullText };
            this.messages.push(assistantMessage);
            this.emit('message:assistant', assistantMessage);

            return fullText;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.emit('error', error);
            throw error;
        } finally {
            this.emit('thinking:end');
        }
    }

    // Send without streaming (simpler for programmatic use)
    async sendSync(content: string): Promise<string> {
        const userMessage: Message = { role: 'user', content };
        this.messages.push(userMessage);
        this.emit('message:user', userMessage);

        try {
            const result = this.client.callModel({
                model: this.config.model,
                instructions: this.config.instructions,
                input: this.messages.map((m) => ({ role: m.role, content: m.content })),
                tools: this.config.tools.length > 0 ? this.config.tools : undefined,
                stopWhen: [stepCountIs(this.config.maxSteps)],
            });

            const fullText = await result.getText();
            const assistantMessage: Message = { role: 'assistant', content: fullText };
            this.messages.push(assistantMessage);
            this.emit('message:assistant', assistantMessage);

            return fullText;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.emit('error', error);
            throw error;
        }
    }
}

// Factory function for easy creation
export function createAgent(config: AgentConfig): Agent {
    return new Agent(config);
}

const openRouterKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

/**
 * OpenRouter Agent singleton configured for medical/exercise content.
 */
export const geminiModel = createAgent({
    apiKey: openRouterKey,
    model: 'google/gemini-2.0-flash-001',
    instructions: 'Eres un especialista en ejercicio físico para adultos mayores.',
});
