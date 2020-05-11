const crypto = require("crypto")
const { google } = require("googleapis")

exports.sourceNodes = async ({ actions }, configOptions) => {
  const { createNode } = actions
  const { email, key, viewId, startDate } = configOptions
  const scopes = "https://www.googleapis.com/auth/analytics.readonly"
  const jwt = new google.auth.JWT(email, null, key, scopes)
  await jwt.authorize()
  const SiteWideStats = await google.analytics("v3").data.ga.get({
    auth: jwt,
    ids: "ga:" + viewId,
    "start-date": startDate || "2009-01-01",
    "end-date": "today",
    metrics: "ga:pageviews, ga:sessions",
  })
  for (let [pageViews, sessions] of SiteWideStats.data.rows) {
    createNode({
      pageViews: Number(pageViews),
      sessions: Number(sessions),
      id: "All-site",
      internal: {
        type: `SiteWideStats`,
        contentDigest: crypto
          .createHash(`md5`)
          .update(JSON.stringify({ pageViews, sessions }))
          .digest(`hex`),
        mediaType: `text/plain`,
        description: `Page views & sessions for the site`,
      },
    })
  }
  const result = await google.analytics("v3").data.ga.get({
    auth: jwt,
    ids: "ga:" + viewId,
    "start-date": startDate || "2009-01-01",
    "end-date": "today",
    dimensions: "ga:pagePath",
    metrics: "ga:pageviews, ga:sessions",
    sort: "-ga:pageviews",
  })

  for (let [path, totalCount, sessions] of result.data.rows) {
    createNode({
      path,
      totalCount: Number(totalCount),
      sessions: Number(sessions),
      id: path,
      internal: {
        type: `PageViews`,
        contentDigest: crypto
          .createHash(`md5`)
          .update(JSON.stringify({ path, totalCount }))
          .digest(`hex`),
        mediaType: `text/plain`,
        description: `Page views per path`,
      },
    })
  }
}