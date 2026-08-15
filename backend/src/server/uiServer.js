import express from 'express';
import getPort from 'get-port';

/**
 * Starts an ephemeral Express server exposing the analysis payload over HTTP.
 * @param {object} payload - The full AnalysisPayload from the pipeline.
 * @returns {Promise<void>} Resolves once the server is listening.
 */
export async function startUIServer(payload) {
  // 9.2 Find an available port
  const port = await getPort();

  // 9.3 Set up Express app
  const app = express();

  app.get('/api/analysis', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(payload);
  });

  const server = app.listen(port);

  // 9.4 Print URL
  console.log(`\n🔍 UI Server running at: http://localhost:${port}\n`);

  // 9.5 Register graceful shutdown
  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
