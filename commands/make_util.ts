import { BaseCommand, args } from '@adonisjs/core/ace'
import { fileURLToPath } from 'node:url'

const stubsRoot = fileURLToPath(new URL('../stubs', import.meta.url))

export default class MakeUtil extends BaseCommand {
  static commandName = 'make:util'
  static description = 'Create a new utility function file in app/utils'

  @args.string({
    description: 'Name of the utility (e.g. BuildFilterInput or Auth/BuildFilterInput)',
  })
  declare name: string

  async run() {
    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'make/util/main.stub', {
      flags: this.parsed.flags,
      entity: this.app.generators.createEntity(this.name),
    })
  }
}
