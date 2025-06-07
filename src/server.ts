import { app } from './app'
import 'dotenv/config'

app
  .listen({
    host: '0.0.0.0',
    port: process.env.PORT,
  })
  .then(() => {
    console.log('🚀 Server is running! 🚀')
  })
