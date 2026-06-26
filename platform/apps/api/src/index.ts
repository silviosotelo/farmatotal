import { buildApp } from "./app.js";
import { env } from "./env.js";

const app = await buildApp();

try {
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  app.log.info(`API en http://localhost:${env.API_PORT} — docs en /docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
