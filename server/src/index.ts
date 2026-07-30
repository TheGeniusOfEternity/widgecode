import 'dotenv/config';

import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
