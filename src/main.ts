import * as core from '@actions/core'
import * as github from '@actions/github'
import {flatten, uniq} from 'lodash'

type Team = {
  id: number
  name: string
  slug: string
}

async function run(): Promise<void> {
  try {
    // GATHER ACTION ARGUMENTS
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
    const octokit = github.getOctokit(GITHUB_TOKEN)
    const READ_ORG_PAT = process.env.READ_ORG_PAT || ''
    const orgReadOctoKit = github.getOctokit(READ_ORG_PAT)
    const teamSlugsToExpand = core
      .getInput('team-slugs')
      .split(',')
      .map(s => s.trim())
    core.info(`Expanding Team Slugs: ${teamSlugsToExpand.join(' ')}`)

    // GATHER PULL REQUEST CONTEXT
    const currentlyRequestedTeams: string[] =
      github.context.payload.pull_request?.requested_teams.map(
        (t: any) => t.slug
      ) || []
    core.info(`Currently Requested Teams: ${currentlyRequestedTeams.join(' ')}`)
    const currentlyRequestedReviewers: string[] = (
      github.context.payload.pull_request?.requested_reviewers || []
    ).map((r: any) => r.login)
    core.info(
      `Currently Requested Reviewers: ${currentlyRequestedReviewers.join(' ')}`
    )

    // DETERMINE WHICH REVIEWERS NEED TO BE REQUESTED
    const teamMembers: string[][] = await Promise.all(
      currentlyRequestedTeams
        .filter(team => teamSlugsToExpand.includes(team))
        .map(async team => {
          const members = await orgReadOctoKit.rest.teams.listMembersInOrg({
            org: github.context.repo.owner,
            team_slug: team
          })
          return members.data.map(m => m.login)
        })
    )
    const expansionReviewerLogins: string[] = uniq(flatten(teamMembers))
    core.info(
      `Expansion Reviewers to Add: ${currentlyRequestedReviewers.join(' ')}`
    )

    // PREPARE NEW REVIEWER PAYLOAD
    const reviewers: string[] = uniq([
      ...currentlyRequestedReviewers,
      ...expansionReviewerLogins
    ])
    const teamReviewers: string[] = currentlyRequestedTeams.filter(
      t => !teamSlugsToExpand.includes(t)
    )

    /**
     * TODO:
     * x fix get team members error (is it an auth scope issue?)
     * x send member logins to POST requested reviewers: https://docs.github.com/en/rest/reference/pulls#request-reviewers-for-a-pull-request
     * x remove team reviewer assignment with DELETE https://docs.github.com/en/rest/reference/pulls#request-reviewers-for-a-pull-request
     * - update README with example usage for other repos,
     * - update avise-web PR to use commit hash
     * - clean up my dummy test team
     */

    await octokit.rest.pulls.requestReviewers({
      owner: github.context.issue.owner,
      repo: github.context.issue.repo,
      pull_number: github.context.issue.number,
      reviewers: reviewers,
      team_reviewers: teamReviewers
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
