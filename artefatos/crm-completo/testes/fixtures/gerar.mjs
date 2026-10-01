// Gera arquivos de teste reais (zip do WhatsApp com mídias, PDF com texto, DOCX, PNG) em /tmp/t/fx
import fs from 'node:fs'
import JSZip from '/home/user/pasta/node_modules/jszip/lib/index.js'
import { PDFDocument, StandardFonts } from '/home/user/pasta/node_modules/pdf-lib/cjs/index.js'
fs.mkdirSync('/tmp/t/fx', { recursive: true })
const pdf = await PDFDocument.create(); const f = await pdf.embedFont(StandardFonts.Helvetica); const pg = pdf.addPage([595, 842])
pg.drawText('CONTRATO DE COMPRA E VENDA - imovel matriculado em nome de Joana Souza (mae)', { x: 40, y: 780, size: 11, font: f })
pg.drawText('Matricula 12345 - Cartorio do 2o Oficio - valor R$ 350.000,00', { x: 40, y: 760, size: 11, font: f })
fs.writeFileSync('/tmp/t/fx/Contrato.pdf', await pdf.save())
const scan = await PDFDocument.create(); scan.addPage([595, 842]); fs.writeFileSync('/tmp/t/fx/Escaneado.pdf', await scan.save())
const dz = new JSZip(); dz.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
dz.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Certidao de casamento: regime de comunhao parcial de bens.</w:t></w:r></w:p><w:p><w:r><w:t>Filhos: Pedro e Ana &amp; outros.</w:t></w:r></w:p></w:body></w:document>')
fs.writeFileSync('/tmp/t/fx/Certidao.docx', await dz.generateAsync({ type: 'nodebuffer' }))
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'); fs.writeFileSync('/tmp/t/fx/logo.png', png)
const chat = ['12/03/2024 14:05 - As mensagens e as chamadas são protegidas com a criptografia de ponta a ponta.', '12/03/2024 14:05 - Maria Souza: Bom dia, Dra. Preciso de ajuda com o inventário do meu pai.', '12/03/2024 14:06 - Lara Café Advocacia: Bom dia, Maria! Pode me contar o que aconteceu?', '12/03/2024 14:08 - Maria Souza: Sou casada há 15 anos e temos dois filhos. Meu pai faleceu em janeiro de 2024.', '12/03/2024 14:09 - Maria Souza: A casa foi comprada pela minha mãe.', '12/03/2024 14:10 - Maria Souza: Contrato.pdf (arquivo anexado)', 'Esse é o contrato da casa.', '12/03/2024 14:11 - Maria Souza: IMG-20240312-WA0001.jpg (arquivo anexado)', '12/03/2024 14:12 - Maria Souza: PTT-20240312-WA0002.opus (arquivo anexado)', '12/03/2024 14:13 - Maria Souza: FOTO-faltando.jpg (arquivo anexado)', '12/03/2024 14:14 - Maria Souza: <Mídia oculta>', '12/03/2024 14:15 - Maria Souza: Certidao.docx (arquivo anexado)'].join('\n')
const zip = new JSZip(); zip.file('Conversa do WhatsApp com Maria Souza.txt', chat); zip.file('Contrato.pdf', fs.readFileSync('/tmp/t/fx/Contrato.pdf')); zip.file('IMG-20240312-WA0001.jpg', png); zip.file('PTT-20240312-WA0002.opus', Buffer.from('OggS-fake-audio')); zip.file('Certidao.docx', fs.readFileSync('/tmp/t/fx/Certidao.docx'))
fs.writeFileSync('/tmp/t/fx/whatsapp.zip', await zip.generateAsync({ type: 'nodebuffer' }))
const solo = new JSZip(); solo.file('Conversa do WhatsApp com Maria Souza.txt', chat); fs.writeFileSync('/tmp/t/fx/whatsapp-sem-midia.zip', await solo.generateAsync({ type: 'nodebuffer' }))
console.log('fixtures ok')
