import 'dotenv/config';

import { createApp } from '@server/app.js';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;
