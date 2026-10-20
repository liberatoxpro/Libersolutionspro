# LIBER AGRO PRO — Grupo Liberato

Aplicativo para apoio à operação de drones agrícolas: clientes, talhões, pulverização, semeadura, calibração, relatórios e previsão climática.

## Estrutura
- `index.html`, `style.css`, `app.js`: aplicação web em português
- `47CF89AD-2FC4-44B2-A9E5-80EE8FE61863.png`: imagem do aplicativo
- `.github/workflows/ios-ipa.yml`: valida e compila o app iOS via Capacitor
- `package.json`: versões fixadas das dependências

## Compilação
1. Envie estes **arquivos extraídos** à raiz de um repositório GitHub (não envie só o ZIP).
2. Entre em **Actions → LIBER AGRO PRO - Gerar IPA → Run workflow**.
3. Ao finalizar, baixe o artefato `liber-agro-pro-unsigned-ipa`.

**Importante:** o arquivo produzido é um IPA **não assinado**. Para instalação no iPhone será necessária assinatura e provisionamento válidos. Não publique chaves de API, certificados ou perfis privados. O build ainda precisa ser validado em uma execução real no GitHub Actions.

O app armazena registros localmente, sem sincronização de nuvem. Clima requer internet. Verifique cálculos de insumos antes de usar em campo e siga bulas, receituário e orientação de profissional habilitado.
