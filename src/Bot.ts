import { Client, ClientOptions } from "discord.js";
import { Logger } from "logerian";
import { Database } from "./Database";

export interface BotOptions extends ClientOptions {
  database: Database;
}

export class Bot<Ready extends boolean = boolean> extends Client<Ready> {
  public database: Database;
  public logger: Logger;
  constructor(options: BotOptions, logger: Logger) {
    super(options);
    this.logger = logger;
    this.database = options.database;
    this.database.on("debug", message => this.emit("debug", message));
  }
}