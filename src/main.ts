import * as core from '@actions/core'
import * as github from '@actions/github'

type Team = {
  id: number
  name: string
  slug: string
}

async function run(): Promise<void> {
  try {
    // const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
    // const octokit = github.getOctokit(GITHUB_TOKEN)

    const expansionTeamSlugs = core
      .getInput('team-slugs')
      .split(',')
      .map(s => s.trim())

    const requestedTeams: Team[] =
      github.context.payload.requested_teams?.requested_teams || []

    requestedTeams.forEach(requestedTeam => {
      if (expansionTeamSlugs.includes(requestedTeam.slug)) {
        core.info(`Expanding reviewers for team: ${requestedTeam.name}`)
      }
    })

    // const {data: pullRequest} = await octokit.rest.pulls.get({
    //   owner: 'octokit',
    //   repo: 'rest.js',
    //   pull_number: 123,
    //   mediaType: {
    //     format: 'diff'
    //   }
    // })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()

// "requested_teams": [
//   {
//     "description": "just testing assigning this team to pr review for testing an action testing",
//     "html_url": "https://github.com/orgs/AviseInc/teams/frank-s-action-test-team",
//     "id": 5727922,
//     "members_url": "https://api.github.com/organizations/70605335/team/5727922/members{/member}",
//     "name": "Frank's Action Test Team",
//     "node_id": "T_kwDOBDVaF84AV2ay",
//     "parent": null,
//     "permission": "pull",
//     "privacy": "closed",
//     "repositories_url": "https://api.github.com/organizations/70605335/team/5727922/repos",
//     "slug": "frank-s-action-test-team",
//     "url": "https://api.github.com/organizations/70605335/team/5727922"
//   }
// ],
