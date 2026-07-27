import LoginAttempted from '#events/auth/login_attempted'
import MissionaryProfileCreated from '#events/missionary/missionary_profile_created'
import PasswordResetRequested from '#events/auth/password_reset_requested'
import UserRegistered from '#events/user/user_registered'
import emitter from '@adonisjs/core/services/emitter'

emitter.listen(PasswordResetRequested, [
  () => import('#listeners/auth/send_password_reset_email_listener'),
])

emitter.listen(UserRegistered, [
  () => import('#listeners/user/send_welcome_email_listener'),
  () => import('#listeners/user/index_missionary_listener'),
])

emitter.listen(MissionaryProfileCreated, [
  () => import('#listeners/missionary/index_missionary_on_profile_created_listener'),
])

emitter.listen(LoginAttempted, [
  () => import('#listeners/auth/record_authentication_audit_listener'),
])
