import TelegramBot from "node-telegram-bot-api";

// Biến toàn cục
let bot;

// RAM database (reset mỗi lần cold start)
let admins = {};
let warns = {};
let settings = {};

const MAIN_ADMIN = Number(process.env.MAIN_ADMIN);

// UI đẹp
const fancy = (text) =>
`🌙━━━━━━━━━━━━━━━━━━━━🌙
        ✨ <b>QUẢN LÍ NHÓM</b> ✨
━━━━━━━━━━━━━━━━━━━━━━━

${text}

🌙━━━━━━━━━━━━━━━━━━━━🌙
⚡ <i>Bot hỗ trợ bởi Netlify</i>`;

// Hàm kiểm tra admin
function isAdmin(groupId, userId) {
  if (userId === MAIN_ADMIN) return true; // Full quyền
  return admins[groupId]?.includes(userId) || false;
}

export const handler = async (event) => {
  try {
    // Khởi tạo bot tại serverless cold start
    if (!bot) {
      bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });
      console.log("Bot initialized OK!");

      // =============== BOT ĐƯỢC THÊM VÀO NHÓM ===============
      bot.on("new_chat_members", async (msg) => {
        const group = msg.chat.id;
        msg.new_chat_members.forEach((mem) => {
          // Nếu người add bot chính là ADMIN KHÔNG CỐ ĐỊNH
          if (mem.username === process.env.BOT_USERNAME) {
            if (!admins[group]) admins[group] = [];
            admins[group].push(msg.from.id);

            bot.sendMessage(
              group,
              fancy(`👑 <b>${msg.from.first_name}</b> đã trở thành ADMIN chính của nhóm này!`),
              { parse_mode: "HTML" }
            );
          }
        });
      });

      // ================= CHẶN PRIVATE CHAT =================
      bot.on("message", async (msg) => {
        const userId = msg.from.id;
        const chatType = msg.chat.type;

        // Người không phải MAIN_ADMIN không thể nhắn riêng bot
        if (chatType === "private" && userId !== MAIN_ADMIN) {
          return bot.sendMessage(
            userId,
            "❌ Bạn không phải admin cố định.\nBot chỉ hoạt động trong nhóm!",
            { parse_mode: "HTML" }
          );
        }

        // KHỞI TẠO THÔNG SỐ NHÓM
        if (chatType !== "private") {
          const group = msg.chat.id;

          if (!settings[group]) {
            settings[group] = { camlink: false, camanh: false, camfile: false, time: 0 };
          }

          // CHẶN LINK
          if (settings[group].camlink && msg.text && /(http|https)/.test(msg.text)) {
            if (!isAdmin(group, userId)) {
              return warnUser(msg, userId);
            }
          }

          // CHẶN ẢNH
          if (settings[group].camanh && msg.photo && !isAdmin(group, userId)) {
            return warnUser(msg, userId);
          }

          // CHẶN FILE
          if (settings[group].camfile && msg.document && !isAdmin(group, userId)) {
            return warnUser(msg, userId);
          }
        }
      });

      // ================= CẢNH CÁO & CHỐNG SPAM =================
      async function warnUser(msg, userId) {
        const group = msg.chat.id;

        if (!warns[group]) warns[group] = {};
        warns[group][userId] = (warns[group][userId] || 0) + 1;

        const w = warns[group][userId];
        let duration = 0;

        if (w === 1) duration = 5 * 60;
        if (w === 2) duration = 30 * 60;
        if (w === 3) duration = 120 * 60;

        if (w < 4) {
          await bot.restrictChatMember(group, userId, {
            permissions: { can_send_messages: false },
            until_date: Math.floor(Date.now() / 1000) + duration,
          });

          bot.sendMessage(
            group,
            fancy(`⚠️ Cảnh cáo ${w}/4\n⏳ Cấm chat ${duration / 60} phút.`),
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

      // ====================== /help UI đẹp ======================
      bot.onText(/\/help/, (msg) => {
        bot.sendMessage(
          msg.chat.id,
          fancy(`
🧭 <b>Lệnh điều hướng:</b>
• <code>/help</code> — hiển thị toàn bộ lệnh
• <code>/idnhom</code> — lấy ID nhóm
• <code>/iduser</code> — ID người dùng (reply)

🛡️ <b>Lệnh quản trị:</b>
• <code>/addadmin &lt;id&gt;</code> — thêm admin không cố định
• <code>/kickadmin &lt;id&gt;</code> — xoá admin nhóm
• <code>/kick &lt;id|reply&gt;</code> — kick thành viên

🚫 <b>Chế độ hạn chế:</b>
• <code>/camlink</code> — cấm gửi link
• <code>/camanh</code> — cấm gửi ảnh
• <code>/camfile</code> — cấm gửi file

✅ <b>Mở khoá:</b>
• <code>/golink</code> — cho gửi link
• <code>/goanh</code> — cho gửi ảnh
• <code>/gofile</code> — cho gửi file

⏳ <b>Chống spam:</b>
• <code>/time &lt;giây&gt;</code> — thời gian delay tin nhắn
          `),
          { parse_mode: "HTML" }
        );
      });

      // ======================== /kick ========================
      bot.onText(/\/kick (.+)/, async (msg, match) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;

        const id = match[1].replace("@", "");

        try {
          await bot.kickChatMember(group, id);
          bot.sendMessage(group, "✅ Kick thành công!");
        } catch {
          bot.sendMessage(group, "❌ Không kick được!");
        }
      });

      // ===================== /addadmin =====================
      bot.onText(/\/addadmin (.+)/, async (msg, match) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;

        const id = Number(match[1].replace("@", ""));
        if (!admins[group]) admins[group] = [];
        if (!admins[group].includes(id)) admins[group].push(id);

        bot.sendMessage(group, "👑 Đã thêm admin!");
      });

      // ===================== /kickadmin =====================
      bot.onText(/\/kickadmin (.+)/, async (msg, match) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;

        const id = Number(match[1].replace("@", ""));
        admins[group] = admins[group]?.filter((x) => x !== id);

        bot.sendMessage(group, "🗑️ Đã xoá admin!");
      });

      // ====================== CẤM / CHO PHÉP ======================
      bot.onText(/\/camlink/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;
        settings[group].camlink = true;
        bot.sendMessage(group, "🚫 Đã cấm link!");
      });

      bot.onText(/\/golink/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;
        settings[group].camlink = false;
        bot.sendMessage(group, "✅ Cho phép link!");
      });

      bot.onText(/\/camanh/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;
        settings[group].camanh = true;
        bot.sendMessage(group, "🚫 Đã cấm ảnh!");
      });

      bot.onText(/\/goanh/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;
        settings[group].camanh = false;
        bot.sendMessage(group, "✅ Cho phép ảnh!");
      });

      bot.onText(/\/camfile/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;
        settings[group].camfile = true;
        bot.sendMessage(group, "🚫 Đã cấm file!");
      });

      bot.onText(/\/gofile/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;
        settings[group].camfile = false;
        bot.sendMessage(group, "📂 Cho phép file!");
      });

      // ====================== Lấy ID nhóm ======================
      bot.onText(/\/idnhom/, (msg) => {
        bot.sendMessage(msg.chat.id,
          `🆔 ID nhóm: <code>${msg.chat.id}</code>`,
          { parse_mode: "HTML" }
        );
      });

      // ===================== ID người dùng =====================
      bot.onText(/\/iduser/, (msg) => {
        const id = msg.reply_to_message?.from.id;
        bot.sendMessage(msg.chat.id,
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
