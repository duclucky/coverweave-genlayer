import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { rpcHandler } from "../shared/rpc-handler.ts";
export default defineConfig({ plugins: [react(), {
  name: 'coverweave-public-rpc',
  configureServer(server) {
    server.middlewares.use('/api/ic', (req, res) => { void rpcHandler(req, res); });
  },
}] });
