// Génère src/environments/env.generated.ts depuis le .env (mêmes variables que le dashboard Vue).
// Lancé automatiquement avant `pnpm start` et `pnpm build`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const vars = {};
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) vars[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
} else {
  console.warn('⚠ Pas de .env : copie celui du dashboard (cp ../Atomic_Dashboard_Vue/.env .env)');
}

mkdirSync('src/environments', { recursive: true });
writeFileSync(
  'src/environments/env.generated.ts',
  `// Fichier généré par scripts/env.mjs — ne pas modifier ni committer.
export const env = {
  supabaseUrl: ${JSON.stringify(vars.VITE_SUPABASE_URL ?? '')},
  supabaseAnonKey: ${JSON.stringify(vars.VITE_SUPABASE_ANON_KEY ?? '')},
};
`,
);
