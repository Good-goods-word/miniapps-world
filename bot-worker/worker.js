const TELEGRAM_API = "https://api.telegram.org";
const OPENAI_API = "https://api.openai.com/v1/responses";
const WEBSITE_URL = "https://miniapps-world.lildavid5h.workers.dev/";

const MODEL = "gpt-4.1-mini";
const MAX_HISTORY_MESSAGES = 12;
const MEMORY_TTL = 60 * 60 * 24 * 30;

const SYSTEM_PROMPT = `
You are My Mini Apps Hub Assistant, a friendly and helpful AI assistant.
You can answer questions, explain things, help with writing, ideas,
technology, learning, and everyday tasks.

Be conversational, clear, respectful, and useful.
Keep answers reasonably concise unless the user requests detail.
You are part of My Mini Apps Hub.
Do not claim to perform actions you cannot actually perform.
`;

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return Response.json({
        name: "My Mini Apps Hub Telegram Bot",
        status: "online"
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (
      env.WEBHOOK_SECRET &&
      request.headers.get("X-Telegram-Bot-Api-Secret-Token") !==
        env.WEBHOOK_SECRET
    ) {
      return new Response("Unauthorized", { status: 403 });
    }

    let update;

    try {
      update = await request.json();
    } catch {
      return new Response("Invalid request", { status: 400 });
    }

    try {
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
      const text = (message.text || "").trim();

      if (!text) {
        await sendMessage(
          chatId,
          "I can read text messages for now. Send me a message and let's chat!",
          env
        );
        return new Response("OK");
      }

      const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();

      if (command === "/start") {
        await sendMessage(
          chatId,
          `Welcome to My Mini Apps Hub! 🚀

I'm your personal AI assistant.

You can chat with me naturally, ask questions, get help with writing, explore useful tools, and more.

Try sending me a message!

Use /help to see my commands.`,
          env
        );
        return new Response("OK");
      }

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

You can also send me any ordinary message to start an AI conversation. 🤖`,
          env
        );
        return new Response("OK");
      }

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

      if (command === "/settings") {
        await sendMessage(
          chatId,
          `BOT SETTINGS ⚙️

AI chat: Enabled
Conversation memory: Enabled
Memory expiry: 30 days

Use /forget whenever you want to clear your saved conversation.`,
          env
        );
        return new Response("OK");
      }

      if (command === "/about") {
        await sendMessage(
          chatId,
          `ABOUT MY MINI APPS HUB 🚀

Your personal gateway to useful digital tools, smart assistance, and mini applications.

Explore tools, ask questions, and enjoy a growing collection of digital services.

ONE HUB. MANY POSSIBILITIES.`,
          env
        );
        return new Response("OK");
      }

      if (command === "/forget") {
        await env.CHAT_MEMORY.delete(`user:${userId}`);

        await sendMessage(
          chatId,
          "Your saved conversation has been cleared. We can start fresh! 🧹",
          env
        );
        return new Response("OK");
      }

      if (text.startsWith("/")) {
        await sendMessage(
          chatId,
          "I don't recognise that command. Send /help to see the available commands.",
          env
        );
        return new Response("OK");
      }

      if (!env.OPENAI_API_KEY || !env.CHAT_MEMORY) {
        await sendMessage(
          chatId,
          "The AI service is not fully configured yet. Please try again later.",
          env
        );
        return new Response("OK");
      }

      await sendMessage(chatId, "Thinking... 🤔", env);

      const answer = await getAIReply(text, userId, env);

      await sendLongMessage(chatId, answer, env);

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


async function getAIReply(userText, userId, env) {
  if (!env.AI) {
    throw new Error("Cloudflare Workers AI binding is missing.");
  }

  if (!env.CHAT_MEMORY) {
    throw new Error("CHAT_MEMORY KV binding is missing.");
  }

  const memoryKey = `user:${userId}`;

  let history = [];
  const saved = await env.CHAT_MEMORY.get(memoryKey);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        history = parsed;
      }
    } catch (error) {
      console.error("Memory loading error:", error);
    }
  }

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
    result = await env.AI.run(
      "@cf/zai-org/glm-4.7-flash",
      {
        messages,
        max_tokens: 1200
      }
    );
  } catch (error) {
    console.error("Cloudflare Workers AI error:", error);
    throw new Error(`Cloudflare AI request failed: ${error.message}`);
  }

  const answer = (
    result?.response ||
    result?.output_text ||
    ""
  ).trim();

  if (!answer) {
    console.error("Cloudflare AI returned no text:", result);
    throw new Error("Cloudflare AI returned an empty response.");
  }

  const updatedHistory = [
    ...history,
    { role: "user", content: userText },
    { role: "assistant", content: answer }
  ].slice(-MAX_HISTORY_MESSAGES);

  await env.CHAT_MEMORY.put(
    memoryKey,
    JSON.stringify(updatedHistory),
    { expirationTtl: MEMORY_TTL }
  );

  return answer;
}
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


async function answerCallback(callback, env) {
  await fetch(
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
}
