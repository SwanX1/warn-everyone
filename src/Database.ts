import EventEmitter from "events";
import { access, chmod, constants, ensureFile, PathLike, readFile, stat, writeFile } from "fs-extra";
import { Logger } from "logerian";

class DatabaseGuild {
  public id: string;
  public warns: Warn[];
  public database: Database;

  constructor(database: Database, id: string, warns: Warn[]) {
    this.database = database;
    this.id = id;
    this.warns = warns;
  }

  public getWarns(userId: string): Warn[] {
    return this.warns.filter(warn => warn.user === userId);
  }

  public addWarn(warn: Warn): void {
    this.warns.push(warn);
    this.database.shouldSave = true;
  }

  public toJSON(): { id: string; warns: Warn[] } {
    return {
      id: this.id,
      warns: this.warns
    };
  }
}

interface Warn {
  user: string;
  moderator: string;
  reason?: string;
  time: number;
}

export class Database extends EventEmitter {
  private path: string;
  private dbobj!: { tables: { guilds: { [id: string]: DatabaseGuild }; }; };
  public shouldSave = false;
  public logger: Logger;

  public constructor(path: string, logger: Logger) {
    super();
    this.logger = logger;
    this.path = path;
    this.setupFile();
    this.on("ready", () => {
      const saveInterval = setInterval(() => this.saveToFile(), 5000).unref();
      process.once("beforeExit", () => {
        this.shouldSave = true;
        this.saveToFile();
        clearInterval(saveInterval);
      });
    });
  }

  private async setupFile() {
    try {
      try {
        await stat(this.path);
      } catch {
        await ensureFile(this.path);
        await writeFile(this.path, "{\"tables\":{\"guilds\":{}}}");
        try {
          await chmod(this.path, 0o644);
        } catch {
          this.logger.fatal(`Error while creating file \x1b[32m"${this.path}"\x1b[39m: Cannot make file read/write!`);
          process.exit(1);
        }
      }
    } catch {
      this.logger.fatal(`Cannot create file \x1b[32m"${this.path}"\x1b[39m!`);
      process.exit(1);
    }
    if (!await checkFileAccess(this.path, constants.R_OK)) {
      this.logger.fatal(`File \x1b[32m"${this.path}"\x1b[39m is not readable!`);
      process.exit(1);
    }
    if (!await checkFileAccess(this.path, constants.W_OK)) {
      this.logger.fatal(`File \x1b[32m"${this.path}"\x1b[39m is not writable!`);
      process.exit(1);
    }

    try {
      this.dbobj = JSON.parse((await readFile(this.path)).toString());
    } catch {
      this.logger.fatal(`File \x1b[32m"${this.path}"\x1b[39m has malformed JSON, please fix or delete it!`);
      process.exit(1);
    }

    //#region database validation
    if (typeof this.dbobj !== "object" || this.dbobj instanceof Array) {
      this.logger.fatal(`File \x1b[32m"${this.path}"\x1b[39m isn't a valid database file, please fix or delete it: root is not an object.`);
      process.exit(1);
    }

    if (!this.dbobj.tables) {
      this.dbobj.tables = {
        guilds: {},
      };
    } else if (typeof this.dbobj.tables !== "object" || this.dbobj.tables instanceof Array) {
      this.logger.fatal(`File \x1b[32m"${this.path}"\x1b[39m isn't a valid database file, please fix or delete it: "tables" is not an object`);
      process.exit(1);
    }

    if (!this.dbobj.tables.guilds) {
      this.dbobj.tables.guilds = {};
    } else if (typeof this.dbobj.tables.guilds !== "object" || this.dbobj.tables.guilds instanceof Array) {
      this.logger.fatal(`File \x1b[32m"${this.path}"\x1b[39m isn't a valid database file, please fix or delete it: "tables.guilds" is not an array`);
      process.exit(1);
    }
    //#endregion

    for (const guild in this.dbobj.tables.guilds) {
      if (Object.prototype.hasOwnProperty.call(this.dbobj.tables.guilds, guild)) {
        this.dbobj.tables.guilds[guild] = new DatabaseGuild(this, this.dbobj.tables.guilds[guild].id, this.dbobj.tables.guilds[guild].warns);
      }
    }

    this.shouldSave = true;
    this.saveToFile();
    this.emit("ready");
  }

  public hasGuild(id: string): boolean {
    return id in this.dbobj.tables.guilds;
  }

  public getGuild(id: string): DatabaseGuild | undefined {
    return this.dbobj.tables.guilds[id];
  }

  public getOrCreateGuild(id: string): DatabaseGuild {
    if (!this.hasGuild(id)) {
      const guild = new DatabaseGuild(this, id, []);
      this.dbobj.tables.guilds[id] = guild;
    }
    return this.getGuild(id) as DatabaseGuild;
  }

  private async saveToFile(): Promise<void> {
    if (!this.shouldSave) return;
    this.shouldSave = false;
    this.emit("debug", "Saving database to file...");
    await writeFile(this.path, JSON.stringify(this.dbobj, (key, value) => {
      if (value instanceof DatabaseGuild) {
        return value.toJSON();
      }
      return value;
    }));
  }
}

async function checkFileAccess(path: PathLike, mode?: number): Promise<boolean> {
  try {
    await access(path, mode);
  } catch {
    return false;
  }
  return true;
}
