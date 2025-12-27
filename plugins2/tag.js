const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const handler = async (msg, { conn, args }) => {
  const rawID = conn.user?.id || "";
  const botNumber = rawID.split(":")[0] + "@s.whatsapp.net";

  const chatId = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;

  if (!chatId.endsWith("@g.us")) {
    return conn.sendMessage(chatId, {
      text: "⚠️ *Este comando solo funciona en grupos.*"
    }, { quoted: msg });
  }

  const metadata = await conn.groupMetadata(chatId);
  const participants = metadata.participants;

  const participant = participants.find(p => p.id === senderJid);
  const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
  const isBot = senderJid === botNumber;

  if (!isAdmin && !isBot) {
    return conn.sendMessage(chatId, {
      text: "❌ Solo admins o el bot pueden usar este comando."
    }, { quoted: msg });
  }

  let messageToForward = null;
  let hasMedia = false;

  if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;

    const type = Object.keys(quoted)[0];
    const stream = await downloadContentFromMessage(quoted[type], type.replace("Message", ""));
    let buffer = Buffer.alloc(0);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    messageToForward = {
      [type.replace("Message", "")]: buffer,
      caption: quoted[type]?.caption || ""
    };
    hasMedia = true;
  }

  if (!hasMedia && args.join(" ").trim()) {
    messageToForward = { text: args.join(" ") };
  }

  if (!messageToForward) {
    return conn.sendMessage(chatId, {
      text: "⚠️ ¿Y el texto o el mensaje a citar?"
    }, { quoted: msg });
  }

  await conn.sendMessage(chatId, {
    ...messageToForward,
    mentions: participants.map(p => p.id)
  }, { quoted: msg });
};

handler.command = ["n"];
module.exports = handler;
