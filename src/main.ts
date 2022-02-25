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
      if (expansionTeamSlugs.includes(requestedTeam.slug)) {
        core.info(`Expanding reviewers for team: ${requestedTeam.name}`)
        const members = await octokit.rest.teams.listMembersInOrg({
          org: github.context.repo.owner,
          team_slug: requestedTeam.slug
        })
        core.info(`members: ${members.data.map(m => m.login).join(', ')}`)
      }
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
