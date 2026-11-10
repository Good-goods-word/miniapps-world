
const TELEGRAM_API = "https://api.telegram.org";
const WEBSITE_URL = "https://miniapps-world.lildavid5h.workers.dev/";

const AI_MODEL = "@cf/zai-org/glm-4.7-flash";
const WHISPER_MODEL = "@cf/openai/whisper-large-v3-turbo";
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const MAX_HISTORY_MESSAGES = 12;
const MEMORY_TTL = 60 * 60 * 24 * 30;
const MAX_VOICE_SIZE = 20 * 1024 * 1024;

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
          "Send me a text message or a Telegram voice note and let's chat!",
          env
        );

        return new Response("OK");
      }

      const command = text
        .split(/\s+/)[0]
        .split("@")[0]
        .toLowerCase();

      // TEMPORARY VISION LICENCE ACCEPTANCE
      if (command === "/acceptvision") {
        if (!env.AI) {
          throw new Error("Workers AI binding is missing.");
        }

        await sendMessage(
          chatId,
          "⏳ Checking the vision model licence...",
          env
        );

        try {
          const result = await env.AI.run(VISION_MODEL, {
            prompt: "agree"
          });

          console.log(
            "Vision model acceptance response:",
            result
          );

          await sendMessage(
            chatId,
            "✅ The vision model request completed. We can now test image understanding.",
            env
          );
        } catch (error) {
          const errorMessage = String(
            error.message || error
          );

          console.error(
            "Vision model response:",
            errorMessage
          );

          if (
            errorMessage.includes("5016") &&
            errorMessage.toLowerCase().includes(
              "thank you for agreeing"
            )
          ) {
            await sendMessage(
              chatId,
              "✅ Cloudflare has confirmed that you accepted the vision model terms. The model is now available.",
              env
            );
          } else {
            await sendMessage(
              chatId,
              `❌ Vision model request failed: ${errorMessage}`,
              env
            );
          }
        }

        return new Response("OK");
      }

      // START
      if (command === "/start") {
        await sendMessage(
          chatId,
          `Welcome to My Mini Apps Hub! 🚀

I'm your AI assistant.

You can chat with me naturally, ask questions, get help with writing, explore useful tools and send me voice notes.

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

You can send normal text messages or Telegram voice notes.

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

      // CHECK CLOUDFLARE AI AND MEMORY
      if (!env.AI || !env.CHAT_MEMORY) {
        throw new Error(
          "Cloudflare AI or CHAT_MEMORY is not configured."
        );
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
      console.error("Bot error:", error);

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

  // DOWNLOAD VOICE NOTE
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

  // CONVERT AUDIO TO BASE64
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

  // TRANSCRIBE USING WHISPER
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
// CLOUDFLARE AI + CONVERSATION MEMORY
// ==========================================

async function getAIReply(userText, userId, env) {
  if (!env.AI) {
    throw new Error(
      "Cloudflare Workers AI binding is missing."
    );
  }

  if (!env.CHAT_MEMORY) {
    throw new Error(
      "CHAT_MEMORY KV binding is missing."
    );
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
      console.error(
        "Memory loading error:",
        error
      );
    }
  }

  // PREPARE AI MESSAGES
  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    ...history,
    {
      role: "user",
      content: userText
    }
  ];

  let result;

  try {
    result = await env.AI.run(AI_MODEL, {
      messages,
      max_tokens: 800
    });
  } catch (error) {
    console.error(
      "Cloudflare Workers AI error:",
      error
    );

    throw new Error(
      `Cloudflare AI request failed: ${error.message}`
    );
  }

  // EXTRACT AI RESPONSE
  const answer = (
    result?.response ||
    result?.output_text ||
    result?.choices?.[0]?.message?.content ||
    ""
  ).trim();

  if (!answer) {
    console.error(
      "Cloudflare AI returned no text:",
      result
    );

    throw new Error(
      "Cloudflare AI returned an empty response."
    );
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
