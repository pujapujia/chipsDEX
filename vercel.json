{
  "version": 2,
  "builds": [
    { "src": "public/index.html", "use": "@vercel/static" },
    { "src": "api/*.js", "use": "@vercel/node" }
  ],
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/script.js", "destination": "/public/script.js" },
    { "source": "/(.*)", "destination": "/public/index.html" }
  ],
  "headers": [
    {
      "source": "/script.js",
      "headers": [
        { "key": "Content-Type", "value": "application/javascript" }
      ]
    }
  ]
}
