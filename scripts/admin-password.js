// Définit le compte admin : demande l'e-mail et le mot de passe, puis écrit dans .env
//   ADMIN_EMAIL, ADMIN_PASSWORD_HASH (le mot de passe chiffré avec bcrypt, jamais en clair) et JWT_SECRET.
// À relancer pour changer de mot de passe. Les mêmes valeurs sont à copier dans Vercel (Settings → Environment Variables).
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';

const ENV = new URL('../.env', import.meta.url);

function ask(question, hidden = false) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = s => { if (s.includes(question)) process.stdout.write(s); };
    rl.question(question, answer => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

const email = (await ask('E-mail de connexion : ')).toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail invalide.');

const password = await ask('Mot de passe (12 caractères minimum, il ne s\'affiche pas) : ', true);
if (password.length < 12) throw new Error('Mot de passe trop court : 12 caractères minimum.');
if (password !== await ask('Confirme le mot de passe : ', true)) throw new Error('Les deux mots de passe sont différents.');

const values = {
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD_HASH: await bcrypt.hash(password, 12),
  JWT_SECRET: randomBytes(32).toString('base64url')   // changer ce secret déconnecte toutes les sessions
};

let env = '';
try { env = await readFile(ENV, 'utf8'); } catch { /* pas encore de .env */ }
for (const [key, value] of Object.entries(values)) {
  const line = `${key}='${value}'`;   // guillemets simples : le hash contient des « $ »
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  env = pattern.test(env) ? env.replace(pattern, () => line) : `${env.replace(/\n?$/, '\n')}${line}\n`;
}
await writeFile(ENV, env);

console.log(`
Compte admin enregistré dans .env pour ${email}.
Pour le site en ligne, ajoute ces 3 variables dans Vercel (Settings → Environment Variables),
avec les valeurs de .env sans les guillemets : ADMIN_EMAIL, ADMIN_PASSWORD_HASH, JWT_SECRET.`);
