#!/usr/bin/env python3
"""
Transcreve (e traduz) um vídeo do YouTube para português usando o Whisper da OpenAI.

Pipeline:
  1. Baixa o áudio do YouTube com yt-dlp (extraído em .m4a/.mp3 via ffmpeg).
  2. Se o arquivo passar do limite da API (25 MB), divide em pedaços por tempo.
  3. Transcreve cada pedaço com o Whisper da OpenAI (modelo whisper-1).
  4. Se o idioma de origem não for português, traduz o texto para PT-BR
     mantendo o sentido (usando um modelo de chat da OpenAI).
  5. Salva os resultados em .txt e .srt.

Uso:
  export OPENAI_API_KEY="sk-..."
  python transcrever.py "https://youtu.be/CfSpZXFfvUE"

Opções principais:
  --saida DIR         Pasta de saída (padrão: ./saida)
  --modelo NOME       Modelo de transcrição (padrão: whisper-1)
  --modelo-traducao   Modelo de chat usado para traduzir (padrão: gpt-4o-mini)
  --idioma-origem     Força o idioma de origem (ex.: en). Padrão: detecção automática.
  --sem-traducao      Apenas transcreve no idioma original, sem traduzir.
  --manter-audio      Não apaga o áudio baixado ao final.

Requisitos do sistema: ffmpeg instalado e no PATH.
"""

import argparse
import math
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# Limite de upload da API de áudio da OpenAI (25 MB). Usamos uma margem.
LIMITE_BYTES = 24 * 1024 * 1024


def erro(msg: str, codigo: int = 1):
    print(f"\n[ERRO] {msg}", file=sys.stderr)
    sys.exit(codigo)


def checar_dependencias():
    if shutil.which("ffmpeg") is None:
        erro(
            "ffmpeg não encontrado no PATH.\n"
            "  - macOS:  brew install ffmpeg\n"
            "  - Ubuntu: sudo apt install ffmpeg\n"
            "  - Windows: https://ffmpeg.org/download.html"
        )
    try:
        import yt_dlp  # noqa: F401
    except ImportError:
        erro("yt-dlp não instalado. Rode: pip install -r requirements.txt")
    try:
        import openai  # noqa: F401
    except ImportError:
        erro("openai não instalado. Rode: pip install -r requirements.txt")
    if not os.environ.get("OPENAI_API_KEY"):
        erro('Variável OPENAI_API_KEY não definida. Use: export OPENAI_API_KEY="sk-..."')


def baixar_audio(url: str, destino: Path) -> Path:
    """Baixa apenas o áudio do vídeo e devolve o caminho do arquivo .m4a."""
    import yt_dlp

    saida_template = str(destino / "%(id)s.%(ext)s")
    opcoes = {
        "format": "bestaudio/best",
        "outtmpl": saida_template,
        "quiet": True,
        "no_warnings": True,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "m4a",
                "preferredquality": "0",
            }
        ],
    }
    print(f"[1/4] Baixando áudio de: {url}")
    with yt_dlp.YoutubeDL(opcoes) as ydl:
        info = ydl.extract_info(url, download=True)
    titulo = info.get("title", info.get("id", "video"))
    vid = info.get("id", "video")
    arquivo = destino / f"{vid}.m4a"
    if not arquivo.exists():
        # fallback: procura qualquer arquivo gerado para esse id
        candidatos = list(destino.glob(f"{vid}.*"))
        if not candidatos:
            erro("Falha ao localizar o áudio baixado.")
        arquivo = candidatos[0]
    print(f"      OK: {arquivo.name}  (título: {titulo})")
    return arquivo, titulo


def duracao_segundos(arquivo: Path) -> float:
    out = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(arquivo),
        ],
        capture_output=True, text=True,
    )
    try:
        return float(out.stdout.strip())
    except ValueError:
        return 0.0


def dividir_audio(arquivo: Path, destino: Path) -> list:
    """Divide o áudio em pedaços que caibam no limite da API. Devolve lista (caminho, offset_seg)."""
    tamanho = arquivo.stat().st_size
    if tamanho <= LIMITE_BYTES:
        return [(arquivo, 0.0)]

    dur = duracao_segundos(arquivo)
    if dur <= 0:
        erro("Não foi possível medir a duração do áudio para dividir em pedaços.")

    n_pedacos = math.ceil(tamanho / LIMITE_BYTES)
    seg_por_pedaco = math.ceil(dur / n_pedacos)
    print(f"      Arquivo grande ({tamanho/1e6:.1f} MB). Dividindo em {n_pedacos} pedaços "
          f"de ~{seg_por_pedaco}s.")

    pedacos = []
    inicio = 0.0
    idx = 0
    while inicio < dur:
        saida = destino / f"pedaco_{idx:03d}.m4a"
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error",
                "-i", str(arquivo),
                "-ss", str(inicio), "-t", str(seg_por_pedaco),
                "-c", "copy", str(saida),
            ],
            check=True,
        )
        if saida.exists() and saida.stat().st_size > 0:
            pedacos.append((saida, inicio))
        inicio += seg_por_pedaco
        idx += 1
    return pedacos


def transcrever_pedaco(client, arquivo: Path, modelo: str, idioma_origem):
    """Transcreve um pedaço. Devolve (texto, idioma_detectado, segments)."""
    kwargs = {
        "model": modelo,
        "file": open(arquivo, "rb"),
        "response_format": "verbose_json",
    }
    if idioma_origem:
        kwargs["language"] = idioma_origem
    resp = client.audio.transcriptions.create(**kwargs)
    idioma = getattr(resp, "language", None)
    segments = getattr(resp, "segments", None) or []
    return resp.text, idioma, segments


def formatar_tempo_srt(segundos: float) -> str:
    ms = int(round((segundos - int(segundos)) * 1000))
    s = int(segundos)
    h, s = divmod(s, 3600)
    m, s = divmod(s, 60)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def gerar_srt(segments_com_offset: list) -> str:
    linhas = []
    for i, seg in enumerate(segments_com_offset, start=1):
        inicio = formatar_tempo_srt(seg["start"])
        fim = formatar_tempo_srt(seg["end"])
        linhas.append(f"{i}\n{inicio} --> {fim}\n{seg['text'].strip()}\n")
    return "\n".join(linhas)


def traduzir_para_pt(client, texto: str, modelo: str) -> str:
    """Traduz texto para PT-BR mantendo o sentido, em pedaços quando necessário."""
    # Divide por parágrafos/linhas para não estourar contexto em vídeos longos.
    blocos = []
    atual = ""
    for linha in texto.split("\n"):
        if len(atual) + len(linha) > 8000:
            blocos.append(atual)
            atual = ""
        atual += linha + "\n"
    if atual.strip():
        blocos.append(atual)

    partes = []
    for i, bloco in enumerate(blocos, start=1):
        if len(blocos) > 1:
            print(f"      Traduzindo bloco {i}/{len(blocos)}...")
        resp = client.chat.completions.create(
            model=modelo,
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Você é um tradutor profissional. Traduza o texto do usuário para "
                        "português do Brasil de forma natural e fluente, mantendo fielmente o "
                        "sentido, o tom e a intenção original. Não resuma, não comente, não "
                        "adicione nada. Responda apenas com a tradução."
                    ),
                },
                {"role": "user", "content": bloco},
            ],
        )
        partes.append(resp.choices[0].message.content.strip())
    return "\n".join(partes)


def nome_seguro(texto: str) -> str:
    return "".join(c if c.isalnum() or c in " -_" else "_" for c in texto).strip()[:80] or "transcricao"


def main():
    parser = argparse.ArgumentParser(description="Transcreve e traduz vídeos do YouTube para PT-BR com Whisper da OpenAI.")
    parser.add_argument("url", help="URL do vídeo do YouTube")
    parser.add_argument("--saida", default="saida", help="Pasta de saída (padrão: ./saida)")
    parser.add_argument("--modelo", default="whisper-1", help="Modelo de transcrição (padrão: whisper-1)")
    parser.add_argument("--modelo-traducao", default="gpt-4o-mini", help="Modelo de chat para tradução (padrão: gpt-4o-mini)")
    parser.add_argument("--idioma-origem", default=None, help="Força o idioma de origem (ex.: en). Padrão: detecção automática.")
    parser.add_argument("--sem-traducao", action="store_true", help="Apenas transcreve, sem traduzir.")
    parser.add_argument("--manter-audio", action="store_true", help="Não apaga o áudio baixado.")
    args = parser.parse_args()

    checar_dependencias()
    from openai import OpenAI
    client = OpenAI()

    pasta_saida = Path(args.saida)
    pasta_saida.mkdir(parents=True, exist_ok=True)

    tmp = Path(tempfile.mkdtemp(prefix="ytwhisper_"))
    try:
        audio, titulo = baixar_audio(args.url, tmp)

        print("[2/4] Preparando áudio (dividindo se necessário)...")
        pedacos = dividir_audio(audio, tmp)

        print(f"[3/4] Transcrevendo com Whisper ({args.modelo})...")
        texto_total = []
        segments_total = []
        idioma_detectado = args.idioma_origem
        for i, (pedaco, offset) in enumerate(pedacos, start=1):
            print(f"      Pedaço {i}/{len(pedacos)}...")
            texto, idioma, segments = transcrever_pedaco(client, pedaco, args.modelo, args.idioma_origem)
            texto_total.append(texto.strip())
            if idioma and not idioma_detectado:
                idioma_detectado = idioma
            for seg in segments:
                segments_total.append({
                    "start": seg["start"] + offset if isinstance(seg, dict) else seg.start + offset,
                    "end": seg["end"] + offset if isinstance(seg, dict) else seg.end + offset,
                    "text": seg["text"] if isinstance(seg, dict) else seg.text,
                })

        transcricao = "\n".join(texto_total).strip()
        print(f"      Idioma detectado: {idioma_detectado or 'desconhecido'}")

        base = nome_seguro(titulo)

        # Salva transcrição original
        (pasta_saida / f"{base}.original.txt").write_text(transcricao, encoding="utf-8")
        if segments_total:
            (pasta_saida / f"{base}.original.srt").write_text(gerar_srt(segments_total), encoding="utf-8")

        # Tradução
        if args.sem_traducao:
            print("[4/4] Tradução desativada (--sem-traducao).")
            final_txt = pasta_saida / f"{base}.original.txt"
        elif idioma_detectado and idioma_detectado.lower().startswith("pt"):
            print("[4/4] Vídeo já está em português; pulando tradução.")
            texto_pt = transcricao
            final_txt = pasta_saida / f"{base}.pt.txt"
            final_txt.write_text(texto_pt, encoding="utf-8")
        else:
            print(f"[4/4] Traduzindo para português ({args.modelo_traducao})...")
            texto_pt = traduzir_para_pt(client, transcricao, args.modelo_traducao)
            final_txt = pasta_saida / f"{base}.pt.txt"
            final_txt.write_text(texto_pt, encoding="utf-8")

        if args.manter_audio:
            destino_audio = pasta_saida / audio.name
            shutil.copy2(audio, destino_audio)
            print(f"      Áudio salvo em: {destino_audio}")

        print("\n✅ Concluído!")
        print(f"   Transcrição final: {final_txt}")
        print(f"   Arquivos na pasta: {pasta_saida.resolve()}")

    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
