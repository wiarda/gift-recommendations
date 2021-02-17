import express from "express";
import { amazon } from "./handlers/amazon";
import { createApp } from "./utils/app";
import { nocache } from "./middleware/nocache";
import { cors } from "./middleware/cors";

const refs = { server: undefined };
const service = createApp("./output/node/log");

function startServer() {
  const PORT = 3000;
  const app = express();

  refs?.server?.close();

  app.use(
    cors,
    nocache,
    express.json(),
    express.urlencoded({ extended: true })
  );
  app.post("/listings", amazon.listings);
  app.post("/reviews", amazon.reviews);
  app.post("/productReviews", amazon.productReviews);
  app.post("/allReviews", amazon.getAllReviews);

  refs.server = app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

startServer();
