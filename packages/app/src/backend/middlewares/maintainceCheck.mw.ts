import { Request, Response, NextFunction } from 'express';
import config from '../config';
const staticHTML = `
    <html>
    <head>
    <link rel="stylesheet" href="/metroui/css/metro-all.min.css">
    <script src="/metroui/js/metro.js"></script>
    <style>
    .cube {
        transform:rotateY(30deg) scale(1.5);
        margin-top:50px;
    }
    h1 {
        color: white;
        text-align: center;
        width: 100%;
        display: block;
        padding-bottom: 20px;
        border-bottom: 1px solid green;
        box-shadow: 0 2px 30px 0px green;        
    }
    </style>
    </head>
    <body style="background:#000">
    <center>
    <h1>SmythOS is Under Maintenance</h1>
    <br />
    <div id="cube" data-role="cube" data-color="white bd-darkGreen" data-flash-color="#00d700"></div>
    <br />&nbsp;<br />&nbsp;<br />    
    </center>
    </body>
    </html>
    `;
export const maintenanceCheckMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const isOnMaintenance = config.env.MAINTENANCE === 'ON';
  // check if the user is already in the maintenance page so that we don't redirect him again (infinite loop)

  //console.log('req.path', req.path, req.path.startsWith('/metroui'));
  if (
    req.path.startsWith('/metroui') ||
    req.path.startsWith('/css') ||
    req.path.startsWith('/js')
  ) {
    return next();
  }
  if (isOnMaintenance) {
    if (req.path.startsWith('/api')) {
      return res.status(503).send({ message: 'Sorry, we are on maintenance mode', code: 503 });
    } else if (req.path !== '/maintenance') {
      return res.send(staticHTML);
    }
  } else {
    next();
  }
};
export const requireMaintenanceMode = (req: Request, res: Response, next: NextFunction) => {
  const isOnMaintenance = config.env.MAINTENANCE === 'ON';
  if (!isOnMaintenance) {
    res.redirect('/');
  } else {
    next();
  }
};
