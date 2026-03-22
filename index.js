const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const cron = require("node-cron");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1476694169240993793";
const NEWS_API = process.env.NEWS_API;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// 🔎 Fonction récupération news macro
async function getMacroNews() {
  try {
    const url = `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=5&apiKey=${process.env.NEWS_API}`;
    const res = await axios.get(url);

    return res.data.articles.map(a => ({
      title: a.title,
      source: a.source.name
    }));
  } catch (err) {
    console.log("Erreur API news:", err.message);
    return [];
  }
}

// 📊 Génération biais simple (placeholder intelligent)
function generateBias(news) {
  let score = 0;

  news.forEach(n => {
    const text = n.title.toLowerCase();

    // 🔴 Bearish (risk-off / USD strong)
    if (text.includes("inflation")) score -= 2;
    if (text.includes("rate hike")) score -= 2;
    if (text.includes("hawkish")) score -= 1;

    // 🟢 Bullish (risk-on)
    if (text.includes("rate cut")) score += 2;
    if (text.includes("dovish")) score += 1;
    if (text.includes("growth")) score += 1;
  });

  let sentiment = "Neutral";
  if (score >= 2) sentiment = "Bullish (Risk-On)";
  if (score <= -2) sentiment = "Bearish (Risk-Off)";

  return { score, sentiment };
}

// 🧾 Format message pro pour élèves
function formatMessage(news, biasData) {
  let msg = `📊 **Daily Macro Briefing**\n\n`;

  msg += `📌 **Bias Score**: ${biasData.score}\n`;
  msg += `🧠 **Sentiment**: ${biasData.sentiment}\n\n`;

  msg += `🗞️ **Top Macro News**:\n`;

  news.slice(0, 5).forEach((n, i) => {
    msg += `\n${i + 1}. ${n.title} (${n.source})`;
  });

  msg += `\n\n💱 **Focus Assets**:\n`;
  msg += `- XAU/USD\n- EUR/USD\n- NAS100\n\n`;

  msg += `⚠️ Trade with confirmation only.`;

  return msg;
}

// 🚀 Bot prêt
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (channel) {
      await channel.send("✅ Bot connecté et opérationnel !");
      console.log("Message envoyé");
    } else {
      console.log("Channel introuvable");
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi du message :", error);
  }
});


// 📊 Morning Macro (08:00 Dubai = 04:00 UTC)
cron.schedule("0 4 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const bias = generateBias(news);

  channel.send("📊 **Morning Macro Briefing (Dubai 08:00)**\n\n" + message);
});

// 🗞️ US Update (15:30 Dubai = 11:30 UTC)
cron.schedule("30 11 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const biasData = generateBias(news);
const message = formatMessage(news, biasData);

  channel.send("🗞️ **US Session Update (Dubai 15:30)**\n\n" + message);
});

client.login(TOKEN);
