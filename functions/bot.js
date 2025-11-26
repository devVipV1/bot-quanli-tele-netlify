import TelegramBot from "node-telegram-bot-api";

let bot;

// RAM DATA
let admins = {};
let warns = {};
let settings = {};

function fancy(text) {
  return `<b>✨ QUẢN LÍ NHÓM TELEGRAM ✨</b>\n\n${text}\n\n<i>⚡ Bot by Netlify</i>`;
}

function isAdmin(group, user) {
  if (String(user) === String(process.env.MAIN_ADMIN)) return true;
  return admins[group]?.includes(user);
}

async function warning(msg, user) {
  const group = msg.chat.id;

  if (!warns[group]) warns[group] = {};
  warns[group][user] = (warns[group][user] || 0) + 1;

  const count = warns[group][user];
  let duration = 0;

  if (count === 1) duration = 5 * 60;
  if (count === 2) duration = 30 * 60;
  if (count === 3) duration = 2 * 60 * 60;

  if (count <= 3) {
    await msg.bot.restrictChatMember(group, user, {
      permissions: { can_send_messages: false },
      until_date: Math.floor(Date.now() / 1000) + duration
    });

    await msg.bot.sendMessage(
      group,
      fancy(`⚠️ Cảnh cáo ${count}/4!\n⏳ Cấm chat ${duration / 60} phút.`),
      { parse_mode: "HTML" }
    );
  } else {
    await msg.bot.kickChatMember(group, user);
    await msg.bot.sendMessage(
      group,
      fancy(`🚫 Đã kick khỏi nhóm sau 4 lần vi phạm!`),
      { parse_mode: "HTML" }
    );
  }
}

export default async (req) => {

  // KHỞI TẠO BOT 1 LẦN
  if (!bot) {
    bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: false });

    // BOT ĐƯỢC ADD VÀO NHÓM → NGƯỜI ADD TRỞ THÀNH ADMIN
    bot.on("new_chat_members", (msg) => {
      const group = msg.chat.id;

      msg.new_chat_members.forEach(m => {
        if (m.username === process.env.BOT_USERNAME) {

          if (!admins[group]) admins[group] = [];
          admins[group].push(msg.from.id);

          bot.sendMessage(
            group,
            fancy(`👑 <b>${msg.from.first_name}</b> đã trở thành ADMIN chính!`),
            { parse_mode: "HTML" }
          );
        }
      });
    });

    // MESSAGE HANDLER
    bot.on("message", async (msg) => {
      if (!msg.chat || msg.chat.type === "private") return;

      msg.bot = bot;

      const group = msg.chat.id;
      const user = msg.from.id;

      if (!settings[group]) {
        settings[group] = { camlink: false, camanh: false, camfile: false };
      }

      // CHẶN LINK
      if (settings[group].camlink && !isAdmin(group, user)) {
        if (msg.text && /(https?:\/\/|www\.)/.test(msg.text)) return warning(msg, user);
      }

      // CHẶN ẢNH
      if (settings[group].camanh && msg.photo && !isAdmin(group, user)) {
        return warning(msg, user);
      }

      // CHẶN FILE
      if (settings[group].camfile && msg.document && !isAdmin(group, user)) {
        return warning(msg, user);
      }
    });

    // HELP
    bot.onText(/\/help/, (msg) => {
      bot.sendMessage(
        msg.chat.id,
        fancy(`
<b>LỆNH USER</b>
/help
/idnhom
/iduser

<b>LỆNH ADMIN</b>
/kick id  
/addadmin id
/kickadmin id
/time giây
/camlink /golink
/camanh /goanh
/camfile /gofile
        `),
        { parse_mode: "HTML" }
      );
    });

    // KICK
    bot.onText(/\/kick (.+)/, async (msg, match) => {
      if (!isAdmin(msg.chat.id, msg.from.id)) return;

      let id = match[1].replace("@", "");
      try {
        await bot.kickChatMember(msg.chat.id, id);
        bot.sendMessage(msg.chat.id, "✅ Đã kick!");
      } catch {
        bot.sendMessage(msg.chat.id, "❌ Kick thất bại");
      }
    });

    // ADD ADMIN
    bot.onText(/\/addadmin (.+)/, (msg, match) => {
      if (!isAdmin(msg.chat.id, msg.from.id)) return;
      const group = msg.chat.id;

      if (!admins[group]) admins[group] = [];
      const id = Number(match[1].replace("@", ""));
      if (!admins[group].includes(id)) admins[group].push(id);

      bot.sendMessage(group, "👑 Đã thêm admin");
    });

    // KICK ADMIN
    bot.onText(/\/kickadmin (.+)/, (msg, match) => {
      if (!isAdmin(msg.chat.id, msg.from.id)) return;
      const group = msg.chat.id;

      const id = Number(match[1].replace("@", ""));
      admins[group] = admins[group]?.filter(u => u !== id);

      bot.sendMessage(group, "🗑️ Đã xoá admin");
    });

    // ID NHÓM
    bot.onText(/\/idnhom/, msg => {
      bot.sendMessage(
        msg.chat.id,
        `🆔 ID nhóm: <code>${msg.chat.id}</code>`,
        { parse_mode: "HTML" }
      );
    });

    // ID USER
    bot.onText(/\/iduser/, (msg) => {
      let id =
        msg.reply_to_message?.from.id ||
        msg.text.split(" ")[1]?.replace("@", "");

      bot.sendMessage(
        msg.chat.id,
        `🧍 ID người dùng: <code>${id}</code>`,
        { parse_mode: "HTML" }
      );
    });
  }

  // FIX QUAN TRỌNG: NETLIFY GỬI REQUEST TRỐNG
  if (!req.body || Object.keys(req.body).length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, skip: "empty-body" })
    };
  }

  try {
    await bot.processUpdate(req.body);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };

  } catch (err) {
    console.error("ERROR:", err);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, error: err.message })
    };
  }
};
