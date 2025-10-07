import { logger } from '@lib/logger'
import { app } from './app'
import { env } from './env'

app
  .listen({
    host: '0.0.0.0',
    port: env.APP_PORT,
  })
  .then((server) => {
    logger.info(`Server started successfully! Listening on: ${server}`)
  })
