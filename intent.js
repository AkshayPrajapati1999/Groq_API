const FALLBACK_MODEL = "mixtral-8x7b-32768";

function keywordIntent(text) {
  const t = text.toLowerCase();
  // Prefer explicit "create" style commands even if they mention meeting/calendar.
  if (/\b(create|make|add|new|build)\b/.test(t)) return "create";
  if (/\b(schedule|book|calendar|meeting|appoint)\b/.test(t)) return "schedule";
  return "unknown";
}

async function groqIntent(groqClient, text) {
  const chat = await groqClient.chat.completions.create({
    model: FALLBACK_MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          'Classify the user request as "create" or "schedule". Reply with one word: create or schedule.',
      },
      { role: "user", content: text },
    ],
  });

  const content = chat.choices?.[0]?.message?.content?.trim().toLowerCase();
  return content === "create" || content === "schedule" ? content : "unknown";
}

async function inferIntent(groqClient, text) {
  const localIntent = keywordIntent(text);
  if (localIntent !== "unknown") return localIntent;
  return groqIntent(groqClient, text);
}

module.exports = { inferIntent };

