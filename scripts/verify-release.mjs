import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const options = { directory: 'dist', base: '/' };
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index]?.replace(/^--/, '');
  const value = process.argv[index + 1];
  if (!['directory', 'base', 'url', 'report'].includes(key) || !value) throw new Error('参数：--directory、--base、--url、--report，均需提供值。');
  options[key] = value;
}
if (!options.base.startsWith('/') || !options.base.endsWith('/') || options.base.includes('..')) throw new Error('base 必须是以 / 开始和结束的站内路径。');
const directory = resolve(options.directory);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const report = { base: options.base, files: [], models: [], http: [] };

async function inventory(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = resolve(folder, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`发布包不允许符号链接：${entry.name}`);
    if (entry.isDirectory()) await inventory(path);
    else {
      const name = relative(directory, path).split(sep).join('/');
      if (!/\.(html|js|css|svg|glb)$/.test(name)) throw new Error(`意外的公开文件：${name}`);
      const bytes = await readFile(path);
      report.files.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
    }
  }
}

function validateGlb(bytes) {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error('模型响应不是真实完整的 glTF 2.0 GLB，可能错误返回了 HTML。');
  }
  const jsonLength = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a || 20 + jsonLength > bytes.length) throw new Error('GLB JSON 分块无效。');
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  for (const resource of [...gltf.buffers ?? [], ...gltf.images ?? []]) {
    if (resource.uri && !resource.uri.startsWith('data:')) throw new Error('模型引用了发布包外的资源。');
  }
}

await inventory(directory);
const html = await readFile(resolve(directory, 'index.html'), 'utf8');
const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
if (!assetPaths.some((path) => path.endsWith('.js')) || !assetPaths.some((path) => path.endsWith('.css'))) throw new Error('缺少构建入口资源。');
for (const path of assetPaths) {
  if (!path.startsWith(options.base) || path.includes('..') || path.includes('://')) throw new Error(`资源不符合 base：${path}`);
  const name = path.slice(options.base.length);
  if (!report.files.some((file) => file.path === name)) throw new Error(`缺少 HTML 引用文件：${name}`);
}
const sourceModels = (await readdir(resolve('public/models'))).filter((name) => name.endsWith('.glb')).map((name) => `models/${name}`).sort();
const builtModels = report.files.filter((file) => file.path.endsWith('.glb')).map((file) => file.path).sort();
if (!sourceModels.includes('models/factory.glb') || JSON.stringify(sourceModels) !== JSON.stringify(builtModels)) throw new Error('发布包与源目录的模型清单不一致。');
for (const path of builtModels) {
  const model = await readFile(resolve(directory, path));
  validateGlb(model);
  const sha256 = hash(model);
  if (sha256 !== hash(await readFile(resolve('public', path)))) throw new Error(`构建模型与源文件不一致：${path}`);
  report.models.push({ path, bytes: model.length, sha256 });
}
report.modelSha256 = report.models.find((model) => model.path === 'models/factory.glb').sha256;

if (options.url) {
  const site = new URL(options.url);
  if (site.pathname !== options.base || site.search || site.hash || !['http:', 'https:'].includes(site.protocol)) throw new Error('url 应指向与 base 相同的站点入口路径。');
  const paths = [options.base, ...assetPaths, ...builtModels.map((path) => `${options.base}${path}`)];
  for (const path of [...new Set(paths)]) {
    const url = new URL(path, site);
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok || new URL(response.url).pathname !== path) throw new Error(`HTTP 路径失败：${path} (${response.status})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const local = path === options.base ? await readFile(resolve(directory, 'index.html')) : await readFile(resolve(directory, path.slice(options.base.length)));
    if (hash(bytes) !== hash(local)) throw new Error(`HTTP 内容与发布文件不一致：${path}`);
    if (path.endsWith('.glb')) validateGlb(bytes);
    report.http.push({ path, status: response.status, bytes: bytes.length, contentType: response.headers.get('content-type'), sha256: hash(bytes) });
  }
}
report.files.sort((a, b) => a.path.localeCompare(b.path));
if (options.report) await writeFile(resolve(options.report), JSON.stringify(report, null, 2) + '\n');
console.log(`发布检查通过：${report.files.length} 个文件，${report.models.length} 个模型，${report.http.length} 项 HTTP 内容校验。`);
