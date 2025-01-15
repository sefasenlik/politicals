import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: "",
});

export async function generateAIResponse(message) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            store: true,
            messages: [
                { 
                    "role": "system", 
                    "content": "You are a friendly game companion. Keep responses concise and playful. Limit responses to 1-2 sentences."
                },
                { 
                    "role": "user", 
                    "content": message 
                }
            ],
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('[AI] Error generating response:', error);
        return null;
    }
}