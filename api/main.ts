import type { VercelRequest, VercelResponse } from '@vercel/node';

const main = (request: VercelRequest, response: VercelResponse) => {
  const { name } = request.query;
  response.status(200).send(`Hello ${name}!`);
};

export default main;
