import * as core from '@actions/core'
import * as github from '@actions/github'
import {flatten, uniq} from 'lodash'

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
    const prAuthorLogin = github.context.payload.pull_request?.user.login
    const currentlyRequestedTeams: string[] =
      github.context.payload.pull_request?.requested_teams.map(
        (t: any) => t.slug
      ) || []
    core.info(`Requested Teams: ${currentlyRequestedTeams.join(' ')}`)
    const currentlyRequestedReviewers: string[] = (
      github.context.payload.pull_request?.requested_reviewers || []
    ).map((r: any) => r.login)
    core.info(`Requested Reviewers: ${currentlyRequestedReviewers.join(' ')}`)

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
    core.info(`Team Members to Add: ${expansionReviewerLogins.join(' ')}`)

    // PREPARE NEW REVIEWER PAYLOAD
    const teamReviewers: string[] = currentlyRequestedTeams.filter(
      t => !teamSlugsToExpand.includes(t)
    )
    const reviewers: string[] = uniq([
      ...currentlyRequestedReviewers,
      ...expansionReviewerLogins
    ]).filter(login => login !== prAuthorLogin)
    core.info(`Modified Teams: ${teamReviewers.join('')}`)
    core.info(`Modified Reviewers: ${reviewers.join('')}`)

    // UPDATE PR REVIEWERS
    await octokit.rest.pulls.requestReviewers({
      owner: github.context.issue.owner,
      repo: github.context.issue.repo,
      pull_number: github.context.issue.number,
      reviewers: reviewers,
      team_reviewers: teamReviewers
    })
    core.info(`SUCCESS`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
