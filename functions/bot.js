import TelegramBot from "node-telegram-bot-api";

let bot;

//========================
// RAM DATABASE (volatile)
//========================
let admins = {};       
let warns = {};        
let settings = {};     
let keywords = {};     
let welcome = {};      
let logs = [];         

//========================
// MESSAGE FORMAT
//========================
function fancy(text) {
  return `<b>✨ QUẢN LÍ NHÓM TELEGRAM ✨</b>\n\n${text}\n\n<i>⚡ Bot by Netlify</i>`;
}

//========================
// CHECK ADMIN
//========================
function isAdmin(group, user) {
  if (String(user) === String(process.env.MAIN_ADMIN)) return true;
  return admins[group]?.includes(user);
}

//========================
// ADD LOG
//========================
function addLog(type, info) {
  logs.push({ type, info, time: new Date().toISOString() });
}

//========================
// WARNING SYSTEM
//========================
async function applyWarning(msg, user) {
  const group = msg.chat.id;

  if (!warns[group]) warns[group] = {};
  warns[group][user] = (warns[group][user] || 0) + 1;

  const count = warns[group][user];
  let duration = [0, 5*60, 30*60, 2*60*60][count] || 0;

  if (count <= 3) {
    await msg.bot.restrictChatMember(group, user, {
      permissions: { can_send_messages: false },
      until_date: Math.floor(Date.now() / 1000) + duration
    });

    addLog("mute", { user, group, duration });

    await msg.bot.sendMessage(
      group,
      fancy(`⚠️ Cảnh cáo ${count}/4\n⏳ Mute ${duration/60} phút!`),
      { parse_mode: "HTML" }
    );
  } else {
    await msg.bot.kickChatMember(group, user);
    addLog("kick", { user, group });

    await msg.bot.sendMessage(
      group,
      fancy(`🚫 Kick sau 4 lần vi phạm!`),
      { parse_mode: "HTML" }
    );
  }
}
//========================
// ANTI-SPAM
//========================
let lastMessage = {};

async function antiSpamHandler(msg) {
  const group = msg.chat.id;
  const user = msg.from.id;
  const now = Date.now();

  if (!settings[group]) settings[group] = { spamTime: 1, camlink: false, camanh: false, camfile: false };

  const limit = settings[group].spamTime * 1000;

  if (!lastMessage[user]) lastMessage[user] = now;
  else {
    if (now - lastMessage[user] < limit && !isAdmin(group, user)) {
      return applyWarning(msg, user);
    }
    lastMessage[user] = now;
  }
}

//========================
// ANTI-LINK
//========================
function detectLink(text) {
  return /(https?:\/\/|www\.)/.test(text);
}

//========================
// KEYWORDS FILTER
//========================
async function keywordFilter(msg) {
  const group = msg.chat.id;
  const text = msg.text?.toLowerCase() || "";

  if (!keywords[group]) return;

  for (let key of keywords[group]) {
    if (text.includes(key.toLowerCase())) {
      await applyWarning(msg, msg.from.id);
      return true;
    }
  }
  return false;
}

//========================
// MEDIA FILTER
//========================
async function mediaFilter(msg) {
  const group = msg.chat.id;
  const user = msg.from.id;

  if (!settings[group]) settings[group] = {};

  if (settings[group].camanh && msg.photo && !isAdmin(group, user))
    return applyWarning(msg, user);

  if (settings[group].camfile && msg.document && !isAdmin(group, user))
    return applyWarning(msg, user);
}
//========================
// WELCOME MESSAGE
//========================
bot?.on("new_chat_members", async (msg) => {
  const group = msg.chat.id;

  msg.new_chat_members.forEach(async member => {
    if (!member.is_bot) {
      if (welcome[group]) {
        bot.sendMessage(group, fancy(`👋 Chào mừng <b>${member.first_name}</b>!\n${welcome[group]}`), { parse_mode: "HTML" });
      }
    }

    // If bot is added → assign admin
    if (
      member.username === process.env.BOT_USERNAME &&
      !admins[group]
    ) {
      admins[group] = [msg.from.id];
      bot.sendMessage(group, fancy(`👑 <b>${msg.from.first_name}</b> là ADMIN chính!`), { parse_mode: "HTML" });
    }
  });
});

//========================
// CAPTCHA VERIFY
//========================
async function sendCaptcha(msg) {
  const user = msg.from.id;
  const group = msg.chat.id;

  const button = {
    reply_markup: {
      inline_keyboard: [[{ text: "Tôi không phải robot 🤖", callback_data: "verify" }]]
    }
  };

  await bot.restrictChatMember(group, user, {
    permissions: { can_send_messages: false }
  });

  await bot.sendMessage(group, `<b>${msg.from.first_name}</b>, hãy xác minh trước khi chat.`,
    { parse_mode: "HTML", ...button });
}

bot?.on("callback_query", async (query) => {
  if (query.data === "verify") {
    const group = query.message.chat.id;
    const user = query.from.id;

    await bot.restrictChatMember(group, user, {
      permissions: { can_send_messages: true }
    });

    bot.sendMessage(group, `✅ <b>${query.from.first_name}</b> đã xác minh!`, { parse_mode: "HTML" });
  }
});

//========================
// ADMIN COMMANDS
//========================
bot?.onText(/\/addadmin (.+)/, (msg, m) => {
  if (!isAdmin(msg.chat.id, msg.from.id)) return;

  const id = Number(m[1].replace("@", ""));
  if (!admins[msg.chat.id]) admins[msg.chat.id] = [];
  if (!admins[msg.chat.id].includes(id)) admins[msg.chat.id].push(id);

  bot.sendMessage(msg.chat.id, "👑 Đã thêm admin!");
});

bot?.onText(/\/kickadmin (.+)/, (msg, m) => {
  if (!isAdmin(msg.chat.id, msg.from.id)) return;

  const id = Number(m[1].replace("@", ""));
  admins[msg.chat.id] = admins[msg.chat.id].filter(a => a !== id);

  bot.sendMessage(msg.chat.id, "🗑️ Đã xoá admin!");
});

//========================
// CLEAN MESSAGES
//========================
bot?.onText(/\/clean (\d+)/, async (msg, m) => {
  if (!isAdmin(msg.chat.id, msg.from.id)) return;

  const amount = Number(m[1]);
  for (let i = 0; i < amount; i++) {
    bot.deleteMessage(msg.chat.id, msg.message_id - i).catch(()=>{});
  }

  bot.sendMessage(msg.chat.id, `🧹 Đã xoá ${amount} tin.`);
});

//========================
// SET RULES
//========================
let rules = {};

bot?.onText(/\/setrules (.+)/, (msg, m) => {
  if (!isAdmin(msg.chat.id, msg.from.id)) return;
  rules[msg.chat.id] = m[1];
  bot.sendMessage(msg.chat.id, "📜 Đã đặt luật nhóm!");
});

bot?.onText(/\/rules/, (msg) => {
  bot.sendMessage(msg.chat.id, rules[msg.chat.id] || "Chưa có luật nhóm.");
});

//========================
// VIEW LOGS
//========================
bot?.onText(/\/logs/, (msg) => {
  if (!isAdmin(msg.chat.id, msg.from.id)) return;

  const txt = logs.slice(-20).map(l => `${l.time} — ${l.type}`).join("\n");
  bot.sendMessage(msg.chat.id, `📘 *LOGS Cuối*:\n${txt}`, { parse_mode: "Markdown" });
});
//========================
// AI CHATGPT
//========================
bot?.onText(/\/ask (.+)/, async (msg, m) => {
  const prompt = m[1];
  const reply = "🧠 AI đang trả lời...\n" + prompt;
  bot.sendMessage(msg.chat.id, reply);
});

//========================
// FUN COMMANDS
//========================
bot?.onText(/\/roll/, (msg) => {
  const n = Math.floor(Math.random() * 100) + 1;
  bot.sendMessage(msg.chat.id, `🎲 Bạn quay được: *${n}*`, {
    parse_mode: "Markdown"
  });
});

//========================
// NETLIFY FUNCTION WRAPPER
//========================
export default async (req) => {

  // IF FIRST INIT → CREATE BOT
  if (!bot) {
    bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: false });
  }

  // EMPTY REQUEST (Netlify check)
  if (!req.body || Object.keys(req.body).length === 0) {
    return new Response(JSON.stringify({ ok: true, skip: "empty-body" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // PROCESS TELEGRAM UPDATE
  try {
    await bot.processUpdate(req.body);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // ALWAYS RETURN VALID RESPONSE
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
