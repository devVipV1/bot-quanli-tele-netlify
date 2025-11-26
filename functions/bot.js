import TelegramBot from "node-telegram-bot-api";

let bot;

// Database trong RAM
let admins = {};     // admins[groupId] = [ids]
let warns = {};      // warns[groupId][userId]
let settings = {};   // settings[groupId] = { camlink, camanh, camfile, time }

// Hàm tạo message đẹp
const fancy = (text) =>
  `<b>✨ QUẢN LÍ NHÓM ✨</b>\n\n${text}\n\n<b>⚡ Bot Netlify</b>`;

// Netlify Function handler
export default async (req, res) => {
  try {
    // Khởi tạo bot đúng cách (chỉ 1 lần)
    if (!bot) {
      bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

      console.log("Bot initialized");

      // ==================== KHI VÀO NHÓM ====================
      bot.on("new_chat_members", async (msg) => {
        const group = msg.chat.id;

        msg.new_chat_members.forEach((mem) => {
          // Nếu chính bot được add → người add là admin chính
          if (mem.username === process.env.BOT_USERNAME) {
            if (!admins[group]) admins[group] = [];
            admins[group].push(msg.from.id);

            bot.sendMessage(
              group,
              fancy(`👑 <b>${msg.from.first_name}</b> đã trở thành ADMIN chính của bot!`),
              { parse_mode: "HTML" }
            );
          }
        });
      });

      // ==================== CHECK ADMIN ====================
      function isAdmin(group, user) {
        return admins[group]?.includes(user);
      }

      // ==================== CẢNH CÁO / CẤM CHAT ====================
      async function warning(msg, userId) {
        const group = msg.chat.id;

        if (!warns[group]) warns[group] = {};
        warns[group][userId] = (warns[group][userId] || 0) + 1;

        const warn = warns[group][userId];
        let duration = 0;

        if (warn === 1) duration = 5 * 60;
        if (warn === 2) duration = 30 * 60;
        if (warn === 3) duration = 120 * 60;

        if (warn < 4) {
          await bot.restrictChatMember(group, userId, {
            permissions: { can_send_messages: false },
            until_date: Math.floor(Date.now() / 1000) + duration
          });

          bot.sendMessage(
            group,
            fancy(`⚠️ Người dùng ${userId} cảnh cáo ${warn}/4\n⏳ Cấm chat ${duration / 60} phút.`),
            { parse_mode: "HTML" }
          );
        } else {
          await bot.kickChatMember(group, userId);
          bot.sendMessage(
            group,
            fancy(`🚫 Người dùng ${userId} đã bị KICK khỏi nhóm!`),
            { parse_mode: "HTML" }
          );
        }
      }

      // ==================== CHẶN LINK / ẢNH / FILE ====================
      bot.on("message", async (msg) => {
        if (!msg.chat || msg.chat.type === "private") return;

        const group = msg.chat.id;
        const user = msg.from.id;

        if (!settings[group])
          settings[group] = { camlink: false, camanh: false, camfile: false, time: 0 };

        // Chặn link
        if (settings[group].camlink && msg.text && /(http|https)/.test(msg.text)) {
          if (!isAdmin(group, user)) return warning(msg, user);
        }

        // Chặn ảnh
        if (settings[group].camanh && msg.photo && !isAdmin(group, user)) {
          return warning(msg, user);
        }

        // Chặn file
        if (settings[group].camfile && msg.document && !isAdmin(group, user)) {
          return warning(msg, user);
        }
      });

      // ==================== LỆNH ====================

      // /help
      bot.onText(/\/help/, (msg) => {
        bot.sendMessage(
          msg.chat.id,
          fancy(`
<b>/help</b> – xem lệnh
<b>/kick</b> @user | id
<b>/addadmin</b> @user | id
<b>/kickadmin</b> @user | id
<b>/time</b> số giây
<b>/camlink</b> /golink
<b>/camanh</b> /goanh
<b>/camfile</b> /gofile
<b>/idnhom</b>
<b>/iduser</b> (reply)
          `),
          { parse_mode: "HTML" }
        );
      });

      // /kick
      bot.onText(/\/kick (.+)/, async (msg, match) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id))
          return bot.sendMessage(group, "❌ Bạn không phải admin!");

        let id = match[1].replace("@", "");

        try {
          await bot.kickChatMember(group, id);
          bot.sendMessage(group, "✅ Đã kick!");
        } catch {
          bot.sendMessage(group, "❌ Không kick được!");
        }
      });

      // /addadmin
      bot.onText(/\/addadmin (.+)/, (msg, match) => {
        const group = msg.chat.id;

        if (!admins[group]) admins[group] = [];
        const id = Number(match[1].replace("@", ""));

        if (!admins[group].includes(id)) admins[group].push(id);

        bot.sendMessage(group, "👑 Đã thêm admin!");
      });

      // /kickadmin
      bot.onText(/\/kickadmin (.+)/, (msg, match) => {
        const group = msg.chat.id;

        const id = Number(match[1].replace("@", ""));
        admins[group] = admins[group]?.filter((u) => u !== id);

        bot.sendMessage(group, "🗑️ Đã xoá admin!");
      });

      // /time
      bot.onText(/\/time (.+)/, (msg, match) => {
        const group = msg.chat.id;

        if (!isAdmin(group, msg.from.id))
          return bot.sendMessage(group, "❌ Bạn không phải admin!");

        settings[group].time = Number(match[1]);
        bot.sendMessage(group, `⏳ Time set: ${match[1]} giây`);
      });

      // Cấm / cho link
      bot.onText(/\/camlink/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;

        settings[group].camlink = true;
        bot.sendMessage(group, "🚫 Đã cấm link!");
      });

      bot.onText(/\/golink/, (msg) => {
        const group = msg.chat.id;
        settings[group].camlink = false;
        bot.sendMessage(group, "✅ Cho phép link!");
      });

      // Cấm / cho ảnh
      bot.onText(/\/camanh/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;

        settings[group].camanh = true;
        bot.sendMessage(group, "🚫 Cấm ảnh!");
      });

      bot.onText(/\/goanh/, (msg) => {
        const group = msg.chat.id;
        settings[group].camanh = false;
        bot.sendMessage(group, "✅ Cho phép ảnh!");
      });

      // Cấm / cho file
      bot.onText(/\/camfile/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;

        settings[group].camfile = true;
        bot.sendMessage(group, "🚫 Cấm file!");
      });

      bot.onText(/\/gofile/, (msg) => {
        const group = msg.chat.id;
        settings[group].camfile = false;
        bot.sendMessage(group, "📂 Cho file!");
      });

      // /idnhom
      bot.onText(/\/idnhom/, (msg) => {
        bot.sendMessage(
          msg.chat.id,
          `🆔 ID nhóm: <code>${msg.chat.id}</code>`,
          { parse_mode: "HTML" }
        );
      });

      // /iduser
      bot.onText(/\/iduser/, (msg) => {
        const id = msg.reply_to_message?.from.id;
        bot.sendMessage(
          msg.chat.id,
          `🧍 ID người dùng: <code>${id}</code>`,
          { parse_mode: "HTML" }
        );
      });
    }

    // ==================== xử lý update Telegram ====================
    if (req.body) {
      await bot.processUpdate(req.body);
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("BOT ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
