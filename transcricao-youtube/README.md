# Transcrição de YouTube → Português (Whisper da OpenAI)

Ferramenta de linha de comando que **baixa o áudio de um vídeo do YouTube**,
**transcreve com o Whisper da OpenAI** (`whisper-1`) e, quando o vídeo não está
em português, **traduz para PT-BR mantendo o sentido**. Gera arquivos `.txt` e
`.srt` (legenda com tempos).

## Por que rodar localmente?

> ⚠️ Este projeto foi criado dentro de um ambiente remoto cuja **política de
> rede bloqueia o acesso ao YouTube** (`youtube.com`, `youtu.be` e
> `googlevideo.com` retornam 403). Por isso o download/transcrição **não pode
> ser executado naquele ambiente** — ele precisa rodar na sua máquina, onde o
> YouTube é acessível e onde está a sua `OPENAI_API_KEY`.

## Pré-requisitos

- Python 3.9+
- [ffmpeg](https://ffmpeg.org/download.html) instalado e no PATH
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`
- Uma chave da API da OpenAI

## Instalação

```bash
cd transcricao-youtube
python -m venv .venv && source .venv/bin/activate   # opcional, recomendado
pip install -r requirements.txt
export OPENAI_API_KEY="sk-..."   # sua chave da OpenAI
```

## Uso

```bash
# Transcreve e traduz para português (detecção automática do idioma de origem)
python transcrever.py "https://youtu.be/CfSpZXFfvUE"
```

Para o vídeo que você pediu:

```bash
python transcrever.py "https://youtu.be/CfSpZXFfvUE"
```

### Opções

| Opção | Descrição |
|-------|-----------|
| `--saida DIR` | Pasta de saída (padrão: `./saida`) |
| `--modelo NOME` | Modelo de transcrição (padrão: `whisper-1`) |
| `--modelo-traducao NOME` | Modelo de chat usado na tradução (padrão: `gpt-4o-mini`) |
| `--idioma-origem XX` | Força o idioma de origem (ex.: `en`). Padrão: detecção automática |
| `--sem-traducao` | Apenas transcreve no idioma original, sem traduzir |
| `--manter-audio` | Mantém o áudio baixado na pasta de saída |

### Arquivos gerados (na pasta `saida/`)

- `TÍTULO.original.txt` — transcrição no idioma original
- `TÍTULO.original.srt` — legenda com marcação de tempo (idioma original)
- `TÍTULO.pt.txt` — transcrição traduzida para português

## Como funciona

1. **Download** do áudio com `yt-dlp` (extração para `.m4a` via `ffmpeg`).
2. **Divisão automática** em pedaços quando o áudio passa de ~25 MB (limite da
   API de áudio da OpenAI), preservando os tempos.
3. **Transcrição** de cada pedaço com o Whisper (`whisper-1`,
   `response_format=verbose_json` para obter os segmentos com tempos).
4. **Tradução** para PT-BR (pulada se o vídeo já estiver em português),
   instruindo o modelo a preservar sentido, tom e intenção — sem resumir.

## Observações

- O custo é cobrado pela sua conta OpenAI (transcrição por minuto de áudio +
  tradução por tokens).
- Para vídeos muito longos, o processo pode levar alguns minutos.
- Respeite os termos de uso do YouTube e direitos autorais do conteúdo
  transcrito.
