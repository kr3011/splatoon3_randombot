// discord.js v14+ 표준 예시 (최신 가이드 참고)
const { Client, GatewayIntentBits, Events } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, /* ...필요 인텐트 */] });

client.once(Events.ClientReady, c => console.log(`Ready! ${c.user.tag}`));
// ...코드 
client.login('TOKEN');
