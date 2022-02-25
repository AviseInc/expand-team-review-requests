import * as core from '@actions/core'
import * as github from '@actions/github'

type Team = {
  id: number
  name: string
  slug: string
}

async function run(): Promise<void> {
  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
    const octokit = github.getOctokit(GITHUB_TOKEN)

    const expansionTeamSlugs = core
      .getInput('team-slugs')
      .split(',')
      .map(s => s.trim())

    const requestedTeams: Team[] =
      github.context.payload.pull_request?.requested_teams || []

    requestedTeams.forEach(async requestedTeam => {
      try {
        if (expansionTeamSlugs.includes(requestedTeam.slug)) {
          core.info(`Expanding reviewers for team: ${requestedTeam.name}`)
          core.info(JSON.stringify(github.context.repo.owner))
          const members = await octokit.rest.teams.listMembersInOrg({
            org: 'AviseInc',
            team_slug: requestedTeam.slug
          })
          core.info(`members: ${members.data.map(m => m.login).join(', ')}`)
        }
      } catch (err: any) {
        core.error(err)
      }
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
