import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

export interface Command {
  exec(interaction: CommandInteraction): void | Promise<void>;
  getName(): string;
  getCommandBuilder(): Pick<SlashCommandBuilder, 'toJSON'>;
}