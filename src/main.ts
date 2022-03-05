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
    const READ_ORG_PAT = process.env.READ_ORG_PAT || ''

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
          const members = await github
            .getOctokit(READ_ORG_PAT)
            .rest.teams.listMembersInOrg({
              org: github.context.repo.owner,
              team_slug: requestedTeam.slug
            })

          core.info(`members: ${members.data.map(m => m.login).join(', ')}`)
          await octokit.rest.pulls.requestReviewers({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: github.context.issue.number,
            reviewers: members.data.map(m => m.login)
          })

          /**
           * TODO:
           * - fix get team members error (is it an auth scope issue?)
           * - send member logins to POST requested reviewers: https://docs.github.com/en/rest/reference/pulls#request-reviewers-for-a-pull-request
           * - remove team reviewer assignment with DELETE https://docs.github.com/en/rest/reference/pulls#request-reviewers-for-a-pull-request
           * - update README with example usage for other repos,
           * - update avise-web PR to use commit hash
           * - clean up my dummy test team
           */
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
