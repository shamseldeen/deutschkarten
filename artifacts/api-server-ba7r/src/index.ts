import "./preload";
import app from "./app";
import { validateEnv } from "./env";
import { logger } from "./lib/logger";
import { installProcessHandlers } from "./middlewares/errorHandler";

installProcessHandlers();

const env = validateEnv();
const port = Number(env.PORT);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
