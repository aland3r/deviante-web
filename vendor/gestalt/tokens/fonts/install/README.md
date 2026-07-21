# GT Planar — Install fonts (Figma / desktop)

Static TTF files generated from `GT-Planar-VF.woff2` for apps that do not handle web variable fonts well (e.g. Figma).

## Files

| File | Weight | Use in Figma |
|------|--------|--------------|
| `GT-Planar-Light.ttf` | 300 | Light |
| `GT-Planar-Regular.ttf` | 400 | Regular |
| `GT-Planar-Medium.ttf` | 500 | Medium |
| `GT-Planar-Semibold.ttf` | 600 | Semi Bold |
| `GT-Planar-Bold.ttf` | 700 | Bold |
| `GT-Planar-Black.ttf` | 900 | Black |

> **Nota:** Use os arquivos estáticos acima. A versão anterior foi gerada sem `static=True` e o Windows rejeitava como "arquivo de fonte inválido".

## Install on Windows

1. Abra `c:\gestalt\tokens\fonts\install\`
2. Selecione os `.ttf` desejados
3. Botão direito → **Instalar** (ou "Instalar para todos os usuários")
4. **Reinicie o Figma**

> **Importante:** Se você tentou instalar antes, apague versões antigas quebradas em:
> - `C:\Windows\Fonts\`
> - `%localappdata%\Microsoft\Windows\Fonts\`
>
> Os arquivos foram regenerados com descompactação woff2 correta + remoção de overlaps.

Se ainda aparecer erro, apague versões antigas em `C:\Windows\Fonts` ou `%localappdata%\Microsoft\Windows\Fonts\` e instale de novo.

## Figma setup (recommended)

Install the **static** files (`Light` through `Black`), not the `.woff2`.

1. Install fonts on your OS (step above)
2. Restart Figma
3. In the font picker you will see separate families/weights:
   - GT Planar Light
   - GT Planar Regular
   - GT Planar Medium
   - etc.

Figma often fails to expose the weight axis from `.woff2` web fonts. Static `.ttf` files fix that.

## Regenerate

If the source woff2 changes:

```bash
python ../generate_install_fonts.py
```

## Web vs install

| Context | File |
|---------|------|
| Deviante web app | `../GT-Planar-VF.woff2` via `tokens/typography.css` |
| Figma / Illustrator / Word | `install/*.ttf` |
