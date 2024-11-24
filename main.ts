import { FastifyListenOptions } from "fastify";
import app from "api/app";

// env variables check
let opts: FastifyListenOptions;
if (!process.env.HOST) {
    opts = { port: parseInt(process.env.PORT) };
}
else {
    opts = { port: parseInt(process.env.PORT), host: process.env.HOST };
}

// Start the server
app.listen(opts, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
    console.log(app.printRoutes());
});