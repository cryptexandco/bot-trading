const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const cron = require("node-cron");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1476694169240993793";
const NEWS_API = process.env.NEWS_API;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


// =========================
// 🗞️ NEWS MACRO
// =========================
async function getMacroNews() {
  try {
    const url = `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=20&apiKey=${NEWS_API}`;
    const res = await axios.get(url);

    const keywords = [
      "inflation",
      "interest rate",
      "fed",
      "central bank",
      "cpi",
      "fomc",
      "nfp",
      "employment",
      "recession",
      "gdp"
    ];

    const filtered = res.data.articles.filter(a => {
      const title = a.title.toLowerCase();
      return keywords.some(k => title.includes(k));
    });

    return filtered.map(a => ({
      title: a.title,
      source: a.source.name
    }));

  } catch (err) {
    console.log("Erreur API news:", err.message);
    return [];
  }
}


// =========================
// 📊 BIAS
// =========================
function generateBias(news) {
  let score = 0;

  news.forEach(n => {
    const text = n.title.toLowerCase();

    if (text.includes("inflation")) score -= 2;
    if (text.includes("rate hike")) score -= 2;
    if (text.includes("hawkish")) score -= 1;

    if (text.includes("rate cut")) score += 2;
    if (text.includes("dovish")) score += 1;
    if (text.includes("growth")) score += 1;
  });

  let sentiment = "Neutral";
  if (score >= 2) sentiment = "Bullish (Risk-On)";
  if (score <= -2) sentiment = "Bearish (Risk-Off)";

  return { score, sentiment };
}


// =========================
// ⚡ VOLATILITY
// =========================
function calculateVolatility(news) {
  let score = 0;

  news.forEach(n => {
    const t = n.title.toLowerCase();

    if (t.includes("cpi") || t.includes("inflation")) score += 3;
    if (t.includes("nfp") || t.includes("employment")) score += 3;
    if (t.includes("fed") || t.includes("fomc")) score += 2;
    if (t.includes("recession")) score += 2;
  });

  if (score >= 6) return "🔥 High Volatility Expected";
  if (score >= 3) return "⚠️ Medium Volatility";
  return "⚖️ Low Volatility";
}


// =========================
// 🧾 FORMAT MESSAGE
// =========================
function formatMessage(news, biasData, volatility) {
  let msg = `📊 **Macro Report (Clean)**\n\n`;

  msg += `📌 **Bias Score**: ${biasData.score}\n`;
  msg += `🧠 **Sentiment**: ${biasData.sentiment}\n`;
  msg += `⚡ **Volatility**: ${volatility}\n\n`;

  msg += `🔥 **Top Macro News**:\n`;

  if (news.length === 0) {
    msg += `No major macro news.\n`;
  } else {
    news.slice(0, 5).forEach((n, i) => {
      msg += `\n${i + 1}. ${n.title} (${n.source})`;
    });
  }

  msg += `\n\n⚠️ Wait for confirmations before trading.`;

  return msg;
}


// =========================
// 🤖 BOT READY
// =========================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel) {
      await channel.send("✅ Bot connecté et opérationnel !");
    }
  } catch (err) {
    console.error(err);
  }
});


// =========================
// 💬 COMMAND !macro
// =========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!macro") {
    const news = await getMacroNews();

    const biasData = generateBias(news);
    const volatility = calculateVolatility(news);

    const msg = formatMessage(news, biasData, volatility);

    message.channel.send(msg);
  }
});


// =========================
// ⏰ CRON JOBS
// =========================

// Morning
cron.schedule("0 4 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const biasData = generateBias(news);
  const volatility = calculateVolatility(news);

  const message = formatMessage(news, biasData, volatility);

  channel.send("📊 **Morning Macro Briefing**\n\n" + message);
});


// US Session
cron.schedule("30 11 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const biasData = generateBias(news);
  const volatility = calculateVolatility(news);

  const message = formatMessage(news, biasData, volatility);

  channel.send("🗞️ **US Session Update**\n\n" + message);
});


// =========================
// LOGIN
// =========================
client.login(TOKEN);
