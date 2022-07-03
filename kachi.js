const { Discord, Client, Guild, GuildChannel, TextChannel, MessageEmbed } = require("discord.js");
const mongoose = require("mongoose");
const { async } = require("regenerator-runtime");
const kachi = require("./kachi.json");
const client = new Client();
const Bots = global.Bots = [];
const backup = require("./models/rolBackup");


// MongoDB

mongoose.set('useFindAndModify', false);

mongoose.connect("MONGODB", { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

mongoose.connection.on("connected", () => {
    console.log("[DB] Database bağlantısı tamamlandı!")
});

let Tokens = [
  kachi.Tokens.token1,
  kachi.Tokens.token2,
  kachi.Tokens.token3,
  kachi.Tokens.token4,
  kachi.Tokens.token5
]

Tokens.forEach(token => {
  
    let bot = new Client();

    bot.on("ready", () => {
        console.log(`${bot.user.tag} botu yardımcı bot olarak aktif!`);
        bot.Busy = false;
        bot.Uj = 0;
        Bots.push(bot);
        bot.channels.cache.get(kachi.botVoice).join();
        bot.user.setPresence({ activity: { name: "Rol dağıtım botu, Kachi <3" }});
    });

    bot.login(token).then(e => {
    }).catch(e => {
        console.error(`${token.substring(Math.floor(token.length / 2))} botu giriş yapamadı!`);
    });
});

client.on("ready", async () => {
    console.log("Ana bot aktifleştirildi");
    client.channels.cache.get(kachi.botVoice).join();
    client.user.setPresence({ activity: { name: kachi.botActivity }, status: "idle" });
  
    roleBackup();
  
    setInterval(() => {
      roleBackup();
    }, 1000*60*60*1);
});

client.on("message", async message => {
    let embed = new MessageEmbed().setColor("RANDOM").setFooter(kachi.footer)
    if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith(kachi.botPrefix)) return;
    if (message.author.id !== kachi.botOwner) return;
    let args = message.content.split(' ').slice(1);
    let command = message.content.split(' ')[0].slice(kachi.botPrefix.length);
  
    if (command === "eval" && message.author.id === kachi.botOwner) {
      if (!args[0]) return message.channel.send(`Lütfen bir eval komutu gir!`);
        let code = args.join(' ');
        function clean(text) {
        if (typeof text !== 'string') text = require('util').inspect(text, { depth: 0 })
        text = text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203))
        return text;
      };
      try { 
        var evaled = clean(await eval(code));
        if(evaled.match(new RegExp(`${client.token}`, 'g'))) evaled.replace(client.token, "Komut, bot sahibi tarafından yasaklandı!");
        message.channel.send(`${evaled.replace(client.token, "Komut, bot sahibi tarafından yasaklandı!")}`, { code: "js", split: true });
      } catch(err) { 
        message.channel.send(err, { code: "js", split: true }) 
      };
    };

if (command === "manuel-yedek" && message.author.id === kachi.botOwner) {

await backup.deleteMany({ });

if(backup) {
  await backup.deleteMany({ });
}

message.guild.roles.cache.filter(r => r.name !== "@everyone" && !r.managed).forEach(async role => {
  
  let roleChannelOverwrites = [];
  message.guild.channels.cache.filter(c => c.permissionOverwrites.has(role.id)).forEach(c => {
    
     let channelPerm = c.permissionOverwrites.get(role.id);
    
     let pushlanacak = { 
       id: c.id, 
       allow: channelPerm.allow.toArray(), 
       deny: channelPerm.deny.toArray() 
     };
    
     roleChannelOverwrites.push(pushlanacak);
  });
  
   await new backup({
     
     _id: new mongoose.Types.ObjectId(),
     guildID: kachi.Guild,
     roleID: role.id,
     name: role.name,
     color: role.hexColor,
     hoist: role.hoist,
     position: role.position,
     permissions: role.permissions,
     mentionable: role.mentionable,
     time: Date.now(),
     members: role.members.map(m => m.id),
     channelOverwrites: roleChannelOverwrites
   }).save();
 })        
  message.channel.send("Manuel yedek alma işlemi başarılı bir şekilde tamamlandı!");
  client.channels.cache.get(kachi.Log).send("[MANUEL] Manuel yedek alma işlemi başarılı bir şekilde tamamlandı!");
}
    
  if(command === "rolkur" && message.author.id === kachi.botOwner) {
    if (!args[0] || isNaN(args[0])) return message.channel.send(embed.setDescription("Lütfen kurulumu yapılacak geçerli bir rol ID'si belirtin!"));

    backup.findOne({
      guildID: kachi.Guild, 
      roleID: args[0]
    }, async (err, roleData) => {

        
      let yeniRol = await message.guild.roles.create({
        data: {
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist,
          permissions: roleData.permissions,
          position: roleData.position,
          mentionable: roleData.mentionable
        },
        reason: "Rol dağıtılacağı için tekrar oluşturuldu."
      });
      message.channel.send(embed.setDescription(`${yeniRol} rolüne ait kurulum **başarılı bir şekilde tamamlandı!** \n- Rolü dağıtmak için: \`${kachi.botPrefix}backup ${args[0]} <@&${yeniRol.id}>\``));
    })
  }

  if(command === "backup" && message.author.id === kachi.botOwner) {
      
    let rol = message.mentions.roles.first() || client.users.cache.get(args[0]);
    if (!args[0] || isNaN(args[0])) return message.channel.send(embed.setDescription("Lütfen botlarla dağıtılacak geçerli bir rol ID'si belirtin!"));
    
    let data = await backup.findOne({
      guildID: kachi.Guild, 
      roleID: args[0]
    })
    
    if(!data) return message.channel.send(embed.setDescription(`Yazdığınız ID'ye ait geçerli bir rol verisi bulunamadı!`));

    setTimeout(() => {
      let kanalPermVeri = data.channelOverwrites;
      if (kanalPermVeri) kanalPermVeri.forEach((perm, index) => {
        let kanal = message.guild.channels.cache.get(perm.id);
        if (!kanal) return;
        setTimeout(() => {
          let yeniKanalPermVeri = {};
          perm.allow.forEach(p => {
            yeniKanalPermVeri[p] = true;
          });
          perm.deny.forEach(p => {
            yeniKanalPermVeri[p] = false;
          });
          kanal.createOverwrite(rol, yeniKanalPermVeri).catch(console.error);
        }, index*5000);
      });
    }, 5000);
    
    let length = data.members.length;
      if(length <= 0) return console.log(`${rol.id} rolünde hiçbir kullanıcı olmadığı için rol dağıtım işlemi durduruldu!`);
      if(length <= 0) return message.channel.send(`**${rol.id}** rolünde hiçbir kullanıcı olmadığından dolayı rol dağıtım işlemi iptal edildi!`);
      let availableBots = Bots.filter(e => !e.Busy);
      if(availableBots.length <= 0) availableBots = Bots.sort((x,y) => y.Uj - x.Uj).slice(0, Math.round(length / Bots.length));
      let perAnyBotMembers = Math.floor(length / availableBots.length);
      if(perAnyBotMembers < 1) perAnyBotMembers = 1;
      for ( let index = 0; index < availableBots.length; index++ ) {
          const bot = availableBots[index];
          let ids = data.members.slice(index * perAnyBotMembers, (index + 1) * perAnyBotMembers);
          if(ids.length <= 0) {processBot(bot, false, -perAnyBotMembers); break;}
          let guild = bot.guilds.cache.first();
          message.channel.send(`Kurulum başlıyor..! **${bot.user.tag}** botu rol dağıtmaya hazırlanıyor...`)
          ids.every(async id => {
              let member = guild.member(id);
              if(!member){
                  return true;
              }
              setTimeout(async() => {
                if(member.roles.cache.has(rol.id)) return
                await member.roles.add(rol.id)
            }, index*1250);
          });
          processBot(bot, false, -perAnyBotMembers);
      }}
});

function roleBackup(){
  
  let guild = client.guilds.cache.get(kachi.Guild);
  
  backup.deleteMany({ });

if(backup) {
  backup.deleteMany({ });
}

  guild.roles.cache.filter(r => r.name !== "@everyone" && !r.managed).forEach(async role => {
  
    let roleChannelOverwrites = [];
    guild.channels.cache.filter(c => c.permissionOverwrites.has(role.id)).forEach(c => {
    
     let channelPerm = c.permissionOverwrites.get(role.id);
    
     let pushlanacak = { 
       id: c.id, 
       allow: channelPerm.allow.toArray(), 
       deny: channelPerm.deny.toArray() 
     };
    
     roleChannelOverwrites.push(pushlanacak);
  });
  
   await new backup({
     
     _id: new mongoose.Types.ObjectId(),
     guildID: kachi.Guild,
     roleID: role.id,
     name: role.name,
     color: role.hexColor,
     hoist: role.hoist,
     position: role.position,
     permissions: role.permissions,
     mentionable: role.mentionable,
     time: Date.now(),
     members: role.members.map(m => m.id),
     channelOverwrites: roleChannelOverwrites
   }).save();
 });
  
  client.channels.cache.get(kachi.Log).send("[AUTH] Otomatik yedek alma işlemi başarılı bir şekilde tamamlandı!");
}

function giveBot(length){
    if(length > Bots.length) length = Bots.length;
    let availableBots = Bots.filter(e => !e.Busy);
    if(availableBots.length <= 0) availableBots = Bots.sort((x,y) => x.Uj - y.Uj).slice(0, length);

    return availableBots;
};

function processBot(bot, busy, job, equal = false){
    bot.Busy = busy;
    if(equal) bot.Uj = job;
    else bot.Uj += job;

    let index = Bots.findIndex(e => e.user.id == bot.user.id);
    Bots[index] = bot;
};

function safe(id){
    if(id == client.user.id || Bots.some(e => e.user.id == id) || kachi.Izinliler.includes(id)) return true;
    return false;
};

function closeAllPerms(){
    let sunucu = client.guilds.cache.get(kachi.Guild);
    if (!sunucu) return;
    sunucu.roles.cache.filter(r => r.editable && (r.permissions.has("ADMINISTRATOR") || r.permissions.has("MANAGE_NICKNAMES") || r.permissions.has("MANAGE_WEBHOOKS") || r.permissions.has("MANAGE_ROLES") || r.permissions.has("MANAGE_CHANNELS") || r.permissions.has("MANAGE_EMOJIS") || r.permissions.has("MANAGE_GUILD") || r.permissions.has("BAN_MEMBERS") || r.permissions.has("KICK_MEMBERS"))).forEach(async r => await r.setPermissions(0));     
};

client.login(kachi.Token);
