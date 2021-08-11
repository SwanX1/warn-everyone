import { Client, MessageEmbed } from "discord.js";
import dotenv from "dotenv";
import { coloredLog, Logger, LoggerLevel } from "logerian";
import path from "path";
import { Bot } from "./Bot";
import { Command } from "./Command";
import { InfractionsCommand } from "./commands/GetWarnsCommand";
import { WarnCommand } from "./commands/WarnCommand";
import { Database } from "./Database";
import { registerSlashCommands } from "./RestUtil";

dotenv.config({ path: path.join(__dirname, "../.env") });

const logger = new Logger({
  streams: [
    {
      level: process.env.ENVIRONMENT === "DEV" ? LoggerLevel.DEBUG : LoggerLevel.INFO,
      stream: process.stdout,
      prefix: coloredLog,
      filter: (data, ansiFreeData) => !/^\[(\d\d\:\d\d\:\d\d|\d\d\d\d\-\d\d\-\d\dT\d\d:\d\d:\d\d.\d\d\dZ)\] \[DEBUG\] \[WS => Shard \d+\] (\[HeartbeatTimer\] Sending a heartbeat.|Heartbeat acknowledged, latency of \d+ms.)$/.test(ansiFreeData as string),
    }
  ]
});

const client = new Bot({
  database: new Database(path.join(__dirname, "../database.json"), logger),
  intents: [ "GUILDS", "GUILD_INTEGRATIONS", "GUILD_MESSAGES" ]
}, logger);

client.on("debug", message => {
  logger.debug(message);
});

client.login(process.env.DISCORD_API_KEY);

const commands: Command[] = [
  new InfractionsCommand(client),
  new WarnCommand(client),
];

registerSlashCommands({ CLIENT_ID: process.env.CLIENT_ID as string, GUILD_ID: process.env.DEV_GUILD_ID }, ...commands.map(command => command.getCommandBuilder()));

client.on("ready", () => {
  logger.info("Logged in as", (client as Client<true>).user.username);
});

client.on("interactionCreate", interaction => {
  if (interaction.isCommand()) {
    try {
      commands.find(command => command.getName() === interaction.commandName)?.exec(interaction);
    } catch (err) {
      logger.error(err);
      interaction.reply({
        ephemeral: true,
        embeds: [
          new MessageEmbed()
            .setColor("RED")
            .setTitle("An error occurred, please try again.")
        ]
      });
    }
  }
});


for (const signal of ["SIGABRT", "SIGHUP", "SIGINT", "SIGQUIT", "SIGTERM", "SIGUSR1", "SIGUSR2", "SIGBREAK"]) {
  process.on(signal, () => {
    logger.info('Exiting...');
    client.destroy();
  });
}