import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { SlashCommandBuilder } from "@discordjs/builders";

let rest = new REST({ version: "9", userAgentAppendix: `Node.JS ${process.version} <karliscern@gmail.com>` });

/**
 * If `process.env.ENVIRONMENT` is `PROD` provided commands are registered as global commands.
 * If `process.env.ENVIRONMENT` is `DEV` provided commands are registered as guild commands, and options.GUILD_ID must be set.
 * Be prepared to catch errors.
 */
export async function registerSlashCommands({ CLIENT_ID, GUILD_ID }: { CLIENT_ID: string, GUILD_ID?: string }, ...commands: Pick<SlashCommandBuilder, 'toJSON'>[]): Promise<void> {
  if (setupRestClient()) {
    let route: `/${string}`;
    if (process.env.ENVIRONMENT === "PROD") {
      route = Routes.applicationCommands(CLIENT_ID);
    } else if (process.env.ENVIRONMENT === "DEV") {
      if (GUILD_ID) {
        route = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
      } else {
        throw new Error("\"ENVIRONMENT\" is \"DEV\" and no GUILD_ID is provided.");
      }
    } else {
      throw new Error("\"ENVIRONMENT\" isn't set, or isn't a valid value.");
    }

    const commandsJSON = commands.map(command => command.toJSON());
    try {
      await rest.put(route, { body: commandsJSON });
    } catch (error) {
      throw error;
    }
  }
}

let restClientIsSetup = false;
/**
 * This command persists the rest client state.
 * It will actually only run successfully once, after a successful setup,
 * it will always return true.
 * @returns {true | undefined}
 *  `true` - if setup is successful;
 *  `undefined` - if an error is thrown.
 */
export function setupRestClient(): true | undefined {
  if (!restClientIsSetup) {
    if (process.env.DISCORD_API_KEY) {
      rest = rest.setToken(process.env.DISCORD_API_KEY);
      restClientIsSetup = true;
      return true;
    } else {
      throw new Error("There is no environment variable called \"DISCORD_API_TOKEN\", please set it before calling functions from RestUtil.");
    }
  } else {
    return true;
  }
}