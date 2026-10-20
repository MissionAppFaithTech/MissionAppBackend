import { ImpactProjectsService } from '#services/impact_project/impact_projects_service'
import ImpactProjectTransformer from '#transformers/impact_project_transformer'
import { createImpactProjectValidator } from '#validators/impact_project/create_impact_project'
import { impactProjectIdValidator } from '#validators/impact_project/impact_project_id'
import { listImpactProjectsValidator } from '#validators/impact_project/list_impact_projects'
import { updateImpactProjectValidator } from '#validators/impact_project/update_impact_project'
import type { HttpContext } from '@adonisjs/core/http'

export default class ImpactProjectsController {
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listImpactProjectsValidator)
    const projects = await new ImpactProjectsService().list(filters)

    return serialize(ImpactProjectTransformer.paginate(projects.all(), projects.getMeta()))
  }

  async show({ request, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(impactProjectIdValidator)

    const project = await new ImpactProjectsService().show(id)

    return serialize({
      impactProject: ImpactProjectTransformer.transform(project),
    })
  }

  async store({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createImpactProjectValidator)

    const project = await new ImpactProjectsService().create(auth.getUserOrFail(), payload)

    return serialize({
      impactProject: ImpactProjectTransformer.transform(project),
    })
  }

  async update({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateImpactProjectValidator)

    const project = await new ImpactProjectsService().update(
      auth.getUserOrFail(),
      payload.params.id,
      payload
    )

    return serialize({
      impactProject: ImpactProjectTransformer.transform(project),
    })
  }

  async destroy({ auth, request }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(impactProjectIdValidator)

    await new ImpactProjectsService().destroy(auth.getUserOrFail(), id)

    return {
      message: 'Projeto de impacto removido com sucesso',
    }
  }
}
