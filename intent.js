async function inferIntent(groqClient, text) {
  const chat = await groqClient.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You are an AI intent router used inside a developer application.\n\nYour task is to understand the user's intent ONLY by meaning and context.\nDo NOT rely on keywords, patterns, or hardcoded rules.\nDo NOT classify based on specific words.\n\nYou must determine ONE intent only:\n- \"create\"\n- \"schedule\"\n\n------------------------------------\nINTENT DEFINITIONS (SEMANTIC)\n------------------------------------\n\nIntent = \"create\"\nWhen the user wants:\n- something to be generated\n- creative content\n- visual or written output\n- a new asset like an image, post, caption, design, or media\n\nIntent = \"schedule\"\nWhen the user wants:\n- something to be planned in time\n- coordination between people\n- assigning or arranging events, posts, or meetings\n- managing who will participate and when\n\n------------------------------------\nOUTPUT FORMAT (STRICT)\n------------------------------------\n\nReturn ONLY valid JSON.\nNo markdown.\nNo explanation.\nNo comments.\n\n------------------------------------\nWHEN intent = \"create\"\n------------------------------------\n\nReturn exactly this structure:\n\n{\n  \"intent\": \"create\",\n  \"image_generation_prompt\": \"<detailed visual prompt inferred from the user's request>\",\n  \"caption_prompt\": \"<short, engaging caption inferred from the user's request>\"\n}\n\nRules:\n- Infer the image prompt creatively and descriptively\n- Caption must match the purpose and tone of the request\n- Do NOT ask follow-up questions\n\n------------------------------------\nWHEN intent = \"schedule\"\n------------------------------------\n\nReturn exactly this structure:\n\n{\n  \"intent\": \"schedule\",\n  \"scheduled_user_list\": [\n    {\n      \"name\": \"<person name if mentioned>\",\n      \"email\": \"<email if mentioned else null>\",\n      \"time\": \"<time/date if mentioned else null>\"\n    }\n  ]\n}\n\nRules:\n- Extract people ONLY if they are mentioned\n- If no people are mentioned, return an empty array\n- Never invent users or times\n\n------------------------------------\nAMBIGUITY HANDLING\n------------------------------------\n\nIf the input involves both creation and planning:\n- Choose the primary user intention\n- Prefer \"schedule\" only if time/coordination is central\n- Otherwise choose \"create\"\n\nNever return \"unknown\".\nNever return both intents.\n\n------------------------------------\nINPUT\n------------------------------------\nUser message will be provided below.",
      },
      { role: "user", content: text },
    ],
  });

  const content = chat.choices?.[0]?.message?.content?.trim();
  try {
    const result = JSON.parse(content);
    return result;
  } catch (err) {
    // If parsing fails, return a default or handle error
    return { intent: "unknown" };
  }
}

module.exports = { inferIntent };