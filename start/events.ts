import LoginAttempted from '#events/auth/login_attempted'
import MediaAssetUploaded from '#events/media_asset/media_asset_uploaded'
import MediaAssetsDiscarded from '#events/media_asset/media_assets_discarded'
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

emitter.listen(MediaAssetUploaded, [
  () => import('#listeners/media_asset/process_media_asset_listener'),
])

emitter.listen(MediaAssetsDiscarded, [
  () => import('#listeners/media_asset/delete_discarded_media_assets_listener'),
])

emitter.listen(LoginAttempted, [
  () => import('#listeners/auth/record_authentication_audit_listener'),
])
