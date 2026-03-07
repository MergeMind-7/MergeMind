const fetch = global.fetch;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MODEL_QUEUE = [
  "stepfun/step-3.5-flash:free",
  "arcee-ai/trinity-large-preview:free",
];

async function runAI(prompt) {
  for (const model of MODEL_QUEUE) {
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "MergeMind",
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            messages: [
              {
                role: "system",
                content:
                  "You are a senior software engineer performing a code review. Respond ONLY with valid JSON.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      if (!data.choices || !data.choices.length) {
        throw new Error("No response from model");
      }

      return {
        content: data.choices[0].message.content,
        usage: data.usage || null,
        model,
      };
    } catch (err) {
      console.log(`⚠️ Model failed: ${model}`);
      console.log(err.message);
    }
  }

  throw new Error("❌ All AI models failed");
}

module.exports = { runAI };
