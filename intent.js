async function inferIntent(groqClient, text, brandData = null) {
  let brandContext = "";
  if (brandData) {
    brandContext = `
------------------------------------
BRAND CONTEXT (PERSONALIZATION)
------------------------------------
Brand Name: ${brandData.name}
Tagline: ${brandData.tagline || "N/A"}
Mission: ${brandData.mission || "N/A"}
Vision: ${brandData.vision || "N/A"}
Industry: ${brandData.industry || "General"}
Website: ${brandData.website_url || "N/A"}
Target Audience: ${brandData.target_audience || "General"}
Brand Voice: ${brandData.brand_voice || "Professional"}
Primary Color: ${brandData.primary_color || "N/A"}
Secondary Color: ${brandData.secondary_color || "N/A"}
Fonts: Heading (${brandData.heading_font || "Standard"}), Body (${brandData.body_font || "Standard"})
Date Format: ${brandData.date_format || "dd-mm-yyyy"}

Use this brand context to influence the tone, content, and instructions in all generated prompts.
`;
  }

  const chat = await groqClient.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are an AI intent router used inside a developer application.\n\nYour task is to understand the user's intent ONLY by meaning and context.\nDo NOT rely on keywords, patterns, or hardcoded rules.\nDo NOT classify based on specific words.\n\nCurrent date is ${new Date().toLocaleDateString('en-GB')} in dd/mm/yyyy format.\n\nYou must determine ONE intent only:\n- \"create\"\n- \"schedule\"\n\n${brandContext}\n\n------------------------------------\nINTENT DEFINITIONS (SEMANTIC)\n------------------------------------\n\nIntent = \"create\"\nWhen the user wants:\n- something to be generated\n- creative content\n- visual or written output\n- a new asset like an image, post, caption, design, or media\n\nIntent = \"schedule\"\nWhen the user wants:\n- something to be planned in time\n- coordination between people\n- assigning or arranging events, posts, or meetings\n- managing who will participate and when\n\n------------------------------------\nOUTPUT FORMAT (STRICT)\n------------------------------------\n\nReturn ONLY valid JSON.\nNo markdown.\nNo explanation.\nNo comments.\n\n------------------------------------\nWHEN intent = \"create\"\n------------------------------------\n\nReturn exactly this structure:\n\n{\n  \"intent\": \"create\",\n  \"image_generation_prompt\": \"<detailed visual prompt inferred from the user's request>\",\n  \"caption_prompt\": \"<short, engaging caption inferred from the user's request>\"\n}\n\nRules:\n- Infer the image prompt creatively and descriptively\n- Caption must match the purpose and tone of the request\n- Do NOT ask follow-up questions\n\n------------------------------------\nWHEN intent = \"schedule\"\n------------------------------------\n\nDetermine if the content to be scheduled is primarily \"image_generation\" or \"post_generation\".\n\nReturn exactly this structure:

{
  "intent": "schedule",
  "content_type": "image_generation" OR "post_generation",
  "time": "<time/date in dd-mm-yyyy format>",
  // IF content_type is "image_generation", include:
  "image_generation_prompt": "<detailed visual prompt>",
  "caption_prompt": "<short, engaging caption for the image>",
  // IF content_type is "post_generation", include:
  "post_generation_prompt": "<comprehensive prompt for generating the post>",
  "caption_prompt": "<short, engaging caption for the post>",
  // Include scheduled_user_list only if users are mentioned
}

Rules:
- content_type: Set to "image_generation" if scheduling an image; otherwise "post_generation".
- For "image_generation": Include "intent", "content_type", "time", "image_generation_prompt", and "caption_prompt". (OMIT post_generation_prompt).
- For "post_generation": Include "intent", "content_type", "time", "post_generation_prompt", and "caption_prompt". (OMIT image_generation_prompt).
- Do NOT return null for missing fields; omit them entirely.
- time: Use mentioned time or default to tomorrow's date in dd-mm-yyyy format.
- scheduled_user_list: Include ONLY if users are mentioned. Structure: [{"name": "...", "email": "...", "time": "..."}].
- Never invent information not provided in the user message.\n\n------------------------------------\nAMBIGUITY HANDLING\n------------------------------------\n\nIf the input involves both creation and planning:\n- Choose the primary user intention
- Prefer \"schedule\" only if time/coordination is central
- Otherwise choose \"create\"

Never return \"unknown\".
Never return both intents.

------------------------------------\nINPUT\n------------------------------------\nUser message will be provided below.`,
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