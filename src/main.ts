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

    const READ_ORG_PAT = process.env.READ_ORG_PAT || ''
    const orgReadOctoKit = github.getOctokit(READ_ORG_PAT)

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
          const members = await orgReadOctoKit.rest.teams.listMembersInOrg({
            org: github.context.repo.owner,
            team_slug: requestedTeam.slug
          })

          core.info(github.context.payload.pull_request?.author)
          core.info(
            JSON.stringify(github.context.payload.pull_request, undefined, 2)
          )
          await octokit.rest.pulls.requestReviewers({
            owner: github.context.issue.owner,
            repo: github.context.issue.repo,
            pull_number: github.context.issue.number,
            reviewers: members.data
              .map(m => m.login)
              .filter(
                login => login !== github.context.payload.pull_request?.author
              )
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
