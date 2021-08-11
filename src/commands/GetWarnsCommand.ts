import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandUserOption } from "@discordjs/builders";
import { CommandInteraction, GuildMember, MessageEmbed } from "discord.js";
import { Bot } from "../Bot";
import { Command } from "../Command";

export class InfractionsCommand implements Command {
  public client: Bot;
  public constructor(client: Bot<false>) {
    this.client = client;
  }

  public getName(): string {
    return "infractions";
  }

  public async exec(interaction: CommandInteraction): Promise<void> {
    if (interaction.inGuild()) {
      const guildId = interaction.guildId;
      const member = interaction.options.getMember("user", true);
      let guild = this.client.database.getOrCreateGuild(guildId);
      if (!(member as GuildMember).user) {
        interaction.reply({
          ephemeral: true,
          embeds: [
            new MessageEmbed()
              .setColor("RED")
              .setTitle("An error occurred, please try again later.")
          ]
        });
        return;
      }
      const warns = guild.getWarns((member as GuildMember).user.id);
      interaction.reply({
        ephemeral: true,
        embeds: [
          new MessageEmbed()
            .setColor("BLUE")
            .setTitle(`${(member as GuildMember).user.username}'s warns`)
            .addFields((() => {
              const embedData = [
                {
                  name: "Total",
                  value: `${warns.length} ${warns.length === 1 ? "warn" : "warns"}`
                }
              ];
              if (warns.length !== 0) {
                embedData.push({
                  name: `Last ${warns.length === 1 ? "" : Math.min(10, warns.length) + " "}${warns.length === 1 ? "warn" : "warns"}`,
                  value: warns.sort((a, b) => b.time - a.time).slice(0, 9).map(warn => `**${warn.reason ?? "No reason"}** • <t:${Math.round(warn.time / 1000)}:R>`).join("\n")
                });
              }
              return embedData;
            })())
        ]
      });
    }
  }

  public getCommandBuilder(): Pick<SlashCommandBuilder, "toJSON"> {
    return new SlashCommandBuilder()
      .setName(this.getName())
      .setDescription("Fetches a user's warns")
      .addUserOption(
        new SlashCommandUserOption()
          .setName("user")
          .setDescription("User to fetch warns for")
          .setRequired(true)
      )
  }
}