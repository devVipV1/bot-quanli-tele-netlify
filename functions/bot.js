import TelegramBot from "node-telegram-bot-api";

let bot;

// RAM DATABASE
let admins = {};     // admins[groupId] = [userId]
let warns = {};      // warns[groupId][userId] = number
let settings = {};   // settings[group] = { camlink, camanh, camfile, time }

// FORMAT MESSAGE
function fancy(text) {
  return `<b>✨ QUẢN LÍ NHÓM TELEGRAM ✨</b>\n\n${text}\n\n<i>⚡ Bot by Netlify</i>`;
}

// CHECK ADMIN
function isAdmin(group, user) {
  // ADMIN cố định từ ENV (không bao giờ mất)
  if (String(user) === String(process.env.MAIN_ADMIN)) return true;

  // ADMIN động trong danh sách
  return admins[group]?.includes(user);
}

// CẢNH CÁO
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
      fancy(`⚠️ Cảnh cáo ${count}/4!\n⏳ Cấm chat trong ${duration / 60} phút.`),
      { parse_mode: "HTML" }
    );
  } else {
    await msg.bot.kickChatMember(group, user);
    await msg.bot.sendMessage(
      group,
      fancy(`🚫 Người dùng đã bị kick khỏi nhóm sau 4 lần vi phạm!`),
      { parse_mode: "HTML" }
    );
  }
}

export default async (req, res) => {

  if (!bot) {
    bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: false });

    // BOT ĐƯỢC THÊM VÀO NHÓM → GÁN NGƯỜI THÊM LÀ ADMIN
    bot.on("new_chat_members", (msg) => {
      const group = msg.chat.id;

      msg.new_chat_members.forEach(m => {
        if (m.username === process.env.BOT_USERNAME) {

          if (!admins[group]) admins[group] = [];
          admins[group].push(msg.from.id);

          bot.sendMessage(
            group,
            fancy(`👑 <b>${msg.from.first_name}</b> đã trở thành ADMIN chính khi thêm bot!`),
            { parse_mode: "HTML" }
          );
        }
      });
    });

    // NHẬN MESSAGE
    bot.on("message", async (msg) => {
      if (!msg.chat || msg.chat.type === "private") return;

      msg.bot = bot;   // attach bot object
      const group = msg.chat.id;
      const user = msg.from.id;

      if (!settings[group]) {
        settings[group] = { camlink: false, camanh: false, camfile: false, time: 0 };
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

    // /help
    bot.onText(/\/help/, msg => {
      bot.sendMessage(
        msg.chat.id,
        fancy(`
<b>📌 LỆNH USER</b>
• /help – Hiển thị lệnh
• /idnhom – Lấy ID nhóm
• /iduser – Lấy ID người (reply hoặc username)

<b>📌 LỆNH ADMIN</b>
• /kick @user hoặc id  
• /addadmin @user hoặc id  
• /kickadmin @user hoặc id  
• /time <s> – đặt time spam  
• /camlink – cấm link  
• /golink – mở link  
• /camanh – cấm ảnh  
• /goanh – mở ảnh  
• /camfile – cấm file  
• /gofile – mở file  
        `),
        { parse_mode: "HTML" }
      );
    });

    // /kick
    bot.onText(/\/kick (.+)/, async (msg, match) => {
      const group = msg.chat.id;

      if (!isAdmin(group, msg.from.id))
        return bot.sendMessage(group, "❌ Bạn không phải admin");

      let id = match[1].replace("@", "");

      try {
        await bot.kickChatMember(group, id);
        bot.sendMessage(group, "✅ Đã kick thành công!");
      } catch {
        bot.sendMessage(group, "❌ Kick thất bại!");
      }
    });

    // /addadmin
    bot.onText(/\/addadmin (.+)/, (msg, match) => {
      const group = msg.chat.id;

      if (!isAdmin(group, msg.from.id))
        return bot.sendMessage(group, "❌ Bạn không phải admin");

      if (!admins[group]) admins[group] = [];

      const id = Number(match[1].replace("@", ""));
      if (!admins[group].includes(id)) admins[group].push(id);

      bot.sendMessage(group, "👑 Đã thêm admin!");
    });

    // /kickadmin
    bot.onText(/\/kickadmin (.+)/, (msg, match) => {
      const group = msg.chat.id;

      if (!isAdmin(group, msg.from.id))
        return bot.sendMessage(group, "❌ Bạn không phải admin");

      const id = Number(match[1].replace("@", ""));
      admins[group] = admins[group]?.filter(u => u !== id);

      bot.sendMessage(group, "🗑️ Đã xoá admin!");
    });

    // /time
    bot.onText(/\/time (.+)/, (msg, match) => {
      const group = msg.chat.id;

      if (!isAdmin(group, msg.from.id)) return;

      settings[group].time = Number(match[1]);
      bot.sendMessage(group, `⏳ Time spam set: ${match[1]} giây`);
    });

    // TOGGLE CAM/G0 LINK/ẢNH/FILE
    const toggles = {
      camlink: "🚫 Đã cấm gửi link!",
      golink: "✅ Cho phép gửi link!",
      camanh: "🚫 Đã cấm gửi ảnh!",
      goanh: "📸 Cho phép gửi ảnh!",
      camfile: "🚫 Đã cấm gửi file!",
      gofile: "📂 Cho phép gửi file!",
    };

    for (let cmd in toggles) {
      bot.onText(new RegExp(`/${cmd}`), msg => {
        const group = msg.chat.id;

        if (!isAdmin(group, msg.from.id)) return;

        const key = cmd.replace("cam", "").replace("go", "");
        settings[group][key] = cmd.startsWith("cam");

        bot.sendMessage(group, toggles[cmd]);
      });
    }

    // /idnhom
    bot.onText(/\/idnhom/, msg => {
      bot.sendMessage(
        msg.chat.id,
        `🆔 ID nhóm: <code>${msg.chat.id}</code>`,
        { parse_mode: "HTML" }
      );
    });

    // /iduser
    bot.onText(/\/iduser/, msg => {
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

  // Nhận update Telegram
  await bot.processUpdate(req.body);

  res.status(200).json({ ok: true });
};
