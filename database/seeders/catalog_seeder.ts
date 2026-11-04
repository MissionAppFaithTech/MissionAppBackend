import FaithCommunity from '#models/faith_community'
import MissionaryAgency from '#models/missionary_agency'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * Agências missionárias e comunidades de fé reais para o select do cadastro em
 * desenvolvimento. Só dados públicos (nome, cidade, site); telefones e endereços
 * ficam vazios para não inventar contato de organizações reais.
 *
 * `updateOrCreateMany` (predicate: `name`) mantém o seeder idempotente, como o
 * `UserSeeder`; `static environment` impede a execução em produção.
 */
export default class CatalogSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    await MissionaryAgency.updateOrCreateMany('name', [
      {
        name: 'JOCUM Brasil (Jovens Com Uma Missão)',
        country: 'Brasil',
        website: 'https://jocum.org.br',
      },
      {
        name: 'Missão Novas Tribos do Brasil',
        city: 'Anápolis',
        state: 'GO',
        country: 'Brasil',
        website: 'https://novastribosdobrasil.org.br',
      },
      {
        name: 'APMT - Agência Presbiteriana de Missões Transculturais',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        website: 'https://apmt.org.br',
      },
      {
        name: 'SEPAL - Servindo aos Pastores e Líderes',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        website: 'https://sepal.org.br',
      },
      {
        name: 'Junta de Missões Nacionais (JMN)',
        city: 'Rio de Janeiro',
        state: 'RJ',
        country: 'Brasil',
        website: 'https://missoesnacionais.org.br',
      },
    ])

    await FaithCommunity.updateOrCreateMany('name', [
      {
        name: 'Catedral Presbiteriana do Rio de Janeiro',
        city: 'Rio de Janeiro',
        state: 'RJ',
        country: 'Brasil',
        website: 'https://www.catedralrio.org.br',
      },
      {
        name: 'Primeira Igreja Batista do Rio de Janeiro',
        city: 'Rio de Janeiro',
        state: 'RJ',
        country: 'Brasil',
        website: 'https://www.pibrj.org.br',
      },
      {
        name: 'Igreja Batista da Lagoinha',
        city: 'Belo Horizonte',
        state: 'MG',
        country: 'Brasil',
        website: 'https://www.lagoinha.com',
      },
      {
        name: 'Igreja Presbiteriana de Pinheiros',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        website: 'https://www.ipp.org.br',
      },
      {
        name: 'Primeira Igreja Batista de Curitiba',
        city: 'Curitiba',
        state: 'PR',
        country: 'Brasil',
        website: 'https://www.pibcuritiba.org.br',
      },
    ])
  }
}
