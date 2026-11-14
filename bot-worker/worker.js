const TELEGRAM_API = "https://api.telegram.org";
const WEBSITE_URL = "https://miniapps-world.lildavid5h.workers.dev/";

// AI MODELS
const PRIMARY_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const FALLBACK_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const WHISPER_MODEL = "@cf/openai/whisper";
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const GEMINI_MODEL = "gemini-3.8-flash";
const IMAGE_GEN_MODEL = "@cf/black-forest-labs/flux-1-schnell";

// LIMITS
const MAX_HISTORY_MESSAGES = 6;
const MEMORY_TTL = 60 * 60 * 24 * 30;
const MAX_VOICE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_WEB_RESULTS = 6;
const TELEGRAM_MESSAGE_LIMIT = 3900;
const LINK_FETCH_TIMEOUT = 8000;
const TAVILY_TIMEOUT = 8000;
const GEMINI_TIMEOUT = 20000;
const WORKERS_AI_TIMEOUT = 20000;

const SYSTEM_PROMPT = `...`; // unchanged — keep your existing prompt

// ==========================================
// FETCH WITH TIMEOUT
// ==========================================

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ==========================================
// REPLY CONTEXT
// ==========================================

function buildReplyContext(replyTo) {
  if (!replyTo) return "";

  if (replyTo.text) {
    return `\n\n[The user is replying to this earlier message]\n${replyTo.text.slice(0, 800)}`;
  }

  if (replyTo.caption) {
    return `\n\n[The user is replying to an image with this caption]\n${replyTo.caption.slice(0, 800)}`;
  }

  if (replyTo.photo) {
    return `\n\n[The user is replying to an image that has no caption]`;
  }

  return "";
}

// ==========================================
// TELEGRAM SEND PHOTO
// ==========================================

async function sendPhoto(chatId, base64, caption, env) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing.");
  }

  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "image/jpeg" });

  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", String(caption || "").slice(0, 1000));
  form.append("photo", blob, "image.jpg");

  const response = await fetchWithTimeout(
    `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
    { method: "POST", body: form },
    30000
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram sendPhoto failed: ${response.status} ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram rejected the photo: ${data.description || "Unknown error"}`);
  }

  return data;
}

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return Response.json({ name: "My Mini Apps Hub Telegram Bot", status: "online" });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (
      env.WEBHOOK_SECRET &&
      request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET
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

      if (message.from.is_bot) {
        return new Response("OK");
      }

      const chatId = message.chat.id;
      const userId = message.from.id;

      // Private birthday greeting for the creator only.
      try {
        const CREATOR_USER_ID = 8905006544;
        const now = new Date(Date.now() + 60 * 60 * 1000); // WAT = UTC+1
        const isBirthday = now.getUTCMonth() === 10 && now.getUTCDate() === 17;
        const alreadyGreeted = await env.CHAT_MEMORY.get(`birthday:${userId}`);

        if (userId === CREATOR_USER_ID && isBirthday && !alreadyGreeted) {
          await sendMessage(chatId, "Happy birthday, Genesis! 🎂 Wishing you a great one.", env);
          await env.CHAT_MEMORY.put(`birthday:${userId}`, "1", { expirationTtl: 60 * 60 * 24 * 2 });
        }
      } catch (error) {
        console.error("BIRTHDAY CHECK ERROR:", error?.message);
      }

      let text = (message.text || "").trim();
      const replyContext = buildReplyContext(message.reply_to_message);

      const imageDocument = Boolean(
        message.document &&
        typeof message.document.mime_type === "string" &&
        message.document.mime_type.startsWith("image/")
      );

      // ---------- IMAGE PATH ----------
      if ((message.photo && message.photo.length > 0) || imageDocument) {
        if (!env.AI || !env.TELEGRAM_BOT_TOKEN) {
          throw new Error("Cloudflare AI or Telegram token is missing for image analysis.");
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

        if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
          await sendMessage(chatId, "Please send a JPEG, PNG or WebP image.", env);
          return new Response("OK");
        }

        if (fileSize && fileSize > MAX_IMAGE_SIZE) {
          await sendMessage(chatId, "That image is too large. Please send an image smaller than 10 MB.", env);
          return new Response("OK");
        }

        await sendChatAction(chatId, "typing", env);

        const caption = (
          (message.caption || "").trim() ||
          "Describe this image and explain what you can see."
        );

        const answer = await analyzeTelegramImage(fileId, mimeType, caption + replyContext, userId, env);
        await sendLongMessage(chatId, answer, env);
        return new Response("OK");
      }

      // ---------- VOICE PATH ----------
      if (message.voice) {
        if (!env.AI || !env.TELEGRAM_BOT_TOKEN) {
          throw new Error("Cloudflare AI or Telegram token is missing for voice transcription.");
        }

        if (message.voice.file_size && message.voice.file_size > MAX_VOICE_SIZE) {
          await sendMessage(chatId, "That voice note is too large. Please send one smaller than 20 MB.", env);
          return new Response("OK");
        }

        await sendChatAction(chatId, "typing", env);

        text = await transcribeTelegramVoice(message.voice.file_id, env);

        if (!text) {
          await sendMessage(chatId, "I couldn't understand that voice note. Please try recording it again.", env);
          return new Response("OK");
        }
        // FIX: no "📝 I heard: ..." echo — the answer stands alone.
      }

      if (!text) {
        await sendMessage(chatId, "Send me a text message, an image or a Telegram voice note and let's chat!", env);
        return new Response("OK");
      }

      // ---------- COMMANDS ----------
      const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();

      if (command === "/start") {
        await sendMessage(chatId, `Welcome to My Mini Apps Hub! 🚀

I'm your AI assistant.

You can chat with me naturally, ask questions, get help with writing, explore useful tools, send voice notes, share pictures for me to understand, and send links for me to look at.

I understand English and Nigerian Pidgin.

Try sending me a message!

Use /help to see my commands.`, env);
        return new Response("OK");
      }

      if (command === "/help") {
        await sendMessage(chatId, `MY MINI APPS HUB — HELP

/start — Start the bot
/help — Get help
/apps — Explore mini apps
/imagine — Make an image from a description
/profile — View your profile
/settings — Bot settings
/about — About this bot
/forget — Clear your saved conversation

You can send:
• Normal text messages
• Telegram voice notes
• JPEG, PNG and WebP images
• Links to social media posts and pages

If I can't open a link (TikTok and Instagram often block me), send a screenshot instead and I'll read it.

You can chat in English, Nigerian English or Pidgin. 🤖`, env);
        return new Response("OK");
      }

      if (command === "/apps") {
        await sendMessage(chatId, `Explore My Mini Apps Hub! 🚀

Open the hub here:
${WEBSITE_URL}

Discover useful tools and mini applications.`, env);
        return new Response("OK");
      }

      if (command === "/profile") {
        const name = [message.from.first_name, message.from.last_name].filter(Boolean).join(" ");
        const username = message.from.username ? `@${message.from.username}` : "No username set";

        await sendMessage(chatId, `YOUR PROFILE 👤

Name: ${name || "Telegram user"}
Username: ${username}

You're using My Mini Apps Hub.`, env);
        return new Response("OK");
      }

      if (command === "/settings") {
        const settings = [
          // FIX: parentheses prevent leaking the raw API key.
          `AI chat: ${(env.GEMINI_API_KEY || env.AI) ? "Available" : "Not configured"}`,
          `Voice transcription: ${env.AI ? "Available" : "Not configured"}`,
          `Image understanding: ${env.AI ? "Available" : "Not configured"}`,
          `Image generation: ${env.AI ? "Available" : "Not configured"}`,
          `Conversation memory: ${env.CHAT_MEMORY ? "Available" : "Not configured"}`,
          `Memory expiry: 30 days`,
          `Web research: ${env.TAVILY_API_KEY ? "Available when needed" : "Not configured"}`,
          `Link reading: Available`,
          "Language support: English and Nigerian Pidgin"
        ];

        await sendMessage(chatId, `BOT SETTINGS ⚙️

${settings.join("\n")}

Use /forget whenever you want to clear your saved conversation.`, env);
        return new Response("OK");
      }

      if (command === "/about") {
        await sendMessage(chatId, `ABOUT MY MINI APPS HUB 🚀

Your personal gateway to useful digital tools, smart assistance and mini applications.

Explore tools, ask questions and enjoy a growing collection of digital services.

ONE HUB. MANY POSSIBILITIES.`, env);
        return new Response("OK");
      }

      if (command === "/imagine") {
        if (!env.AI) {
          await sendMessage(chatId, "Image generation is not configured.", env);
          return new Response("OK");
        }

        const prompt = text.replace(/^\/imagine(@\S+)?\s*/i, "").trim();

        if (!prompt) {
          await sendMessage(chatId, "Send it like this:\n/imagine a red bicycle in the rain", env);
          return new Response("OK");
        }

        await sendChatAction(chatId, "upload_photo", env);

        try {
          const result = await env.AI.run(IMAGE_GEN_MODEL, {
            prompt: prompt.slice(0, 2000),
            steps: 8,
            seed: Math.floor(Math.random() * 2147483647)
          });

          if (!result?.image) {
            throw new Error("No image returned.");
          }

          await sendPhoto(chatId, result.image, `🎨 ${prompt}`.slice(0, 1000), env);
        } catch (error) {
          console.error("IMAGE GEN ERROR:", error?.message);
          await sendMessage(chatId, "I couldn't make that image. Try a different description.", env);
        }

        return new Response("OK");
      }

      if (command === "/forget") {
        if (!env.CHAT_MEMORY) {
          throw new Error("CHAT_MEMORY KV binding is missing.");
        }

        await env.CHAT_MEMORY.delete(`user:${userId}`);
        await sendMessage(chatId, "Your saved conversation has been cleared. We can start fresh! 🧹", env);
        return new Response("OK");
      }

      if (text.startsWith("/")) {
        await sendMessage(chatId, "I don't recognise that command. Send /help to see the available commands.", env);
        return new Response("OK");
      }

      if (!env.CHAT_MEMORY) {
        throw new Error("CHAT_MEMORY KV binding is missing.");
      }

      // ---------- LINK PATH ----------
      const detectedUrl = extractFirstUrl(text);

      if (detectedUrl) {
        await sendChatAction(chatId, "typing", env);
        // FIX: pass replyContext separately so it isn't duplicated in the prompt.
        const linkAnswer = await handleLinkMessage(detectedUrl, text, replyContext, userId, env);
        await sendLongMessage(chatId, linkAnswer, env);
        return new Response("OK");
      }

      // ---------- TEXT PATH ----------
      await sendChatAction(chatId, "typing", env);
      const answer = await getAIReply(text + replyContext, userId, env);
      await sendLongMessage(chatId, answer, env);

      return new Response("OK");
    } catch (error) {
      console.error("BOT ERROR DETAILS:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });

      const chatId = update?.message?.chat?.id;
      if (chatId) {
        await sendMessage(chatId, `Sorry, something went wrong: ${error?.message || "unknown error"}`, env).catch(() => {});
      }

      return new Response("OK");
    }
  }
};

// ==========================================
// TELEGRAM IMAGE UNDERSTANDING
// ==========================================

async function analyzeTelegramImage(fileId, mimeType, prompt, userId, env) {
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

  const fileUrl = `${TELEGRAM_API}/file/bot${env.TELEGRAM_BOT_TOKEN}/${info.result.file_path}`;
  const imageResponse = await fetch(fileUrl);

  if (!imageResponse.ok) {
    throw new Error("Could not download the Telegram image.");
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
    throw new Error("Image exceeds the 10 MB processing limit.");
  }

  // FIX: chunked base64 — avoids call-stack overflow on large images.
  const bytes = new Uint8Array(imageBuffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }

  const imageData = `data:${mimeType};base64,${btoa(binary)}`;
  const history = await loadConversationHistory(userId, env);

  let answer = "";

  // FIRST ATTEMPT: Workers AI vision model.
  try {
    const result = await env.AI.run(VISION_MODEL, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageData } }
          ]
        }
      ],
      max_tokens: 1200
    });

    answer = extractCloudflareAnswer(result);
  } catch (error) {
    console.error("VISION MODEL ERROR:", error?.message);
  }

  // SECOND ATTEMPT: Gemini vision.
  if (!answer && env.GEMINI_API_KEY) {
    try {
      const base64Only = imageData.split(",")[1];

      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: base64Only } }
                ]
              }
            ],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1200 }
          })
        },
        GEMINI_TIMEOUT
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini vision failed: ${response.status} ${errorText.slice(0, 300)}`);
      }

      const data = await response.json();
      answer = data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n")
        .trim() || "";
    } catch (error) {
      console.error("GEMINI VISION ERROR:", error?.message);
    }
  }

  if (!answer) {
    answer = "I couldn't read that image clearly. Try sending a sharper screenshot, or crop it to the part you want me to look at.";
  }

  try {
    await saveConversationHistory(
      userId,
      [
        ...history,
        { role: "user", content: `[Image] ${prompt}` },
        { role: "assistant", content: answer }
      ],
      env
    );
  } catch (error) {
    console.error("MEMORY SAVE ERROR:", error?.message);
  }

  return answer;
}

// ==========================================
// TELEGRAM VOICE TRANSCRIPTION
// ==========================================

async function transcribeTelegramVoice(fileId, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.AI) {
    throw new Error("Telegram token or Cloudflare AI is missing.");
  }

  const infoResponse = await fetch(
    `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
  );

  if (!infoResponse.ok) {
    throw new Error("Could not get voice note information from Telegram.");
  }

  const info = await infoResponse.json();
  if (!info.ok || !info.result?.file_path) {
    throw new Error("Telegram did not return a valid voice note.");
  }

  if (info.result.file_size && info.result.file_size > MAX_VOICE_SIZE) {
    throw new Error("Voice note exceeds the 20 MB processing limit.");
  }

  const fileUrl = `${TELEGRAM_API}/file/bot${env.TELEGRAM_BOT_TOKEN}/${info.result.file_path}`;
  const audioResponse = await fetch(fileUrl);

  if (!audioResponse.ok) {
    throw new Error("Could not download the voice note.");
  }

  const audioBuffer = await audioResponse.arrayBuffer();
  if (audioBuffer.byteLength > MAX_VOICE_SIZE) {
    throw new Error("Voice note exceeds the 20 MB processing limit.");
  }

  const result = await env.AI.run(WHISPER_MODEL, {
    audio: [...new Uint8Array(audioBuffer)]
  });

  const transcription = result?.text || result?.transcription_info?.text || "";
  return String(transcription).trim();
}

// ==========================================
// LINK HANDLING
// ==========================================

function extractFirstUrl(text) {
  const match = String(text || "").match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0].replace(/[.,;:!?)]+$/, "") : "";
}

async function handleLinkMessage(url, fullText, replyContext, userId, env) {
  const history = await loadConversationHistory(userId, env);
  let pageInfo = null;

  try {
    pageInfo = await fetchPageMetadata(url);
  } catch (error) {
    console.error("LINK FETCH ERROR:", url, error?.message);
  }

  if (!pageInfo || (!pageInfo.title && !pageInfo.description)) {
    let host = "that site";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {}

    const answer = `I couldn't open that ${host} link — the site blocks automated access or requires a login.

Send me a screenshot of the page or profile and I'll read it for you. That works for TikTok, Instagram, Facebook, X, YouTube — anything.`;

    try {
      await saveConversationHistory(
        userId,
        [
          ...history,
          { role: "user", content: fullText },
          { role: "assistant", content: answer }
        ],
        env
      );
    } catch (error) {
      console.error("MEMORY SAVE ERROR:", error?.message);
    }

    return answer;
  }

  const prompt = `The user sent this link: ${url}

Page title: ${pageInfo.title || "Not available"}
Site: ${pageInfo.siteName || "Unknown"}
Description: ${pageInfo.description || "Not available"}
${pageInfo.author ? `Author: ${pageInfo.author}\n` : ""}${pageInfo.publishedTime ? `Published: ${pageInfo.publishedTime}\n` : ""}
User's message: ${fullText}${replyContext || ""}

Explain what this page is, based only on the metadata above. Be clear that you read the page preview, not the full content. If the user asked to verify something and the metadata does not establish it, say so plainly and suggest they send a screenshot instead.`;

  let answer = "";

  if (env.GEMINI_API_KEY) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 700 }
          })
        },
        GEMINI_TIMEOUT
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini link reply failed: ${response.status} ${errorText.slice(0, 300)}`);
      }

      const data = await response.json();
      answer = data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n")
        .trim() || "";
    } catch (error) {
      console.error("LINK AI ERROR:", error?.message);
    }
  }

  if (!answer && env.AI) {
    try {
      const result = await env.AI.run(PRIMARY_AI_MODEL, {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        max_tokens: 700
      });
      answer = extractCloudflareAnswer(result);
    } catch (error) {
      console.error("LINK GEMMA ERROR:", error?.message);
    }
  }

  if (!answer) {
    answer = `I opened the link but could only read its preview:

${pageInfo.title || "No title"}
${pageInfo.description || ""}

${url}`;
  }

  try {
    await saveConversationHistory(
      userId,
      [
        ...history,
        { role: "user", content: fullText },
        { role: "assistant", content: answer }
      ],
      env
    );
  } catch (error) {
    console.error("MEMORY SAVE ERROR:", error?.message);
  }

  return answer;
}

async function fetchPageMetadata(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINK_FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      throw new Error(`Page returned ${response.status}`);
    }

    const html = (await response.text()).slice(0, 300000);

    return {
      title: getMeta(html, "og:title") || getTag(html, "title"),
      description: getMeta(html, "og:description") || getMeta(html, "description"),
      siteName: getMeta(html, "og:site_name"),
      author: getMeta(html, "article:author") || getMeta(html, "author"),
      publishedTime: getMeta(html, "article:published_time")
    };
  } finally {
    clearTimeout(timer);
  }
}

function getMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtml(match[1]).trim();
  }

  return "";
}

function getTag(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeHtml(match[1]).trim() : "";
}

function decodeHtml(text) {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// ==========================================
// AI REPLY (TEXT PATH)
// ==========================================

async function getAIReply(userText, userId, env) {
  const history = await loadConversationHistory(userId, env);
  const needsResearch = shouldResearch(userText);

  let researchBlock = "";

  if (needsResearch && env.TAVILY_API_KEY) {
    try {
      const results = await tavilySearch(userText, env);

      if (results.length > 0) {
        researchBlock =
          "\n\nWEB RESEARCH RESULTS (use only these sources, do not invent URLs):\n" +
          results
            .map(
              (r, i) =>
                `[${i + 1}] ${r.title}\nURL: ${r.url}\nPublished: ${r.published_date || "not provided"}\n${r.content || ""}`
            )
            .join("\n\n");
      }
    } catch (error) {
      console.error("TAVILY ERROR:", error?.message);
    }
  }

  let answer = "";

  // FIRST ATTEMPT: Gemini.
  if (env.GEMINI_API_KEY) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            // FIX: history was previously included twice.
            contents: [
              ...history.map(m => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }]
              })),
              { role: "user", parts: [{ text: userText + researchBlock }] }
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
          })
        },
        GEMINI_TIMEOUT
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini failed: ${response.status} ${errorText.slice(0, 300)}`);
      }

      const data = await response.json();
      answer = data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n")
        .trim() || "";
    } catch (error) {
      console.error("GEMINI ERROR:", error?.message);
    }
  }

  // SECOND ATTEMPT: Workers AI primary model.
  if (!answer && env.AI) {
    try {
      const result = await env.AI.run(PRIMARY_AI_MODEL, {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userText + researchBlock }
        ],
        max_tokens: 1500
      });
      answer = extractCloudflareAnswer(result);
    } catch (error) {
      console.error("PRIMARY AI ERROR:", error?.message);
    }
  }

  // THIRD ATTEMPT: Workers AI fallback model.
  if (!answer && env.AI) {
    try {
      const result = await env.AI.run(FALLBACK_AI_MODEL, {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userText + researchBlock }
        ],
        max_tokens: 1200
      });
      answer = extractCloudflareAnswer(result);
    } catch (error) {

      console.error("FALLBACK AI ERROR:", error?.message);
    }
  }

  if (!answer) {
    answer = "I couldn't put together a reply just now. Please try again in a moment.";
  }

  try {
    await saveConversationHistory(
      userId,
      [
        ...history,
        { role: "user", content: userText },
        { role: "assistant", content: answer }
      ],
      env
    );
  } catch (error) {
    console.error("MEMORY SAVE ERROR:", error?.message);
  }

  return answer;
}

function extractCloudflareAnswer(result) {
  if (!result) return "";

  if (typeof result === "string") return result.trim();

  if (typeof result.response === "string") return result.response.trim();

  if (result.choices?.[0]?.message?.content) {
    return String(result.choices[0].message.content).trim();
  }

  if (result.result?.response) {
    return String(result.result.response).trim();
  }

  return "";
}

// ==========================================
// RESEARCH DECISION
// ==========================================

function shouldResearch(text) {
  const t = String(text || "").toLowerCase();

  // FIX: removed "now", "right now", "rate", "market", "update"
  // — they fired on casual chat and wasted a Tavily call.
  const triggers = [
    "latest", "current", "currently", "today",
    "news", "recent", "recently", "this week", "this month", "this year",
    "price", "prices", "cost", "how much", "exchange rate",
    "who is the president", "who is the governor", "who won", "score",
    "weather", "forecast", "release date", "when is", "when did",
    "trending", "updates", "2025", "2026", "2027",
    "stock", "election", "fixture", "schedule", "deadline"
  ];

  return triggers.some(trigger => t.includes(trigger));
}

// ==========================================
// TAVILY SEARCH
// ==========================================

async function tavilySearch(query, env) {
  const response = await fetchWithTimeout(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        max_results: MAX_WEB_RESULTS,
        include_answer: false,
        include_raw_content: false
      })
    },
    TAVILY_TIMEOUT
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily failed: ${response.status} ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  return Array.isArray(data?.results) ? data.results : [];
}

// ==========================================
// CONVERSATION MEMORY
// ==========================================

async function loadConversationHistory(userId, env) {
  if (!env.CHAT_MEMORY) return [];

  try {
    const raw = await env.CHAT_MEMORY.get(`user:${userId}`);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY_MESSAGES) : [];
  } catch (error) {
    console.error("MEMORY LOAD ERROR:", error?.message);
    return [];
  }
}

async function saveConversationHistory(userId, messages, env) {
  if (!env.CHAT_MEMORY) return;

  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);

  await env.CHAT_MEMORY.put(`user:${userId}`, JSON.stringify(trimmed), {
    expirationTtl: MEMORY_TTL
  });
}

// ==========================================
// TELEGRAM HELPERS
// ==========================================

async function sendMessage(chatId, text, env) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing.");
  }

  const response = await fetchWithTimeout(
    `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        // FIX: no .slice() here — sendLongMessage already chunks safely.
        text: String(text),
        disable_web_page_preview: false
      })
    },
    15000
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${errorText.slice(0, 300)}`);
  }

  return response.json();
}

async function sendLongMessage(chatId, text, env) {
  const clean = String(text || "").trim();
  if (!clean) return;

  if (clean.length <= TELEGRAM_MESSAGE_LIMIT) {
    await sendMessage(chatId, clean, env);
    return;
  }

  const chunks = [];
  let remaining = clean;

  while (remaining.length > 0) {
    let cut = remaining.lastIndexOf("\n", TELEGRAM_MESSAGE_LIMIT);
    // FIX: never allow a zero-length cut, which would loop forever.
    if (cut < TELEGRAM_MESSAGE_LIMIT * 0.5) cut = TELEGRAM_MESSAGE_LIMIT;
    if (cut <= 0) cut = Math.min(TELEGRAM_MESSAGE_LIMIT, remaining.length);

    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }

  for (const chunk of chunks) {
    await sendMessage(chatId, chunk, env);
  }
}

async function sendChatAction(chatId, action, env) {
  try {
    await fetch(
      `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action })
      }
    );
  } catch (error) {
    console.error("CHAT ACTION ERROR:", error?.message);
  }
}

async function answerCallback(callbackQuery, env) {
  if (!callbackQuery?.id) return;

  try {
    await fetch(
      `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
          text: "Got it!"
        })
      }
    );
  } catch (error) {
    console.error("CALLBACK ERROR:", error?.message);
  }
}
