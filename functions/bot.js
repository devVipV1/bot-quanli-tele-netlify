import TelegramBot from "node-telegram-bot-api";

let bot;

// RAM database
let admins = {};
let warns = {};
let settings = {};

const fancy = (text) =>
  `<b>✨ QUẢN LÝ NHÓM ✨</b>\n\n${text}\n\n<b>⚡ Bot by Netlify</b>`;

export const handler = async (event) => {
  try {
    // Khởi tạo bot tại serverless cold start
    if (!bot) {
      bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

      console.log("Bot initialized OK!");

      // === VÀO NHÓM ===
      bot.on("new_chat_members", async (msg) => {
        const group = msg.chat.id;

        msg.new_chat_members.forEach((mem) => {
          if (mem.username === process.env.BOT_USERNAME) {
            if (!admins[group]) admins[group] = [];
            admins[group].push(msg.from.id);

            bot.sendMessage(
              group,
              fancy(`👑 <b>${msg.from.first_name}</b> là ADMIN chính của bot!`),
              { parse_mode: "HTML" }
            );
          }
        });
      });

      const isAdmin = (group, uid) =>
        admins[group] && admins[group].includes(uid);

      // === XỬ LÝ CẢNH CÁO ===
      async function warnUser(msg, uid) {
        const group = msg.chat.id;

        if (!warns[group]) warns[group] = {};
        warns[group][uid] = (warns[group][uid] || 0) + 1;

        const w = warns[group][uid];
        let duration = 0;

        if (w === 1) duration = 5 * 60;
        if (w === 2) duration = 30 * 60;
        if (w === 3) duration = 120 * 60;

        if (w < 4) {
          await bot.restrictChatMember(group, uid, {
            permissions: { can_send_messages: false },
            until_date: Math.floor(Date.now() / 1000) + duration
          });

          bot.sendMessage(
            group,
            fancy(`⚠️ Cảnh cáo ${w}/4\n⏳ Cấm chat ${duration / 60} phút.`),
            { parse_mode: "HTML" }
          );
        } else {
          await bot.kickChatMember(group, uid);
          bot.sendMessage(
            group,
            fancy(`🚫 Người dùng ${uid} đã bị kick khỏi nhóm!`),
            { parse_mode: "HTML" }
          );
        }
      }

      // === CHẶN LINK / ẢNH / FILE ===
      bot.on("message", async (msg) => {
        if (!msg.chat || msg.chat.type === "private") return;

        const group = msg.chat.id;
        const user = msg.from.id;

        if (!settings[group])
          settings[group] = { camlink: false, camanh: false, camfile: false };

        if (settings[group].camlink && msg.text && /(http|https)/.test(msg.text)) {
          if (!isAdmin(group, user)) return warnUser(msg, user);
        }

        if (settings[group].camanh && msg.photo && !isAdmin(group, user)) {
          return warnUser(msg, user);
        }

        if (settings[group].camfile && msg.document && !isAdmin(group, user)) {
          return warnUser(msg, user);
        }
      });

      // ================= LỆNH ================

      bot.onText(/\/help/, (msg) =>
        bot.sendMessage(
          msg.chat.id,
          fancy(`
/help – lệnh
/kick id | reply
/addadmin id
/kickadmin id
/time giây
/camlink – /golink
/camanh – /goanh
/camfile – /gofile
/idnhom
/iduser (reply)
          `),
          { parse_mode: "HTML" }
        )
      );

      bot.onText(/\/kick (.+)/, async (msg, match) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;

        const id = match[1].replace("@", "");
        try {
          await bot.kickChatMember(group, id);
          bot.sendMessage(group, "✅ Kick thành công!");
        } catch {
          bot.sendMessage(group, "❌ Kick thất bại!");
        }
      });

      bot.onText(/\/addadmin (.+)/, (msg, match) => {
        const group = msg.chat.id;

        if (!admins[group]) admins[group] = [];
        const id = Number(match[1].replace("@", ""));
        if (!admins[group].includes(id)) admins[group].push(id);

        bot.sendMessage(group, "👑 Đã thêm admin!");
      });

      bot.onText(/\/kickadmin (.+)/, (msg, match) => {
        const group = msg.chat.id;
        const id = Number(match[1].replace("@", ""));
        admins[group] = admins[group]?.filter((x) => x !== id);

        bot.sendMessage(group, "🗑️ Đã xoá admin!");
      });

      bot.onText(/\/camlink/, (msg) => {
        const group = msg.chat.id;
        settings[group].camlink = true;
        bot.sendMessage(group, "🚫 Cấm link!");
      });

      bot.onText(/\/golink/, (msg) => {
        const group = msg.chat.id;
        settings[group].camlink = false;
        bot.sendMessage(group, "✅ Cho phép link!");
      });

      bot.onText(/\/camanh/, (msg) => {
        const group = msg.chat.id;
        settings[group].camanh = true;
        bot.sendMessage(group, "🚫 Cấm ảnh!");
      });

      bot.onText(/\/goanh/, (msg) => {
        const group = msg.chat.id;
        settings[group].camanh = false;
        bot.sendMessage(group, "✅ Cho phép ảnh!");
      });

      bot.onText(/\/camfile/, (msg) => {
        const group = msg.chat.id;
        settings[group].camfile = true;
        bot.sendMessage(group, "🚫 Cấm file!");
      });

      bot.onText(/\/gofile/, (msg) => {
        const group = msg.chat.id;
        settings[group].camfile = false;
        bot.sendMessage(group, "📂 Cho phép file!");
      });

      bot.onText(/\/idnhom/, (msg) =>
        bot.sendMessage(
          msg.chat.id,
          `🆔 ID nhóm: <code>${msg.chat.id}</code>`,
          { parse_mode: "HTML" }
        )
      );

      bot.onText(/\/iduser/, (msg) => {
        const id = msg.reply_to_message?.from.id;
        bot.sendMessage(
          msg.chat.id,
          `🧍 ID người dùng: <code>${id}</code>`,
          { parse_mode: "HTML" }
        );
      });
    }

    // ================== Xử lý update Telegram ==================
    if (event.body) {
      const update = JSON.parse(event.body);
      await bot.processUpdate(update);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };

  } catch (err) {
    console.error("BOT ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
