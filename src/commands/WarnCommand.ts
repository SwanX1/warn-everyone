import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandUserOption } from "@discordjs/builders";
import { CommandInteraction, GuildMember, MessageEmbed } from "discord.js";
import { Bot } from "../Bot";
import { Command } from "../Command";

export class WarnCommand implements Command {
  public client: Bot;
  public constructor(client: Bot<false>) {
    this.client = client;
  }

  public getName(): string {
    return "warn";
  }

  public async exec(interaction: CommandInteraction): Promise<void> {
    if (interaction.inGuild()) {
      const guildId = interaction.guildId;
      const member = interaction.member;
      const warnedMember = interaction.options.getMember("user", true);
      const reason = interaction.options.getString("reason", false);
      let guild = this.client.database.getOrCreateGuild(guildId);
      if (!(warnedMember as GuildMember).user) {
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
      guild.addWarn({
        moderator: member.user.id,
        user: (warnedMember as GuildMember).user.id,
        reason: reason ?? undefined,
        time: Date.now()
      });
      interaction.reply({
        embeds: reason ? [
          new MessageEmbed()
            .setColor("BLUE")
            .setDescription(`Warned <@${(warnedMember as GuildMember).user.id}>`)
            .addField("Reason", reason)
        ] : [
          new MessageEmbed()
            .setColor("BLUE")
            .setDescription(`Warned <@${(warnedMember as GuildMember).user.id}>`)
        ]
      });
    }
  }

  public getCommandBuilder(): Pick<SlashCommandBuilder, "toJSON"> {
    return new SlashCommandBuilder()
      .setName(this.getName())
      .setDescription("Warns a user")
      .addUserOption(
        new SlashCommandUserOption()
          .setName("user")
          .setDescription("User to warn")
          .setRequired(true)
      )
      .addStringOption(
        new SlashCommandStringOption()
          .setName("reason")
          .setDescription("Reason for the warn")
          .setRequired(false)
      )
  }
}