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
//
// This prevents Telegram from crashing when
// text contains: <id>, <user>, <123>
// ==========================================
function esc(s) {
  if (!s) return "";
  return s
    .toString()
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
// TERMINAL UI (auto escape)
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
// RED ALERT UI (auto escape)
// ==========================================
const redAlertUI = (txt) =>
`<pre>
███████████████  RED ALERT MODE  ███████████████
${esc(txt)}

${matrixEffect}
██ SYSTEM: THREAT ISOLATED ██
</pre>`;

// ==========================================
// CYBER AVATAR GENERATOR
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
// IS ADMIN CHECK
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

      // ======================================================
      // AUTO ADMIN WHEN BOT IS ADDED TO GROUP
      // ======================================================
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
              terminalUI(`> NEW ADMIN REGISTERED: ${msg.from.id}\n> ACCESS: GRANTED`),
              { parse_mode: "HTML" }
            );
          }
        });
      });

      // ======================================================
      // MESSAGE HANDLER (MAIN ENGINE)
      // ======================================================
      bot.on("message", async (msg) => {
        const user = msg.from.id;
        const chat = msg.chat.id;
        const type = msg.chat.type;

        // -----------------------------------------------
        // PRIVATE CHAT RESTRICTION (except MAIN_ADMIN)
        // -----------------------------------------------
        if (type === "private" && user !== MAIN_ADMIN) {
          return bot.sendMessage(
            user,
            terminalUI("> ACCESS DENIED\n> PRIVATE MODE DISABLED"),
            { parse_mode: "HTML" }
          );
        }

        // -----------------------------------------------
        // GHOST MODE — bot becomes INVISIBLE
        // -----------------------------------------------
        if (ghostMode && user !== MAIN_ADMIN) {
          logEvent({ event: "GHOST_CAPTURE", user, group: chat });
          return; // do NOT respond
        }

        // -----------------------------------------------
        // GROUP PROTECTION ACTIVE
        // -----------------------------------------------
        if (type !== "private") {
          if (!settings[chat]) {
            settings[chat] = {
              camlink: false,
              camanh: false,
              camfile: false,
            };
          }

          // ================================
          // SPEED SPAM DETECTOR
          // ================================
          if (!msgSpeed[user]) msgSpeed[user] = { count: 0, last: 0 };
          const now = Date.now();

          if (now - msgSpeed[user].last < 500) {
            msgSpeed[user].count++;
          } else {
            msgSpeed[user].count = 1;
          }
          msgSpeed[user].last = now;

          if (msgSpeed[user].count >= 4 && !isAdmin(chat, user)) {
            return warnSystem(msg, user, chat, "SPEED_SPAM");
          }

          // ================================
          // PATTERN SPAM DETECTOR (aaaaaa, !!!!!)
          // ================================
          if (msg.text && /(.)\1{6,}/.test(msg.text) && !isAdmin(chat, user)) {
            return warnSystem(msg, user, chat, "PATTERN_SPAM");
          }

          // ================================
          // SHADOW LINK DETECTOR (hxxp, h*t*t*p)
          // ================================
          if (
            msg.text &&
            /(hxxp|h\.t\.t\.p|h\*ttp|h_t_t_p)/i.test(msg.text) &&
            !isAdmin(chat, user)
          ) {
            return warnSystem(msg, user, chat, "SHADOW_LINK");
          }

          // ================================
          // NORMAL LINK BLOCKER
          // ================================
          if (
            settings[chat].camlink &&
            msg.text &&
            /(http|https)/.test(msg.text)
          ) {
            if (!isAdmin(chat, user)) {
              return warnSystem(msg, user, chat, "LINK_BLOCK");
            }
          }

          // ================================
          // BLOCK IMAGES
          // ================================
          if (settings[chat].camanh && msg.photo && !isAdmin(chat, user)) {
            return warnSystem(msg, user, chat, "IMAGE_BLOCK");
          }

          // ================================
          // BLOCK FILES
          // ================================
          if (settings[chat].camfile && msg.document && !isAdmin(chat, user)) {
            return warnSystem(msg, user, chat, "FILE_BLOCK");
          }
        }
      });

      // ======================================================
      // THREAT & WARNING SYSTEM
      // ======================================================
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

        // ================================
        // CRITICAL THREAT (LEVEL 4)
        // ================================
        if (level >= 4) {
          await bot.kickChatMember(group, user);

          return bot.sendMessage(
            group,
            redAlertUI(`
CRITICAL THREAT NEUTRALIZED
USER: ${user}
CLASS: OMEGA LVL 4
${matrixEffect}`),
            { parse_mode: "HTML" }
          );
        }

        // ================================
        // TEMP BAN — MUTED
        // ================================
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
TEMP BAN: ${durations[level] / 60} MINUTES
AVATAR: ${cyberAvatar()}
`),
          { parse_mode: "HTML" }
        );
      }

      // ======================================================
      // HELP MENU
      // ======================================================
      bot.onText(/\/help/, (msg) => {
        bot.sendMessage(
          msg.chat.id,
          terminalUI(`
AVAILABLE COMMANDS:
/help
/idnhom
/iduser (reply)

/ADMIN:
/addadmin <id>
/kickadmin <id>
/kick <id|reply>

/UNBAN:
/unmutes <id|reply>

/SECURITY:
/camlink /golink
/camanh  /goanh
/camfile /gofile

/ANTISPAM:
/time <seconds>

/SYSTEM:
/log
/system
/ghost on|off
`),
          { parse_mode: "HTML" }
        );
      });
// ==========================================
// HACKER OMEGA MODE — PART 3/4
// ==========================================

// ======================================================
// UNMUTES (REMOVE MUTE IMMEDIATELY)
// ======================================================
      bot.onText(/\/unmutes(?: (.+))?/, async (msg, match) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;

        let id = null;

        if (msg.reply_to_message) {
          id = msg.reply_to_message.from.id;
        } else if (match[1]) {
          id = Number(match[1].replace("@", ""));
        }

        if (!id) {
          return bot.sendMessage(
            group,
            terminalUI("> ERROR: NO TARGET FOUND"),
            { parse_mode: "HTML" }
          );
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

          bot.sendMessage(
            group,
            terminalUI(`> USER UNMUTED: ${id}\n> STATUS: SUCCESS`),
            { parse_mode: "HTML" }
          );
        } catch {
          bot.sendMessage(
            group,
            terminalUI(`> USER UNMUTED: ${id}\n> STATUS: FAILED`),
            { parse_mode: "HTML" }
          );
        }
      });

// ======================================================
// KICK USER
// ======================================================
      bot.onText(/\/kick (.+)/, async (msg, match) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;

        const id = match[1].replace("@", "");

        try {
          await bot.kickChatMember(group, id);

          logEvent({
            event: "KICK",
            user: id,
            group,
            by: msg.from.id,
          });

          bot.sendMessage(group, terminalUI(`> KICKED USER: ${id}`), {
            parse_mode: "HTML",
          });
        } catch {
          bot.sendMessage(group, terminalUI("> KICK FAILED"), {
            parse_mode: "HTML",
          });
        }
      });

// ======================================================
// ADD ADMIN
// ======================================================
      bot.onText(/\/addadmin (.+)/, (msg, match) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;

        const id = Number(match[1].replace("@", ""));

        if (!admins[group]) admins[group] = [];
        if (!admins[group].includes(id)) admins[group].push(id);

        logEvent({
          event: "ADD_ADMIN",
          admin: id,
          by: msg.from.id,
          group,
        });

        bot.sendMessage(group, terminalUI(`> NEW ADMIN ADDED: ${id}`), {
          parse_mode: "HTML",
        });
      });

// ======================================================
// REMOVE ADMIN
// ======================================================
      bot.onText(/\/kickadmin (.+)/, (msg, match) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;

        const id = Number(match[1].replace("@", ""));
        admins[group] = admins[group]?.filter((x) => x !== id);

        logEvent({
          event: "REMOVE_ADMIN",
          admin: id,
          by: msg.from.id,
        });

        bot.sendMessage(group, terminalUI(`> ADMIN REMOVED: ${id}`), {
          parse_mode: "HTML",
        });
      });

// ======================================================
// ID COMMANDS
// ======================================================
      bot.onText(/\/idnhom/, (msg) => {
        bot.sendMessage(
          msg.chat.id,
          terminalUI(`> GROUP ID: ${msg.chat.id}`),
          { parse_mode: "HTML" }
        );
      });

      bot.onText(/\/iduser/, (msg) => {
        const id = msg.reply_to_message?.from.id;

        bot.sendMessage(
          msg.chat.id,
          terminalUI(`> USER ID: ${id}`),
          { parse_mode: "HTML" }
        );
      });

// ======================================================
// SECURITY TOGGLES
// ======================================================
      bot.onText(/\/camlink/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;
        settings[group].camlink = true;

        bot.sendMessage(
          group,
          terminalUI("> LINK BLOCKING: ENABLED"),
          { parse_mode: "HTML" }
        );
      });

      bot.onText(/\/golink/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;
        settings[group].camlink = false;

        bot.sendMessage(
          group,
          terminalUI("> LINK BLOCKING: DISABLED"),
          { parse_mode: "HTML" }
        );
      });

      bot.onText(/\/camanh/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;
        settings[group].camanh = true;

        bot.sendMessage(
          group,
          terminalUI("> IMAGE BLOCKING: ENABLED"),
          { parse_mode: "HTML" }
        );
      });

      bot.onText(/\/goanh/, (msg) => {
        const group = msg.chat.id;
        settings[group].camanh = false;

        bot.sendMessage(
          group,
          terminalUI("> IMAGE BLOCKING: DISABLED"),
          { parse_mode: "HTML" }
        );
      });

      bot.onText(/\/camfile/, (msg) => {
        const group = msg.chat.id;
        if (!isAdmin(group, msg.from.id)) return;
        settings[group].camfile = true;

        bot.sendMessage(
          group,
          terminalUI("> FILE BLOCKING: ENABLED"),
          { parse_mode: "HTML" }
        );
      });

      bot.onText(/\/gofile/, (msg) => {
        const group = msg.chat.id;
        settings[group].camfile = false;

        bot.sendMessage(
          group,
          terminalUI("> FILE BLOCKING: DISABLED"),
          { parse_mode: "HTML" }
        );
      });
// ==========================================
// HACKER OMEGA MODE — PART 4/4
// ==========================================

// ======================================================
// SYSTEM DASHBOARD
// ======================================================
      bot.onText(/\/system/, (msg) => {
        if (!isAdmin(msg.chat.id, msg.from.id)) return;

        const group = msg.chat.id;

        const blockedUsers =
          Object.entries(warns[group] || {})
            .filter(([_, lvl]) => lvl >= 1)
            .map(([id]) => id)
            .join(", ") || "None";

        bot.sendMessage(
          msg.chat.id,
          terminalUI(`
SYSTEM DASHBOARD
--------------------------
Admins: ${esc(JSON.stringify(admins[group] || []))}
Ghost Mode: ${ghostMode ? "ON" : "OFF"}
Blocked Users: ${blockedUsers}
Security Events Logged: ${securityLog.length}
Firewall: ENABLED
Threat Engine: ACTIVE
Fingerprint: ENABLED
--------------------------
BOT STATUS: OPTIMAL
`),
          { parse_mode: "HTML" }
        );
      });

// ======================================================
// SECURITY LOG VIEWER
// ======================================================
      bot.onText(/\/log/, (msg) => {
        if (msg.from.id !== MAIN_ADMIN) return;

        if (securityLog.length === 0) {
          return bot.sendMessage(
            msg.chat.id,
            terminalUI("> SECURITY LOG EMPTY"),
            { parse_mode: "HTML" }
          );
        }

        let txt = securityLog
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

// ======================================================
// GHOST MODE (INVISIBLE BOT)
// ======================================================
      bot.onText(/\/ghost (.+)/, (msg, match) => {
        if (msg.from.id !== MAIN_ADMIN) return;

        const mode = match[1];

        if (mode === "on") ghostMode = true;
        if (mode === "off") ghostMode = false;

        bot.sendMessage(
          msg.chat.id,
          terminalUI(`> GHOST MODE: ${ghostMode ? "ENABLED" : "DISABLED"}`),
          { parse_mode: "HTML" }
        );
      });

// ======================================================
// PROCESS TELEGRAM UPDATE
// ======================================================
    }

    // If webhook sends update, process it
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
