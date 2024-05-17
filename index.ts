import express, { Application } from "express";
import { AsyncLocalStorage } from 'node:async_hooks';

const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

/*🧑🏼‍🏫* The storage variable is a store factory, it must be unique */
const storage = new AsyncLocalStorage<{
  userName: string;
}>();

const app: Application = express();
app.use(express.json());

app.use((req, res, next) => {
  /*🧑🏼‍🏫* If the authorization header is present */
  if (req.headers.authorization) {
    const parsed = /Basic (.*)/.exec(req.headers.authorization)
    if (parsed !== null) {
      const buffer = Buffer.from(parsed[1], 'base64');
      const [name] = buffer.toString('ascii').split(':');
      /*🧑🏼‍🏫* ❗This is the most important part
       * We associate the user name with the current "execution context" :
       * it means the next() method and all its subsequent calls.
       * This way, any part of the code can access the context.
       */
      storage.run({ userName: name }, () => next());
      return;
    }
  }
  /*🧑🏼‍🏫* Authorization header is missing, block the request and notify the need for HTTP/1.1 authentication */
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Private"'
  });
  res.end();
});

function getUserName(): string {
  /*🧑🏼‍🏫* Retrieves the current context */
  const context = storage.getStore();
  /*🧑🏼‍🏫* ⚠️ the context might be undefined (if not a subsequent call from storage.run) */
  return context?.userName ?? 'anonymous';
}

app.get('/', (req, res) => {
  /*🧑🏼‍🏫* This endpoint is evaluated *after* the middleware as it is a subsequent call of the middleware's next() */
  res.send(`Hello ${getUserName()}!`);
});

app
  .listen(PORT, "localhost", function () {
    console.log(`Server is running on port ${PORT}.`);
  })
  .on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.log("Error: address already in use");
    } else {
      console.log(err);
    }
  });
