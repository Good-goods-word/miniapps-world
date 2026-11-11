
const TELEGRAM_API = "https://api.telegram.org";
const WEBSITE_URL = "https://miniapps-world.lildavid5h.workers.dev/";

const AI_MODEL = "@cf/zai-org/glm-4.7-flash";
const WHISPER_MODEL = "@cf/openai/whisper-large-v3-turbo";
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const MAX_HISTORY_MESSAGES = 12;
const MEMORY_TTL = 60 * 60 * 24 * 30;
const MAX_VOICE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const SYSTEM_PROMPT = `
You are My Mini Apps Hub Assistant, a friendly, intelligent and helpful AI assistant.

LANGUAGE AND COMMUNICATION:
- Understand and communicate naturally in Nigerian Pidgin English.
- Understand Nigerian English, including common Nigerian expressions and slang.
- Understand standard English and other languages.
- Reply in the language or style the user uses.
- If a user speaks Pidgin, respond naturally in Pidgin.
- Do not mock, misunderstand or unnecessarily correct Nigerian expressions.
- Be patient with spelling mistakes, informal grammar and voice transcription errors.
- If something is unclear, politely ask what the user means.

YOUR ABILITIES:
- Answer questions and explain things.
- Help with writing, ideas, technology and learning.
- Assist with everyday tasks and problem-solving.
- Have natural conversations and remember relevant conversation context.
- Help users understand how to use My Mini Apps Hub.

BEHAVIOUR:
- Be conversational, clear, respectful and useful.
- Keep answers reasonably concise unless the user requests detail.
- Explain technical instructions in simple steps.
- Never pretend you have performed an action you cannot perform.
- Never claim that an unsupported feature is available.
- You are part of My Mini Apps Hub.
`;

export default {
  async fetch(request, env) {
    // HEALTH CHECK
    if (request.method === "GET") {
      return Response.json({
        name: "My Mini Apps Hub Telegram Bot",
        status: "online"
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405
      });
    }

    // VERIFY TELEGRAM WEBHOOK SECRET
    if (
      env.WEBHOOK_SECRET &&
      request.headers.get("X-Telegram-Bot-Api-Secret-Token") !==
        env.WEBHOOK_SECRET
    ) {
      return new Response("Unauthorized", {
        status: 403
      });
    }

    let update;

    try {
      update = await request.json();
    } catch {
      return new Response("Invalid request", {
        status: 400
      });
    }

    try {
      // HANDLE BUTTON CALLBACKS
      if (update.callback_query) {
        await answerCallback(update.callback_query, env);
        return new Response("OK");
      }

      const message = update.message;

      if (!message || !message.chat || !message.from) {
        return new Response("OK");
      }

      const chatId = message.chat.id;
      const userId = message.from.id;

      let text = (message.text || "").trim();

      // HANDLE TELEGRAM IMAGES
      const imageDocument =
        message.document &&
        typeof message.document.mime_type === "string" &&
        message.document.mime_type.startsWith("image/");

      if (
        (message.photo && message.photo.length > 0) ||
        imageDocument
      ) {
        if (!env.AI || !env.TELEGRAM_BOT_TOKEN) {
          throw new Error("Cloudflare AI or Telegram token is missing.");
        }

        let fileId;
        let fileSize;
        let mimeType;

        if (message.photo && message.photo.length > 0) {
          const photo = message.photo[message.photo.length - 1];

          fileId = photo.file_id;
          fileSize = photo.file_size;
          mimeType = "image/jpeg";
        } else {
          fileId = message.document.file_id;
          fileSize = message.document.file_size;
          mimeType = message.document.mime_type;
        }

        const allowedImageTypes = [
          "image/jpeg",
          "image/png",
          "image/webp"
        ];

        if (!allowedImageTypes.includes(mimeType)) {
          await sendMessage(
            chatId,
            "Please send a JPEG, PNG or WebP image.",
            env
          );

          return new Response("OK");
        }

        if (fileSize && fileSize > MAX_IMAGE_SIZE) {
          await sendMessage(
            chatId,
            "That image is too large. Please send an image smaller than 10 MB.",
            env
          );

          return new Response("OK");
        }

        await sendMessage(
          chatId,
          "🖼️ Looking at your picture...",
          env
        );

        const answer = await analyzeTelegramImage(
          fileId,
          mimeType,
          message.caption || "Describe this image and explain what you can see.",
          env
        );

        await sendLongMessage(chatId, answer, env);

        return new Response("OK");
      }

      // HANDLE TELEGRAM VOICE NOTES
      if (message.voice) {
        if (!env.AI) {
          throw new Error("Cloudflare AI binding is missing.");
        }

        if (!env.TELEGRAM_BOT_TOKEN) {
          throw new Error("Telegram bot token is missing.");
        }

        if (
          message.voice.file_size &&
          message.voice.file_size > MAX_VOICE_SIZE
        ) {
          await sendMessage(
            chatId,
            "That voice note is too large. Please send one smaller than 20 MB.",
            env
          );

          return new Response("OK");
        }

        await sendMessage(
          chatId,
          "🎧 Listening to your voice note...",
          env
        );

        text = await transcribeTelegramVoice(
          message.voice.file_id,
          env
        );

        if (!text) {
          await sendMessage(
            chatId,
            "I couldn't understand that voice note. Please try recording it again.",
            env
          );

          return new Response("OK");
        }

        await sendMessage(
          chatId,
          `📝 I heard: ${text}`,
          env
        );
      }

      // HANDLE EMPTY MESSAGES
      if (!text) {
        await sendMessage(
          chatId,
          "Send me a text message, an image or a Telegram voice note and let's chat!",
          env
        );

        return new Response("OK");
      }

      const command = text
        .split(/\s+/)[0]
        .split("@")[0]
        .toLowerCase();

      // START
      if (command === "/start") {
        await sendMessage(
          chatId,
          `Welcome to My Mini Apps Hub! 🚀

I'm your AI assistant.

You can chat with me naturally, ask questions, get help with writing, explore useful tools, send voice notes and share pictures for me to understand.

I understand English and Nigerian Pidgin.

Try sending me a message!

Use /help to see my commands.`,
          env
        );

        return new Response("OK");
      }

      // HELP
      if (command === "/help") {
        await sendMessage(
          chatId,
          `MY MINI APPS HUB — HELP

/start — Start the bot
/help — Get help
/apps — Explore mini apps
/profile — View your profile
/settings — Bot settings
/about — About this bot
/forget — Clear your saved conversation

You can send:
• Normal text messages
• Telegram voice notes
• JPEG, PNG and WebP images

You can chat in English, Nigerian English or Pidgin. 🤖`,
          env
        );

        return new Response("OK");
      }

      // APPS
      if (command === "/apps") {
        await sendMessage(
          chatId,
          `Explore My Mini Apps Hub! 🚀

Open the hub here:
${WEBSITE_URL}

Discover useful tools and mini applications.`,
          env
        );

        return new Response("OK");
      }

      // PROFILE
      if (command === "/profile") {
        const name = [
          message.from.first_name,
          message.from.last_name
        ].filter(Boolean).join(" ");

        const username = message.from.username
          ? `@${message.from.username}`
          : "No username set";

        await sendMessage(
          chatId,
          `YOUR PROFILE 👤

Name: ${name || "Telegram user"}
Username: ${username}

You're using My Mini Apps Hub.`,
          env
        );

        return new Response("OK");
      }

      // SETTINGS
      if (command === "/settings") {
        await sendMessage(
          chatId,
          `BOT SETTINGS ⚙️

AI chat: Enabled
Voice note transcription: Enabled
Image understanding: Enabled
Conversation memory: Enabled
Memory expiry: 30 days
Language support: English and Nigerian Pidgin

Use /forget whenever you want to clear your saved conversation.`,
          env
        );

        return new Response("OK");
      }

      // ABOUT
      if (command === "/about") {
        await sendMessage(
          chatId,
          `ABOUT MY MINI APPS HUB 🚀

Your personal gateway to useful digital tools, smart assistance and mini applications.

Explore tools, ask questions and enjoy a growing collection of digital services.

ONE HUB. MANY POSSIBILITIES.`,
          env
        );

        return new Response("OK");
      }

      // FORGET
      if (command === "/forget") {
        if (!env.CHAT_MEMORY) {
          throw new Error("CHAT_MEMORY KV binding is missing.");
        }

        await env.CHAT_MEMORY.delete(`user:${userId}`);

        await sendMessage(
          chatId,
          "Your saved conversation has been cleared. We can start fresh! 🧹",
          env
        );

        return new Response("OK");
      }

      // UNKNOWN COMMAND
      if (text.startsWith("/")) {
        await sendMessage(
          chatId,
          "I don't recognise that command. Send /help to see the available commands.",
          env
        );

        return new Response("OK");
      }

      // CHECK CONVERSATION MEMORY
      if (!env.CHAT_MEMORY) {
        throw new Error("CHAT_MEMORY KV binding is missing.");
      }

      // PROCESS AI CHAT
      await sendMessage(
        chatId,
        "Thinking... 🤔",
        env
      );

      const answer = await getAIReply(
        text,
        userId,
        env
      );

      await sendLongMessage(
        chatId,
        answer,
        env
      );

      return new Response("OK");

    } catch (error) {
      // IMPROVED ERROR LOGGING
      console.error("BOT ERROR DETAILS:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });

      const chatId = update?.message?.chat?.id;

      if (chatId) {
        await sendMessage(
          chatId,
          "Sorry, something went wrong. Please try again in a moment.",
          env
        ).catch(() => {});
      }

      return new Response("OK");
    }
  }
};


// ==========================================
// TELEGRAM IMAGE UNDERSTANDING
// ==========================================

async function analyzeTelegramImage(fileId, mimeType, prompt, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.AI) {
    throw new Error("Telegram token or Cloudflare AI is missing.");
  }

  const infoResponse = await fetch(
    `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
  );

  if (!infoResponse.ok) {
    throw new Error("Could not get image information from Telegram.");
  }

  const info = await infoResponse.json();

  if (!info.ok || !info.result?.file_path) {
    throw new Error("Telegram did not return a valid image file.");
  }

  const fileUrl =
    `${TELEGRAM_API}/file/bot${env.TELEGRAM_BOT_TOKEN}/${info.result.file_path}`;

  const imageResponse = await fetch(fileUrl);

  if (!imageResponse.ok) {
    throw new Error("Could not download the Telegram image.");
  }

  const imageBuffer = await imageResponse.arrayBuffer();

  if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
    throw new Error("Image exceeds the 10 MB processing limit.");
  }

  const bytes = new Uint8Array(imageBuffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + 8192, bytes.length))
    );
  }

  const imageData =
    `data:${mimeType};base64,${btoa(binary)}`;

  const result = await env.AI.run(VISION_MODEL, {
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          },
          {
            type: "image_url",
            image_url: {
              url: imageData
            }
          }
        ]
      }
    ],
    max_tokens: 800
  });

  const answer = (
    result?.response ||
    result?.output_text ||
    result?.choices?.[0]?.message?.content ||
    ""
  ).trim();

  if (!answer) {
    throw new Error("The vision model returned an empty response.");
  }

  return answer;
}


// ==========================================
// TELEGRAM VOICE NOTE TRANSCRIPTION
// ==========================================

async function transcribeTelegramVoice(fileId, env) {
  const infoResponse = await fetch(
    `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
  );

  if (!infoResponse.ok) {
    throw new Error(
      "Could not get voice note information from Telegram."
    );
  }

  const info = await infoResponse.json();

  if (!info.ok || !info.result?.file_path) {
    throw new Error(
      "Telegram did not return a valid voice file."
    );
  }

  const fileUrl =
    `${TELEGRAM_API}/file/bot${env.TELEGRAM_BOT_TOKEN}/${info.result.file_path}`;

  const audioResponse = await fetch(fileUrl);

  if (!audioResponse.ok) {
    throw new Error(
      "Could not download the Telegram voice note."
    );
  }

  const audioBuffer = await audioResponse.arrayBuffer();

  if (audioBuffer.byteLength > MAX_VOICE_SIZE) {
    throw new Error(
      "Voice note exceeds the 20 MB download limit."
    );
  }

  const bytes = new Uint8Array(audioBuffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + 8192, bytes.length)
    );

    binary += String.fromCharCode(...chunk);
  }

  const audioBase64 = btoa(binary);

  const result = await env.AI.run(WHISPER_MODEL, {
    audio: audioBase64,
    task: "transcribe"
  });

  const transcript = (
    result?.text ||
    result?.transcription ||
    ""
  ).trim();

  if (!transcript) {
    throw new Error(
      "Whisper could not produce a transcription."
    );
  }

  return transcript;
}


// ==========================================
// TAVILY WEB SEARCH
// ==========================================

async function searchWeb(query, env) {
  if (!env.TAVILY_API_KEY) {
    throw new Error("Tavily API key is missing.");
  }

  const response = await fetch(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        topic: "general",
        max_results: 5,
        include_answer: false,
        include_raw_content: false
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Tavily search error:", data);
    throw new Error("Web search failed.");
  }

  return (data.results || []).map((item, index) => ({
    number: index + 1,
    title: item.title,
    url: item.url,
    content: item.content
  }));
}


// ==========================================
// CLOUDFLARE AI + GEMINI BACKUP + MEMORY
// ==========================================

async function getAIReply(userText, userId, env) {
  if (!env.CHAT_MEMORY) {
    throw new Error("CHAT_MEMORY KV binding is missing.");
  }

  const memoryKey = `user:${userId}`;

  // LOAD SAVED CONVERSATION
  let history = [];

  const saved = await env.CHAT_MEMORY.get(memoryKey);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        history = parsed.filter(
          item =>
            item &&
            ["user", "assistant"].includes(item.role) &&
            typeof item.content === "string"
        );
      }
    } catch (error) {
      console.error("Memory loading error:", error);
    }
  }

  let answer = "";

  // OPTIONAL WEB RESEARCH
  let researchContext = "";

  const needsWebSearch =
    /\b(search|look up|research|latest|current|today|recent|news|price|who is|what happened|2026)\b/i.test(userText);

  if (needsWebSearch && env.TAVILY_API_KEY) {
    try {
      const searchResults = await searchWeb(userText, env);

      researchContext = searchResults
        .map(item =>
          `[${item.number}] ${item.title}\n${item.content}\nSource: ${item.url}`
        )
        .join("\n\n");

    } catch (searchError) {
      console.error("Web search failed:", searchError);
    }
  }

  // PRIMARY AI: CLOUDFLARE WORKERS AI
  try {
    if (!env.AI) {
      throw new Error("Cloudflare AI binding is missing.");
    }

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      ...history,
      {
        role: "user",
        content: researchContext
          ? `${userText}\n\nWEB RESEARCH RESULTS:\n${researchContext}\n\nUse these sources to answer accurately. Include the source URLs in your response.`
          : userText
      }
    ];

    const result = await env.AI.run(AI_MODEL, {
      messages,
      max_tokens: 800
    });

    answer = (
      result?.response ||
      result?.output_text ||
      result?.choices?.[0]?.message?.content ||
      ""
    ).trim();

    if (!answer) {
      throw new Error("Cloudflare AI returned an empty response.");
    }

    console.log("Reply generated using Cloudflare AI.");

  } catch (cloudflareError) {
    console.error("Cloudflare AI failed:", cloudflareError);

    // BACKUP AI: GOOGLE GEMINI
    if (!env.GEMINI_API_KEY) {
      throw new Error(
        "Cloudflare AI failed and Gemini API key is missing."
      );
    }

    console.log("Trying Gemini backup...");

    const contents = history.map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: item.content
        }
      ]
    }));

    contents.push({
      role: "user",
      parts: [
        {
          text: researchContext
            ? `${userText}\n\nWEB RESEARCH RESULTS:\n${researchContext}\n\nUse these sources to answer accurately. Include the source URLs in your response.`
            : userText
        }
      ]
    });

    const geminiResponse = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: SYSTEM_PROMPT
              }
            ]
          },
          contents,
          generationConfig: {
            maxOutputTokens: 800
          }
        })
      }
    );

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", geminiData);

      throw new Error(
        `Gemini backup failed with status ${geminiResponse.status}.`
      );
    }

    answer = (
      geminiData?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || ""
    ).trim();

    if (!answer) {
      throw new Error("Gemini returned an empty response.");
    }

    console.log("Reply generated using Gemini backup.");
  }

  // SAVE CONVERSATION
  const updatedHistory = [
    ...history,
    {
      role: "user",
      content: userText
    },
    {
      role: "assistant",
      content: answer
    }
  ].slice(-MAX_HISTORY_MESSAGES);

  await env.CHAT_MEMORY.put(
    memoryKey,
    JSON.stringify(updatedHistory),
    {
      expirationTtl: MEMORY_TTL
    }
  );

  return answer;
}


// ==========================================
// SEND TELEGRAM MESSAGE
// ==========================================

async function sendMessage(chatId, text, env) {
  const response = await fetch(
    `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    }
  );

  if (!response.ok) {
    console.error(
      "Telegram send error:",
      await response.text()
    );
  }
}


// ==========================================
// SEND LONG MESSAGES
// ==========================================

async function sendLongMessage(chatId, text, env) {
  const limit = 4000;

  for (let i = 0; i < text.length; i += limit) {
    await sendMessage(
      chatId,
      text.slice(i, i + limit),
      env
    );
  }
}


// ==========================================
// ANSWER TELEGRAM BUTTON CALLBACKS
// ==========================================

async function answerCallback(callback, env) {
  const response = await fetch(
    `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        callback_query_id: callback.id
      })
    }
  );

  if (!response.ok) {
    console.error(
      "Telegram callback error:",
      await response.text()
    );
  }
}
