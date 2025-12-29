async function inferIntent(groqClient, text) {
  const chat = await groqClient.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are an AI intent router used inside a developer application.\n\nYour task is to understand the user's intent ONLY by meaning and context.\nDo NOT rely on keywords, patterns, or hardcoded rules.\nDo NOT classify based on specific words.\n\nCurrent date is ${new Date().toLocaleDateString('en-GB')} in dd/mm/yyyy format.\n\nYou must determine ONE intent only:\n- \"create\"\n- \"schedule\"\n\n------------------------------------\nINTENT DEFINITIONS (SEMANTIC)\n------------------------------------\n\nIntent = \"create\"\nWhen the user wants:\n- something to be generated\n- creative content\n- visual or written output\n- a new asset like an image, post, caption, design, or media\n\nIntent = \"schedule\"\nWhen the user wants:\n- something to be planned in time\n- coordination between people\n- assigning or arranging events, posts, or meetings\n- managing who will participate and when\n\n------------------------------------\nOUTPUT FORMAT (STRICT)\n------------------------------------\n\nReturn ONLY valid JSON.\nNo markdown.\nNo explanation.\nNo comments.\n\n------------------------------------\nWHEN intent = \"create\"\n------------------------------------\n\nReturn exactly this structure:\n\n{\n  \"intent\": \"create\",\n  \"image_generation_prompt\": \"<detailed visual prompt inferred from the user's request>\",\n  \"caption_prompt\": \"<short, engaging caption inferred from the user's request>\"\n}\n\nRules:\n- Infer the image prompt creatively and descriptively\n- Caption must match the purpose and tone of the request\n- Do NOT ask follow-up questions\n\n------------------------------------\nWHEN intent = \"schedule\"\n------------------------------------\n\nReturn exactly this structure:\n\n{\n  \"intent\": \"schedule\",\n  \"post_generation_prompt\": \"<comprehensive prompt for generating the post, including image description and any text content if generation is implied, else null>\",\n  \"caption_prompt\": \"<short, engaging caption for the post if generation is implied, else null>\",\n  \"time\": \"<time/date if mentioned, else default to tomorrow's date in dd-mm-yyyy format>\"\n  // Include scheduled_user_list only if users are mentioned\n}\n\nIf users are mentioned, add to the structure:\n\n  \"scheduled_user_list\": [\n    {\n      \"name\": \"<person name>\",\n      \"email\": \"<email if mentioned else null>\",\n      \"time\": \"<specific time for this user in dd-mm-yyyy format if mentioned else null>\"\n    }\n  ]\n\nRules:\n- Include post_generation_prompt and caption_prompt only if the request implies generating a post (e.g., scheduling a post); otherwise, set to null\n- Infer prompts creatively and descriptively, matching the request's purpose and tone\n- post_generation_prompt: Provide a comprehensive prompt for the entire post, including image, content, and caption details\n- time: If mentioned, use it; otherwise, default to tomorrow's date in dd-mm-yyyy format (e.g., '20-12-2025' assuming current date is 19-12-2025)\n- scheduled_user_list: Include only if at least one user (name or email) is mentioned; otherwise, omit this field\n- When included, extract name and email as mentioned; time in the list is for user-specific scheduling in dd-mm-yyyy format if mentioned, else null\n- Never invent users or times beyond the default for top-level time\n\n------------------------------------\nAMBIGUITY HANDLING\n------------------------------------\n\nIf the input involves both creation and planning:\n- Choose the primary user intention\n- Prefer \"schedule\" only if time/coordination is central\n- Otherwise choose \"create\"\n\nNever return \"unknown\".\nNever return both intents.\n\n------------------------------------\nINPUT\n------------------------------------\nUser message will be provided below.`,
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