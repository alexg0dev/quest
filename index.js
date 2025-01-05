// // ========== Imports and Client Setup ==========
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder
  } = require('discord.js');
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildBans,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
  });
  
  // ========== BOT TOKEN ==========
  const TOKEN = 'MTI4Mjc4MDM0MDI1NDkzMzAxMg.GS4xKf.JVAJdDGgGu_lbzMy6UkuRtsKiLwH7q9GK3K-m4';
  // ========== Imports and Client Setup ==========

  
  // ========== Only allow the bot in this guild/server ==========
  const ALLOWED_GUILD_ID = '1305590541307613196';
  
  // ========== Log channel IDs ==========
  const LOG_CHANNELS = {
    message: '1307125957110272070',  // For message edits, deletions, attachments
    ban: '1307125987544272926',
    join: '1307126056171474985',
    leave: '1307126089809657949',
    timeout: '1307128352859095090',
    server: '1307128496346235020',
    kick: '1307131198841163776'
  };
  
  // ========== Welcome channel ID (NEW) ==========
  const WELCOME_CHANNEL_ID = '1305985454746763295';
  
  // In-memory cache so we can re-send logs if they are deleted
  const logCache = new Map();
  // Format: logCache.set(logMessageId, { channelId, embedData });
  
  //
  // ========== Helper Functions ==========
  //
  
  /** Safely get a channel by ID. */
  function getLogChannel(channelId) {
    return client.channels.cache.get(channelId);
  }
  
  /** Collects direct URLs of all attachments, to reference in the embed. */
  function collectAttachmentURLs(attachments) {
    const urls = [];
    for (const attachment of attachments.values()) {
      urls.push(attachment.url);
    }
    return urls;
  }
  
  /** Sends an embed to the specified log channel and caches it for anti-tamper. */
  async function sendLogEmbed(logChannelId, embed) {
    const channel = getLogChannel(logChannelId);
    if (!channel) {
      console.warn(`Log channel with ID ${logChannelId} not found.`);
      return;
    }
  
    try {
      const logMessage = await channel.send({ embeds: [embed] });
      logCache.set(logMessage.id, {
        channelId: logChannelId,
        embedData: embed.toJSON()
      });
    } catch (err) {
      console.error('Failed to send log embed:', err);
    }
  }
  
  /** Formats a Date into Discord’s relative timestamp, e.g., "<t:xxxx:R>". */
  function formatDiscordTimestamp(date) {
    if (!date) return 'N/A';
    return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
  }
  
  //
  // ========== Guild Restriction: Leave Any Unallowed Guild ==========
  //
  client.on('guildCreate', async (guild) => {
    if (guild.id !== ALLOWED_GUILD_ID) {
      try {
        const systemChan = guild.systemChannel;
        if (systemChan) {
          await systemChan.send("I can't be used here. Leaving...");
        } else {
          const firstChannel = guild.channels.cache.find(ch => ch.isTextBased());
          if (firstChannel) {
            await firstChannel.send("I can't be used here. Leaving...");
          }
        }
      } catch (err) {
        console.error('Failed to send leave message:', err);
      } finally {
        await guild.leave();
      }
    }
  });
  
  // Also check for existing guilds on startup
  client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}. Checking guilds...`);
    for (const g of client.guilds.cache.values()) {
      if (g.id !== ALLOWED_GUILD_ID) {
        try {
          const systemChan = g.systemChannel;
          if (systemChan) {
            await systemChan.send("I can't be used here. Leaving...");
          }
        } catch {}
        await g.leave();
      }
    }
  });
  
  //
  // ========== MAIN LOGGING EVENTS ==========
  //
  
  //
  // 1. Member Joins
  //
  client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== ALLOWED_GUILD_ID) return;
  
    // 1A) Send a "Member Joined" log embed to the log channel
    const embed = new EmbedBuilder()
      .setTitle('Member Joined')
      .setColor('Green')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
        { name: 'Account Created', value: formatDiscordTimestamp(member.user.createdAt), inline: true }
      )
      .setFooter({ text: `Joined: ${member.guild.name}` })
      .setTimestamp();
  
    await sendLogEmbed(LOG_CHANNELS.join, embed);
  
    // 1B) Send a welcome embed to the dedicated WELCOME channel (1305985454746763295)
    const welcomeChannel = getLogChannel(WELCOME_CHANNEL_ID);
    if (welcomeChannel) {
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Welcome to Quest for Glory!')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `Hello <@${member.id}>! **Welcome to Quest for Glory** - The fastest growing Pro Clubs league on the platform.\n\n` +
          `• Check out <#1305985487370063905> and agree to them before you join the server.\n` +
          `• Make sure to check your DMs from <@703886990948565003> and verify yourself to get access to the server.\n\n` +
          `We hope you enjoy your stay here at **QG**!`
        )
        .setFooter({ text: 'Quest for Glory | Enjoy your stay!' })
        .setTimestamp();
  
      await welcomeChannel.send({ embeds: [welcomeEmbed] });
    }
  });
  
  //
  // 2. Member Leaves & Kick detection
  //
  client.on('guildMemberRemove', async (member) => {
    if (member.guild.id !== ALLOWED_GUILD_ID) return;
  
    // Check if user was kicked
    const fetchedLogs = await member.guild.fetchAuditLogs({
      limit: 1,
      type: 20 // 'MEMBER_KICK'
    });
    const kickLog = fetchedLogs.entries.first();
  
    // Increase the detection window from 5s to 10s
    if (kickLog && kickLog.target.id === member.id) {
      const { executor, reason } = kickLog;
      const wasKickedRecently = (Date.now() - kickLog.createdTimestamp) < 10000; // 10 seconds
      if (wasKickedRecently) {
        const embedKick = new EmbedBuilder()
          .setTitle('Member Kicked')
          .setColor('Red')
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setDescription(`**Reason:** ${reason || 'No reason provided'}`)
          .addFields(
            { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
            { name: 'Kicked By', value: executor ? `${executor.tag} (${executor.id})` : 'Unknown', inline: true },
            { name: 'Account Created', value: formatDiscordTimestamp(member.user.createdAt), inline: true }
          )
          .setFooter({ text: `Kicked from: ${member.guild.name}` })
          .setTimestamp();
  
        return sendLogEmbed(LOG_CHANNELS.kick, embedKick);
      }
    }
  
    // Otherwise, a normal leave
    const embedLeave = new EmbedBuilder()
      .setTitle('Member Left')
      .setColor('Red')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
        { name: 'Account Created', value: formatDiscordTimestamp(member.user.createdAt), inline: true }
      )
      .setFooter({ text: `Left: ${member.guild.name}` })
      .setTimestamp();
  
    await sendLogEmbed(LOG_CHANNELS.leave, embedLeave);
  });
  
  //
  // 3. Bans / Unbans
  //
  client.on('guildBanAdd', async (ban) => {
    if (ban.guild.id !== ALLOWED_GUILD_ID) return;
  
    const { user, reason, guild } = ban;
    const embed = new EmbedBuilder()
      .setTitle('Member Banned')
      .setColor('DarkRed')
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Account Created', value: formatDiscordTimestamp(user.createdAt), inline: true }
      )
      .setDescription(`**Reason:** ${reason || 'No reason provided'}`)
      .setFooter({ text: `Banned from: ${guild.name}` })
      .setTimestamp();
  
    await sendLogEmbed(LOG_CHANNELS.ban, embed);
  });
  
  client.on('guildBanRemove', async (ban) => {
    if (ban.guild.id !== ALLOWED_GUILD_ID) return;
  
    const { user, guild } = ban;
    const embed = new EmbedBuilder()
      .setTitle('Member Unbanned')
      .setColor('Green')
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Account Created', value: formatDiscordTimestamp(user.createdAt), inline: true }
      )
      .setFooter({ text: `Unbanned from: ${guild.name}` })
      .setTimestamp();
  
    await sendLogEmbed(LOG_CHANNELS.ban, embed);
  });
  
  //
  // 4. Role Updates + Timeouts
  //
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.guild.id !== ALLOWED_GUILD_ID) return;
  
    // A) Role changes
    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());
  
    const addedRoles = [...newRoles].filter(r => !oldRoles.has(r));
    const removedRoles = [...oldRoles].filter(r => !newRoles.has(r));
  
    if (addedRoles.length > 0 || removedRoles.length > 0) {
      const embedRoles = new EmbedBuilder()
        .setTitle('Role Update')
        .setColor('Blurple')
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'User', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true },
          { name: 'Account Created', value: formatDiscordTimestamp(newMember.user.createdAt), inline: true }
        )
        .setTimestamp();
  
      if (addedRoles.length > 0) {
        embedRoles.addFields({
          name: 'Roles Added',
          value: addedRoles.map(rId => `<@&${rId}>`).join(', ')
        });
      }
      if (removedRoles.length > 0) {
        embedRoles.addFields({
          name: 'Roles Removed',
          value: removedRoles.map(rId => `<@&${rId}>`).join(', ')
        });
      }
  
      await sendLogEmbed(LOG_CHANNELS.server, embedRoles);
    }
  
    // B) Timeouts
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp || 0;
    const newTimeout = newMember.communicationDisabledUntilTimestamp || 0;
  
    if (oldTimeout === 0 && newTimeout > 0) {
      // Timeout added
      const embedTimeout = new EmbedBuilder()
        .setTitle('User Timed Out')
        .setColor('Orange')
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'User', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true },
          { name: 'Timeout Until', value: `<t:${Math.floor(newTimeout / 1000)}:R>`, inline: true }
        )
        .setTimestamp();
  
      await sendLogEmbed(LOG_CHANNELS.timeout, embedTimeout);
    } else if (oldTimeout > 0 && newTimeout === 0) {
      // Timeout removed
      const embedTimeoutRemove = new EmbedBuilder()
        .setTitle('Timeout Removed')
        .setColor('Green')
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'User', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true },
          { name: 'Timeout Removed', value: 'User is no longer timed out.', inline: true }
        )
        .setTimestamp();
  
      await sendLogEmbed(LOG_CHANNELS.timeout, embedTimeoutRemove);
    }
  });
  
  //
  // 5. Server Updates (e.g., server name changes)
  //
  client.on('guildUpdate', async (oldGuild, newGuild) => {
    if (newGuild.id !== ALLOWED_GUILD_ID) return;
  
    if (oldGuild.name !== newGuild.name) {
      const embed = new EmbedBuilder()
        .setTitle('Server Name Updated')
        .setColor('Yellow')
        .setDescription(`**Old Name:** ${oldGuild.name}\n**New Name:** ${newGuild.name}`)
        .setFooter({ text: `Server ID: ${newGuild.id}` })
        .setTimestamp();
  
      await sendLogEmbed(LOG_CHANNELS.server, embed);
    }
    // More checks if needed
  });
  
  //
  // 6. Message Events
  //
  client.on('messageCreate', async (message) => {
    if (!message.guild) return;
    if (message.guild.id !== ALLOWED_GUILD_ID) return;
    if (message.author.bot) return;
  
    // Only log messages that have attachments
    if (message.attachments.size === 0) return;
  
    const attachmentURLs = collectAttachmentURLs(message.attachments);
  
    const embed = new EmbedBuilder()
      .setTitle('Message with Attachment Sent')
      .setColor('Blue')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Author', value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Account Created', value: formatDiscordTimestamp(message.author.createdAt), inline: true }
      )
      .setDescription(`**Content:** ${message.content || '*No Text*'}`)
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp();
  
    if (attachmentURLs.length > 0) {
      embed.addFields({
        name: 'Attachments',
        value: attachmentURLs
          .map((url, i) => `**File #${i + 1}**: [Link](${url})`)
          .join('\n')
      });
    }
  
    await sendLogEmbed(LOG_CHANNELS.message, embed);
  });
  
  // 6b. Message Edit
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!oldMessage.guild) return;
    if (oldMessage.guild.id !== ALLOWED_GUILD_ID) return;
    if (!oldMessage.content || !newMessage.content) return;
    if (oldMessage.author?.bot) return;
  
    const embed = new EmbedBuilder()
      .setTitle('Message Edited')
      .setColor('Yellow')
      .setThumbnail(oldMessage.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Author', value: `${oldMessage.author.tag} (${oldMessage.author.id})`, inline: true },
        { name: 'Channel', value: `<#${oldMessage.channel.id}>`, inline: true },
        { name: 'Account Created', value: formatDiscordTimestamp(oldMessage.author.createdAt), inline: true }
      )
      .setDescription(
        `**Before:** ${oldMessage.content}\n` +
        `**After:** ${newMessage.content}`
      )
      .setFooter({ text: `Message ID: ${oldMessage.id}` })
      .setTimestamp();
  
    await sendLogEmbed(LOG_CHANNELS.message, embed);
  });
  
  // 6c. Message Deletion
  client.on('messageDelete', async (message) => {
    if (!message.guild) return;
    if (message.guild.id !== ALLOWED_GUILD_ID) return;
  
    // Anti-tamper: if a log message in a log channel was deleted, re-send
    const isLogChannel = Object.values(LOG_CHANNELS).includes(message.channel.id);
    if (isLogChannel && logCache.has(message.id)) {
      const { channelId, embedData } = logCache.get(message.id);
      const embed = EmbedBuilder.from(embedData);
      await sendLogEmbed(channelId, embed);
      logCache.delete(message.id);
      return;
    }
  
    if (message.partial) {
      const embedPartial = new EmbedBuilder()
        .setTitle('Message Deleted (Partial)')
        .setColor('Red')
        .setDescription(
          `A message was deleted in <#${message.channelId}> (partial data).`
        )
        .setTimestamp();
      await sendLogEmbed(LOG_CHANNELS.message, embedPartial);
      return;
    }
  
    if (message.author?.bot) return;
  
    const attachmentURLs = collectAttachmentURLs(message.attachments);
  
    const embed = new EmbedBuilder()
      .setTitle('Message Deleted')
      .setColor('Red')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Author', value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Account Created', value: formatDiscordTimestamp(message.author.createdAt), inline: true }
      )
      .setDescription(`**Content:** ${message.content || '*No Content*'}`)
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp();
  
    if (attachmentURLs.length > 0) {
      embed.addFields({
        name: 'Attachments',
        value: attachmentURLs
          .map((url, i) => `**File #${i + 1}**: [Link](${url})`)
          .join('\n')
      });
    }
  
    await sendLogEmbed(LOG_CHANNELS.message, embed);
  });
  
  // ========== Login ==========
  client.login(TOKEN)
    .then(() => console.log('Bot is online. Kicks, bans, roles, server changes, etc. + welcome messages now!'))
    .catch(console.error);
  