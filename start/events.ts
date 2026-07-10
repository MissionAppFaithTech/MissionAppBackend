import PasswordResetRequested from '#events/password_reset_requested'
import emitter from '@adonisjs/core/services/emitter'

emitter.listen(PasswordResetRequested, [
  () => import('#listeners/auth/send_password_reset_email_listener'),
])
