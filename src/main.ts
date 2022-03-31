import * as core from '@actions/core'
import * as github from '@actions/github'
import {flatten, uniq} from 'lodash'

const log = (lineOne: string, lineTwo?: string) => {
  core.info(lineOne)
  if (lineTwo) {
    core.info(lineTwo)
  }
  core.info('')
}

async function run(): Promise<void> {
  try {
    if (github.context.payload.pull_request === undefined) {
      return
    }

    log('AskTia: expanding teams 💪')

    // GATHER ACTION ARGUMENTS
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
    const octokit = github.getOctokit(GITHUB_TOKEN)
    const READ_ORG_PAT = process.env.READ_ORG_PAT || ''
    const orgReadOctoKit = github.getOctokit(READ_ORG_PAT)

    const teamSlugsToExpand = core
      .getInput('team-slugs')
      .split(',')
      .map(s => s.trim())
    let teamSlugMatches: (team: string) => boolean
    if (teamSlugsToExpand.includes('*')) {
      teamSlugMatches = () => true
    } else {
      teamSlugMatches = (team: string) => teamSlugsToExpand.includes(team)
    }

    const teamSlugDoesNoteMatch = (team: string) => !teamSlugMatches(team)

    log(
      'Action is configured to expand these teams:',
      teamSlugsToExpand.join(', ')
    )

    // GATHER PULL REQUEST CONTEXT
    const prAuthorLogin = github.context.payload.pull_request.user.login
    const currentRequestedTeams: string[] =
      github.context.payload.pull_request.requested_teams.map(
        (t: any) => t.slug
      )
    log(
      'PR has requested reviews from these teams:',
      currentRequestedTeams.join(', ')
    )

    const currentRequestedReviewers: string[] =
      github.context.payload.pull_request.requested_reviewers.map(
        (r: any) => r.login
      )
    log(
      'PR has requested reviews from these users:',
      currentRequestedReviewers.join(', ')
    )

    const reviews = await octokit.rest.pulls.listReviews({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: github.context.payload.pull_request.number
    })
    const submittedReviewers: string[] = reviews.data
      .filter(r => r.user !== null)
      .map(r => r.user!.login)
    const currentSubmittedReviewers: string[] = []
    log(
      'PR already has reviews from these users:',
      currentSubmittedReviewers.join(', ')
    )

    // DETERMINE WHICH REVIEWERS NEED TO BE REQUESTED
    const teamMembers: string[][] = await Promise.all(
      currentRequestedTeams.filter(teamSlugMatches).map(async team => {
        const members = await orgReadOctoKit.rest.teams.listMembersInOrg({
          org: github.context.repo.owner,
          team_slug: team
        })
        return members.data.map(m => m.login)
      })
    )
    const expansionReviewerLogins: string[] = uniq(flatten(teamMembers))
    log(
      'All team members from requested teams:',
      expansionReviewerLogins.join(', ')
    )

    // PREPARE NEW REVIEWER PAYLOAD
    const teamReviewers: string[] = currentRequestedTeams.filter(
      teamSlugDoesNoteMatch
    )
    const reviewers: string[] = uniq([
      ...currentRequestedReviewers,
      ...expansionReviewerLogins
    ])
      .filter(login => login !== prAuthorLogin)
      .filter(login => !currentSubmittedReviewers.includes(login))
      .filter(login => !submittedReviewers.includes(login))
    log(
      'Action will request reviews from these teams:',
      teamReviewers.join(', ')
    )
    log('Action will request reviews from these users:', reviewers.join(', '))

    // UPDATE PR REVIEWERS
    await octokit.rest.pulls.requestReviewers({
      owner: github.context.issue.owner,
      repo: github.context.issue.repo,
      pull_number: github.context.issue.number,
      reviewers: reviewers,
      team_reviewers: teamReviewers
    })

    log(`🔮 SUCCESS 🍡`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
