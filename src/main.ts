import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    // const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
    // const octokit = github.getOctokit(GITHUB_TOKEN)
    const teams = core.getInput('teams')
    core.info(`teams: ${teams}`)

    const pull_request = github.context.payload.pull_request
    if (pull_request) {
      core.info(JSON.stringify(pull_request, undefined, 2))
    }

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
