#!/usr/bin/env python3
"""Monta o artefato do CRM (HTML único): regras reais (esbuild) + CSS do Tailwind do projeto + ícones Phosphor + fontes/logos embutidos."""
import base64, glob, json, os, re, subprocess, sys
R = '/home/user/pasta'; D = R + '/artefatos/crm-completo'; OUT = D + '/dist'; os.makedirs(OUT, exist_ok=True)
def run(cmd, **k): return subprocess.run(cmd, check=True, capture_output=True, text=True, **k).stdout
# 1) regras reais do projeto
regras = run([R + '/node_modules/.bin/esbuild', D + '/entry.ts', '--bundle', '--format=iife', '--global-name=CRM', '--target=es2020', '--log-level=error'])
# 2) código do artefato (ordem por prefixo numérico)
fontes = sorted(glob.glob(D + '/src/*.js'))
codigo = '\n'.join(open(f, encoding='utf8').read() for f in fontes)
corpo = open(D + '/body.html', encoding='utf8').read()
# 3) ícones usados (nos arquivos, no corpo e nas regras)
usados = sorted(set(re.findall(r"ph:([a-z0-9-]+)", codigo + corpo + regras)))
ph = json.load(open(R + '/node_modules/@iconify-json/ph/icons.json'))['icons']
icones = {}
falta = []
for n in usados:
    if n in ph: icones['ph:' + n] = ph[n]['body']
    else: falta.append(n)
if falta: print('ícones sem correspondência:', falta, file=sys.stderr)
# 4) CSS (Tailwind do projeto, só as classes usadas)
cfg = D + '/dist/tailwind.cfg.js'
open(cfg, 'w').write("const base=require('%s/tailwind.config.js');module.exports={...base,content:['%s/src/*.js','%s/body.html','%s/dist/regras.js']};" % (R, D, D, D))
open(D + '/dist/regras.js', 'w').write(regras)
css = run([R + '/node_modules/.bin/tailwindcss', '-c', cfg, '-i', D + '/styles.css', '--minify'], cwd=R)
# 5) fontes e logos embutidos
def b64(p): return base64.b64encode(open(p, 'rb').read()).decode()
fontes_css = ''
for nome, peso, arq in [('Marcellus', '400', 'marcellus'), ('Plus Jakarta Sans', '400', 'jakarta-400'), ('Plus Jakarta Sans', '500', 'jakarta-500'), ('Plus Jakarta Sans', '600', 'jakarta-600'), ('Plus Jakarta Sans', '700 900', 'jakarta-700')]:
    fontes_css += "@font-face{font-family:'%s';font-weight:%s;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}" % (nome, peso, b64(R + '/public/fonts/%s.woff2' % arq))
logos = {'monoDark': 'mono-dark.png', 'monoLight': 'mono-light.png', 'wordmarkLight': 'wordmark-light.png'}
modelos_js = 'const MODELOS_REAIS=' + open(D + '/dados/modelos_mensagem.json', encoding='utf8').read() + ';'
logos_js = 'const LOGOS=' + json.dumps({k: 'data:image/png;base64,' + b64(R + '/public/' + v) for k, v in logos.items()}) + ';'
base_css = ":root{color-scheme:light}:root.dark,:root[data-theme=dark]{color-scheme:dark}@media (prefers-color-scheme:dark){:root:not([data-theme=light]) body{background:#17110e;color:#edeae2}}body{font-size:16px;line-height:1.5}"
pdfjs_src = open(R + '/node_modules/pdfjs-dist/legacy/build/pdf.min.js', encoding='utf8').read().replace('</script', '<\\/script')
pdf_worker_js = 'const PDF_WORKER_SRC=' + json.dumps(open(R + '/node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js', encoding='utf8').read()).replace('</', '<\\/') + ';'
html = ('<title>CRM Lara Café Completo</title>\n<style>' + fontes_css + base_css + css + '</style>\n' + corpo +
        '\n<script>\n' + pdfjs_src + '\n</script>\n<script>\n' + regras + '\n' + pdf_worker_js + '\n' + logos_js + '\n' + modelos_js + '\nconst ICONES=' + json.dumps(icones, ensure_ascii=False) + ';\n' + codigo + '\n</script>\n')
open(OUT + '/crm.html', 'w', encoding='utf8').write(html)
print('ok', len(html), 'bytes;', len(icones), 'ícones;', len(css), 'bytes de CSS')
