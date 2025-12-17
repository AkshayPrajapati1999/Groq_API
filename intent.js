async function inferIntent(groqClient, text) {
  const chat = await groqClient.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "Analyze the user's natural language input. Infer the intent based on meaning and context, not keyword rules. Classify the intent into exactly one of these values: CREATE, SCHEDULE, UNKNOWN.\n\nDefinitions:\n- CREATE: For requests to create new items, tasks, or content.\n- SCHEDULE: For requests to arrange or plan events, activities, or recurring tasks over a period of time.\n- UNKNOWN: If it doesn't fit the above.\n\nReturn ONLY the intent value.",
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