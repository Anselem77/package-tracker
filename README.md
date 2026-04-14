# Package Tracker

A simple Express package tracking API.

## Run locally

```bash
npm install
npm start
```

Then use:

- `POST http://localhost:3000/create` to create a package
- `POST http://localhost:3000/update` to update status
- `GET http://localhost:3000/track/<trackingId>` to check package status

## Deploying online

This app is ready for deployment to most Node hosts.

### Recommended hosts

- Render: https://render.com
- Railway: https://railway.app
- Fly.io: https://fly.io
- DigitalOcean App Platform: https://www.digitalocean.com/products/app-platform/

### Deployment steps

1. Create a GitHub repository and push this project.
2. Connect the repo to your host (Render/Railway/etc.).
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Deploy.

### Important note

Package data is now stored persistently in SQLite using `data.db`. If the service restarts, the package state remains available unless the database file is removed.

For higher-scale production tracking, consider using PostgreSQL or MongoDB for multi-instance deployments.
