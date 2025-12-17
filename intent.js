async function inferIntent(groqClient, text) {
  const chat = await groqClient.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "Analyze the user's natural language input. Infer the intent based on meaning and context, not keyword rules. Classify the intent into exactly one of these values: CREATE, SCHEDULE, UNKNOWN. Return ONLY the intent value.",
      },
      { role: "user", content: text },
    ],
  });

  const content = chat.choices?.[0]?.message?.content?.trim();
  if (content === "CREATE" || content === "SCHEDULE" || content === "UNKNOWN") {
    return content;
  } else {
    return "UNKNOWN";
  }
}

module.exports = { inferIntent };