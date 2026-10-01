#!/usr/bin/env python3
"""Empacota cada Edge Function em um único index.ts (sem imports relativos) para implantar pelo conector do Supabase.
Uso: python3 scripts/empacotar-funcoes.py <pasta-de-saida>"""
import re, sys, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/supabase/functions'
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/funcoes'
os.makedirs(out, exist_ok=True)
def ler(p): return open(p, encoding='utf8').read()
def sem_imports_relativos(t): return re.sub(r"^import [^\n]*from '\.{1,2}/[^\n]*\n", '', t, flags=re.M)
comum = '\n'.join(sem_imports_relativos(ler(f'{R}/_shared/{n}.ts')) for n in ['whatsapp', 'formulario', 'handlers'])
for nome in ['crm-api']:
    entrada = sem_imports_relativos(ler(f'{R}/{nome}/index.ts'))
    jsr = [l for l in entrada.split('\n') if l.startswith("import ") and 'jsr:' in l]
    corpo = '\n'.join(l for l in entrada.split('\n') if l not in jsr)
    open(f'{out}/{nome}.ts', 'w', encoding='utf8').write('\n'.join(jsr) + '\n' + comum + '\n' + corpo)
    print(nome, os.path.getsize(f'{out}/{nome}.ts'), 'bytes')
