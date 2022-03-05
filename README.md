# Action: Expand Team Review Requests

Usage:

```
//.github/workflows/pr-review-requested.yml

name: PR Review Requested

on:
  pull_request:
    types: [review_requested]

jobs:
  expand-team-review-requests:
    runs-on: ubuntu-latest
    steps:
      - name: Expand Team Review Requests
        uses: AviseInc/expand-team-review-requests@main
        with:
          team-slugs: some-team-slug-1, some-team-slug-2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          READ_ORG_PAT: ${{ secrets.YOUR_READ_ORG_PAT }}
```

Configuration: _(all are required)_

- `with.team-slugs`: A comma-seperated list of your organization's teams you'd like to expand into their members when they're requested as reviewers on a pull request.
- `env.GITHUB_TOKEN`: A GitHub token used to update the pull request. The default GITHUB_TOKEN for your repo will work here.
- `env.READ_ORG_PAT`: A GitHub [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) with the `read:org` scope. This is used to find the members of requested teams.
