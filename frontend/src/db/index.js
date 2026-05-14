import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env" });

let _client = null;

function build() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local."
    );
  }
  return createClient(url, key);
}

// Lazy client — proxy avoids reading env at import time, so the build can
// collect page data even when secrets aren't injected.
export const supabase = new Proxy(
  {},
  {
    get(_t, prop) {
      if (!_client) _client = build();
      const value = _client[prop];
      return typeof value === "function" ? value.bind(_client) : value;
    },
  }
);

export const executeQuery = async (query, params = []) => {
  const { data, error } = await supabase.rpc("execute_sql", { query, params });
  if (error) throw error;
  return data;
};
