import express from 'express';

// @ts-ignore
export function errorHandler(
  err: express.Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (err && err.message.includes('Failed to lookup view')) {
    // Handle view not found
    res.status(500).send('View not found!');
  } else if (err) {
    // Handle EJS parse error or any other error
    //res.status(500).render('errorPage', { error: err });
    //TODO : replace this with an ejs view
    const errorMessage = `
        <html>
        <body>
        <h1>Failed to load page!</h1>
        <pre>
${err.message}
====================
${err.stack}
        </pre>
        </body>
        </html>
        `;
    res.status(500).send(errorMessage);
  }
}
