import { app } from './app'
import { env } from './env'

app
  .listen({
    host: '0.0.0.0',
    port: env.APP_PORT,
  })
  .then(() => {
    console.log(`Server started successfully! Listening on: ${env.APP_PORT}`)
  })
