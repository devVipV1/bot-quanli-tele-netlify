// ==========================================
// HACKER OMEGA MODE — PART 1/4
// ==========================================

import TelegramBot from "node-telegram-bot-api";

let bot;

// Temporary RAM database (serverless-safe)
let admins = {};
let warns = {};
let settings = {};
let msgSpeed = {};
let securityLog = [];
let ghostMode = false;

const MAIN_ADMIN = Number(process.env.MAIN_ADMIN);

// ==========================================
// TIME STAMP
// ==========================================
function timeStamp() {
  const d = new Date();
  return `[ ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")} ]`;
}

// ==========================================
// FIX HTML — ESCAPE "<" & ">"
// ==========================================
function esc(s) {
  if (!s) return "";
  return s.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ==========================================
// MATRIX ASCII EFFECT
// ==========================================
const matrixEffect = `
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
▓ R ▓ A ▓ N ▓ D ▓ O ▓ M ▓ ▓▁▂▃▄▓
▒ H ▒ A ▒ C ▒ K ▒ C ▒ O ▒ D ▒ E ▒
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
`;

// ==========================================
// TERMINAL UI
// ==========================================
const terminalUI = (txt) =>
`<pre>
[ SYSTEM · OMEGA MATRIX ] ${timeStamp()}
--------------------------------------------------
${esc(txt)}
--------------------------------------------------
BOT STATUS: ACTIVE
</pre>`;

// ==========================================
// RED ALERT UI
// ==========================================
const redAlertUI = (txt) =>
`<pre>
███████████████  RED ALERT MODE  ███████████████
${esc(txt)}

${matrixEffect}
██ SYSTEM: THREAT ISOLATED ██
</pre>`;

// ==========================================
// CYBER AVATAR
// ==========================================
function cyberAvatar() {
  const list = [
    "(•_•)",
    "(⌐■_■)",
    "(ಠ_ಠ)",
    "(҂⌣̀_⌣́)",
    "(╬ Ò﹏Ó)",
    "(ง'̀-'́)ง",
    "(ノಠ益ಠ)ノ彡┻━┻",
  ];
  return list[Math.floor(Math.random() * list.length)];
}

// ==========================================
// ADMIN CHECK
// ==========================================
function isAdmin(group, user) {
  if (user === MAIN_ADMIN) return true;
  return admins[group]?.includes(user) || false;
}

// ==========================================
// SECURITY LOGGER
// ==========================================
function logEvent(data) {
  const entry = { time: timeStamp(), ...data };
  securityLog.push(entry);
}
// ==========================================
// HACKER OMEGA MODE — PART 2/4
// ==========================================

export const handler = async (event) => {
  try {
    if (!bot) {
      bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });
      console.log("BOT OMEGA MODE INITIALIZED");

      // ========== AUTO ADMIN ==========
      bot.on("new_chat_members", (msg) => {
        const group = msg.chat.id;

        msg.new_chat_members.forEach((mem) => {
          if (mem.username === process.env.BOT_USERNAME) {
            if (!admins[group]) admins[group] = [];
            admins[group].push(msg.from.id);

            logEvent({
              event: "NEW_ADMIN",
              user: msg.from.id,
              group,
              type: "AUTO",
            });

            bot.sendMessage(
              group,
              terminalUI(`> NEW ADMIN: ${msg.from.id}\n> ACCESS: GRANTED`),
              { parse_mode: "HTML" }
            );
          }
        });
      });

      // ========== MESSAGE HANDLER ==========
      bot.on("message", async (msg) => {
        const user = msg.from.id;
        const chat = msg.chat.id;
        const type = msg.chat.type;

        // === PRIVATE CHAT LOCK ===
        if (type === "private" && user !== MAIN_ADMIN) {
          return bot.sendMessage(
            user,
            terminalUI("> ACCESS DENIED — PRIVATE MODE OFF"),
            { parse_mode: "HTML" }
          );
        }

        // === GHOST MODE ===
        if (ghostMode && user !== MAIN_ADMIN) return;

        // === INIT GROUP SETTINGS ===
        if (!settings[chat]) {
          settings[chat] = {
            camlink: false,
            camanh: false,
            camfile: false,
            time: 0
          };
        }

        // === CUSTOM /time LIMIT ===
        if (!msgSpeed[user]) msgSpeed[user] = { last_custom: 0 };

        if (settings[chat].time && !isAdmin(chat, user)) {
          const now = Date.now();

          if (now - msgSpeed[user].last_custom < settings[chat].time) {
            return warnSystem(msg, user, chat, "TIME_LIMIT");
          }

          msgSpeed[user].last_custom = now;
        }

        // === SPEED SPAM DETECTOR ===
        if (!msgSpeed[user].speed) msgSpeed[user].speed = { count: 0, last: 0 };

        const now2 = Date.now();
        if (now2 - msgSpeed[user].speed.last < 500) {
          msgSpeed[user].speed.count++;
        } else {
          msgSpeed[user].speed.count = 1;
        }
        msgSpeed[user].speed.last = now2;

        if (msgSpeed[user].speed.count >= 4 && !isAdmin(chat, user)) {
          return warnSystem(msg, user, chat, "SPEED_SPAM");
        }

        // === PATTERN SPAM ===
        if (msg.text && /(.)\1{6,}/.test(msg.text) && !isAdmin(chat, user)) {
          return warnSystem(msg, user, chat, "PATTERN_SPAM");
        }

        // === SHADOW LINK ===
        if (
          msg.text &&
          /(hxxp|h\.t\.t\.p|h\*ttp|h_t_t_p)/i.test(msg.text) &&
          !isAdmin(chat, user)
        ) {
          return warnSystem(msg, user, chat, "SHADOW_LINK");
        }

        // === BLOCK LINK ===
        if (
          settings[chat].camlink &&
          msg.text &&
          /(http|https)/.test(msg.text) &&
          !isAdmin(chat, user)
        ) {
          return warnSystem(msg, user, chat, "LINK_BLOCK");
        }

        // === BLOCK IMAGE ===
        if (settings[chat].camanh && msg.photo && !isAdmin(chat, user)) {
          return warnSystem(msg, user, chat, "IMAGE_BLOCK");
        }

        // === BLOCK FILE ===
        if (settings[chat].camfile && msg.document && !isAdmin(chat, user)) {
          return warnSystem(msg, user, chat, "FILE_BLOCK");
        }
      });

      // ==========================================
      // WARNING SYSTEM
      // ==========================================
      async function warnSystem(msg, user, group, reason) {
        if (!warns[group]) warns[group] = {};
        warns[group][user] = (warns[group][user] || 0) + 1;

        const level = warns[group][user];

        logEvent({
          event: "THREAT",
          user,
          group,
          level,
          reason,
          text: msg.text || null,
        });

        const durations = {
          1: 5 * 60,
          2: 30 * 60,
          3: 120 * 60,
        };

        if (level >= 4) {
          await bot.kickChatMember(group, user);
          return bot.sendMessage(
            group,
            redAlertUI(`
CRITICAL THREAT NEUTRALIZED
USER: ${user}
LEVEL: 4
${matrixEffect}`),
            { parse_mode: "HTML" }
          );
        }

        await bot.restrictChatMember(group, user, {
          permissions: { can_send_messages: false },
          until_date: Math.floor(Date.now() / 1000) + durations[level],
        });

        bot.sendMessage(
          group,
          redAlertUI(`
THREAT LEVEL: ${level}/4
REASON: ${reason}
USER: ${user}
MUTED: ${durations[level] / 60} minutes
AVATAR: ${cyberAvatar()}
`),
          { parse_mode: "HTML" }
        );
      }

      // ==========================================
      // /time <seconds>
// ==========================================
bot.onText(/\/time(?: (.+))?/, (msg, match) => {
  const group = msg.chat.id;
  const user = msg.from.id;

  if (!isAdmin(group, user)) {
    return bot.sendMessage(
      group,
      terminalUI("> ACCESS DENIED"),
      { parse_mode: "HTML" }
    );
  }

  const value = match[1] ? Number(match[1]) : null;

  if (!value || isNaN(value) || value < 1) {
    return bot.sendMessage(
      group,
      terminalUI("USAGE:\n/time <seconds>\nEXAMPLE:\n/time 10"),
      { parse_mode: "HTML" }
    );
  }

  settings[group].time = value * 1000;

  bot.sendMessage(
    group,
    terminalUI(`ANTI-SPAM DELAY SET TO: ${value} seconds`),
    { parse_mode: "HTML" }
  );
});
// ==========================================
// HACKER OMEGA MODE — PART 3/4
// ==========================================

// ========== /unmutes ==========
bot.onText(/\/unmutes(?: (.+))?/, async (msg, match) => {
  const group = msg.chat.id;
  if (!isAdmin(group, msg.from.id)) return;

  let id = null;

  if (msg.reply_to_message) id = msg.reply_to_message.from.id;
  else if (match[1]) id = Number(match[1].replace("@", ""));

  if (!id) {
    return bot.sendMessage(group, terminalUI("> ERROR: NO USER"), {
      parse_mode: "HTML",
    });
  }

  try {
    await bot.restrictChatMember(group, id, {
      permissions: {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      },
      until_date: 0,
    });

    bot.sendMessage(group, terminalUI(`> USER UNMUTED: ${id}`), {
      parse_mode: "HTML",
    });
  } catch {
    bot.sendMessage(group, terminalUI("> FAILED"), { parse_mode: "HTML" });
  }
});

// ========== /kick ==========
bot.onText(/\/kick (.+)/, async (msg, match) => {
  const group = msg.chat.id;
  if (!isAdmin(group, msg.from.id)) return;

  const id = match[1].replace("@", "");

  try {
    await bot.kickChatMember(group, id);

    bot.sendMessage(group, terminalUI(`> USER KICKED: ${id}`), {
      parse_mode: "HTML",
    });
  } catch {
    bot.sendMessage(group, terminalUI("> KICK FAILED"), {
      parse_mode: "HTML",
    });
  }
});

// ========== /addadmin ==========
bot.onText(/\/addadmin (.+)/, (msg, match) => {
  const group = msg.chat.id;
  if (!isAdmin(group, msg.from.id)) return;

  const id = Number(match[1].replace("@", ""));

  if (!admins[group]) admins[group] = [];
  if (!admins[group].includes(id)) admins[group].push(id);

  bot.sendMessage(group, terminalUI(`> NEW ADMIN: ${id}`), {
    parse_mode: "HTML",
  });
});

// ========== /kickadmin ==========
bot.onText(/\/kickadmin (.+)/, (msg, match) => {
  const group = msg.chat.id;
  if (!isAdmin(group, msg.from.id)) return;

  const id = Number(match[1].replace("@", ""));
  admins[group] = admins[group]?.filter((x) => x !== id);

  bot.sendMessage(group, terminalUI(`> ADMIN REMOVED: ${id}`), {
    parse_mode: "HTML",
  });
});

// ========== id commands ==========
bot.onText(/\/idnhom/, (msg) => {
  bot.sendMessage(msg.chat.id, terminalUI(`GROUP ID: ${msg.chat.id}`), {
    parse_mode: "HTML",
  });
});

bot.onText(/\/iduser/, (msg) => {
  const id = msg.reply_to_message?.from.id;

  bot.sendMessage(msg.chat.id, terminalUI(`USER ID: ${id}`), {
    parse_mode: "HTML",
  });
});

// ========== Security Toggles ==========
bot.onText(/\/camlink/, (msg) => {
  if (!isAdmin(msg.chat.id, msg.from.id)) return;
  settings[msg.chat.id].camlink = true;

  bot.sendMessage(msg.chat.id, terminalUI("> LINK BLOCKING ENABLED"), {
    parse_mode: "HTML",
  });
});

bot.onText(/\/golink/, (msg) => {
  if (!isAdmin(msg.chat.id, msg.from.id)) return;
  settings[msg.chat.id].camlink = false;

  bot.sendMessage(msg.chat.id, terminalUI("> LINK BLOCKING DISABLED"), {
    parse_mode: "HTML",
  });
});

bot.onText(/\/camanh/, (msg) => {
  if (!isAdmin(msg.chat.id, msg.from.id)) return;
  settings[msg.chat.id].camanh = true;

  bot.sendMessage(msg.chat.id, terminalUI("> IMAGE BLOCKING ENABLED"), {
    parse_mode: "HTML",
  });
});

bot.onText(/\/goanh/, (msg) => {
  settings[msg.chat.id].camanh = false;

  bot.sendMessage(msg.chat.id, terminalUI("> IMAGE BLOCKING DISABLED"), {
    parse_mode: "HTML",
  });
});

bot.onText(/\/camfile/, (msg) => {
  if (!isAdmin(msg.chat.id, msg.from.id)) return;
  settings[msg.chat.id].camfile = true;

  bot.sendMessage(msg.chat.id, terminalUI("> FILE BLOCKING ENABLED"), {
    parse_mode: "HTML",
  });
});

bot.onText(/\/gofile/, (msg) => {
  settings[msg.chat.id].camfile = false;

  bot.sendMessage(msg.chat.id, terminalUI("> FILE BLOCKING DISABLED"), {
    parse_mode: "HTML",
  });
});
// ==========================================
// HACKER OMEGA MODE — PART 4/4
// ==========================================

// ========== /system (dashboard) ==========
bot.onText(/\/system/, (msg) => {
  if (!isAdmin(msg.chat.id, msg.from.id)) return;

  const group = msg.chat.id;
  const blocked =
    Object.entries(warns[group] || {})
      .filter(([_, lvl]) => lvl >= 1)
      .map(([id]) => id)
      .join(", ") || "None";

  bot.sendMessage(
    msg.chat.id,
    terminalUI(`
SYSTEM DASHBOARD
Admins: ${esc(JSON.stringify(admins[group] || []))}
Ghost Mode: ${ghostMode ? "ON" : "OFF"}
Blocked Users: ${blocked}
Log Size: ${securityLog.length}
Firewall: ACTIVE
Threat Engine: ONLINE
    `),
    { parse_mode: "HTML" }
  );
});

// ========== /log (security log) ==========
bot.onText(/\/log/, (msg) => {
  if (msg.from.id !== MAIN_ADMIN) return;

  if (securityLog.length === 0) {
    return bot.sendMessage(msg.chat.id, terminalUI("> LOG EMPTY"), {
      parse_mode: "HTML",
    });
  }

  const txt = securityLog
    .map(
      (e) =>
        `${e.time} | ${e.event} | USER: ${e.user || "-"} | LVL: ${
          e.level || "-"
        } | ${e.reason || ""}`
    )
    .join("\n");

  bot.sendMessage(msg.chat.id, `<pre>${esc(txt)}</pre>`, {
    parse_mode: "HTML",
  });
});

// ========== /ghost on|off ==========
bot.onText(/\/ghost (.+)/, (msg, match) => {
  if (msg.from.id !== MAIN_ADMIN) return;

  ghostMode = match[1] === "on";

  bot.sendMessage(
    msg.chat.id,
    terminalUI(`> GHOST MODE: ${ghostMode ? "ENABLED" : "DISABLED"}`),
    { parse_mode: "HTML" }
  );
});

// ==========================================
// FINAL TELEGRAM UPDATE PROCESSOR
// ==========================================
}

if (event.body) {
  const update = JSON.parse(event.body);
  await bot.processUpdate(update);
}

return {
  statusCode: 200,
  body: JSON.stringify({ ok: true }),
};

} catch (err) {
  console.error("BOT ERROR:", err);

  return {
    statusCode: 500,
    body: JSON.stringify({
      ok: false,
      error: err.message,
    }),
  };
}
};
