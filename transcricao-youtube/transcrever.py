#!/usr/bin/env python3
"""
Transcreve (e traduz) um vídeo do YouTube para português usando o Whisper da OpenAI.

Suporta dois motores de transcrição:
  - api   : Whisper da OpenAI via API (modelo whisper-1). Precisa de OPENAI_API_KEY.
  - local : Whisper da OpenAI rodando localmente (pacote openai-whisper).
            Sem custo por uso e sem precisar de API key (baixa o modelo na 1ª vez).
  - auto  : usa "api" se OPENAI_API_KEY estiver definida; senão usa "local".

Pipeline:
  1. Baixa o áudio do YouTube com yt-dlp (extraído em .m4a via ffmpeg).
  2. (Motor api) divide em pedaços se passar do limite da API (25 MB).
  3. Transcreve com o Whisper.
  4. Se o idioma de origem não for português, traduz para PT-BR mantendo o sentido:
       - via API da OpenAI (se houver chave), ou
       - via tradução offline (argostranslate), se instalada.
  5. Salva os resultados em .txt e .srt.

Uso:
  python transcrever.py "https://youtu.be/CfSpZXFfvUE"
  python transcrever.py "https://youtu.be/CfSpZXFfvUE" --motor local --modelo-local small

Veja todas as opções com:  python transcrever.py --help

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


# --------------------------------------------------------------------------- #
# Dependências
# --------------------------------------------------------------------------- #
def resolver_motor(motor: str) -> str:
    if motor == "auto":
        return "api" if os.environ.get("OPENAI_API_KEY") else "local"
    return motor


def checar_dependencias(motor: str):
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

    if motor == "api":
        try:
            import openai  # noqa: F401
        except ImportError:
            erro("openai não instalado. Rode: pip install -r requirements.txt")
        if not os.environ.get("OPENAI_API_KEY"):
            erro('Motor "api" exige OPENAI_API_KEY. Use: export OPENAI_API_KEY="sk-..."'
                 ' (ou rode com --motor local)')
    elif motor == "local":
        try:
            import whisper  # noqa: F401
        except ImportError:
            erro('Motor "local" exige o pacote openai-whisper.\n'
                 "Instale com: pip install -r requirements-local.txt")


# --------------------------------------------------------------------------- #
# Download
# --------------------------------------------------------------------------- #
def baixar_audio(url: str, destino: Path):
    """Baixa apenas o áudio do vídeo e devolve (caminho, titulo)."""
    import yt_dlp

    opcoes = {
        "format": "bestaudio/best",
        "outtmpl": str(destino / "%(id)s.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
        "postprocessors": [
            {"key": "FFmpegExtractAudio", "preferredcodec": "m4a", "preferredquality": "0"}
        ],
    }
    print(f"[1/4] Baixando áudio de: {url}")
    with yt_dlp.YoutubeDL(opcoes) as ydl:
        info = ydl.extract_info(url, download=True)
    titulo = info.get("title", info.get("id", "video"))
    vid = info.get("id", "video")
    arquivo = destino / f"{vid}.m4a"
    if not arquivo.exists():
        candidatos = list(destino.glob(f"{vid}.*"))
        if not candidatos:
            erro("Falha ao localizar o áudio baixado.")
        arquivo = candidatos[0]
    print(f"      OK: {arquivo.name}  (título: {titulo})")
    return arquivo, titulo


# --------------------------------------------------------------------------- #
# Divisão (somente motor api)
# --------------------------------------------------------------------------- #
def duracao_segundos(arquivo: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(arquivo)],
        capture_output=True, text=True,
    )
    try:
        return float(out.stdout.strip())
    except ValueError:
        return 0.0


def dividir_audio(arquivo: Path, destino: Path) -> list:
    """Divide o áudio em pedaços que caibam no limite da API. Devolve [(caminho, offset_seg)]."""
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

    pedacos, inicio, idx = [], 0.0, 0
    while inicio < dur:
        saida = destino / f"pedaco_{idx:03d}.m4a"
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(arquivo),
             "-ss", str(inicio), "-t", str(seg_por_pedaco), "-c", "copy", str(saida)],
            check=True,
        )
        if saida.exists() and saida.stat().st_size > 0:
            pedacos.append((saida, inicio))
        inicio += seg_por_pedaco
        idx += 1
    return pedacos


# --------------------------------------------------------------------------- #
# Transcrição
# --------------------------------------------------------------------------- #
def transcrever_api(client, arquivo: Path, modelo: str, idioma_origem):
    kwargs = {"model": modelo, "file": open(arquivo, "rb"), "response_format": "verbose_json"}
    if idioma_origem:
        kwargs["language"] = idioma_origem
    resp = client.audio.transcriptions.create(**kwargs)
    idioma = getattr(resp, "language", None)
    segments = getattr(resp, "segments", None) or []
    norm = [{"start": _g(s, "start"), "end": _g(s, "end"), "text": _g(s, "text")} for s in segments]
    return resp.text, idioma, norm


def transcrever_api_completo(arquivo, modelo, idioma_origem, tmp):
    from openai import OpenAI
    client = OpenAI()
    pedacos = dividir_audio(arquivo, tmp)
    texto_total, segments_total, idioma_det = [], [], idioma_origem
    for i, (pedaco, offset) in enumerate(pedacos, start=1):
        print(f"      Pedaço {i}/{len(pedacos)}...")
        texto, idioma, segments = transcrever_api(client, pedaco, modelo, idioma_origem)
        texto_total.append(texto.strip())
        if idioma and not idioma_det:
            idioma_det = idioma
        for s in segments:
            segments_total.append({"start": s["start"] + offset, "end": s["end"] + offset, "text": s["text"]})
    return "\n".join(texto_total).strip(), idioma_det, segments_total


def transcrever_local_completo(arquivo, modelo_local, idioma_origem):
    import whisper
    print(f"      Carregando modelo local '{modelo_local}' (pode baixar na 1ª vez)...")
    model = whisper.load_model(modelo_local)
    resultado = model.transcribe(str(arquivo), language=idioma_origem, verbose=False)
    idioma_det = resultado.get("language", idioma_origem)
    segments = [{"start": s["start"], "end": s["end"], "text": s["text"]}
                for s in resultado.get("segments", [])]
    return resultado["text"].strip(), idioma_det, segments


def _g(obj, attr):
    return obj[attr] if isinstance(obj, dict) else getattr(obj, attr)


# --------------------------------------------------------------------------- #
# Tradução
# --------------------------------------------------------------------------- #
def traduzir_api(texto: str, modelo: str) -> str:
    from openai import OpenAI
    client = OpenAI()
    blocos, atual = [], ""
    for linha in texto.split("\n"):
        if len(atual) + len(linha) > 8000:
            blocos.append(atual); atual = ""
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
                {"role": "system", "content": (
                    "Você é um tradutor profissional. Traduza o texto do usuário para "
                    "português do Brasil de forma natural e fluente, mantendo fielmente o "
                    "sentido, o tom e a intenção original. Não resuma, não comente, não "
                    "adicione nada. Responda apenas com a tradução."
                )},
                {"role": "user", "content": bloco},
            ],
        )
        partes.append(resp.choices[0].message.content.strip())
    return "\n".join(partes)


def traduzir_offline(texto: str, idioma_origem: str) -> str:
    """Tradução offline com argostranslate (instala o pacote de idioma se necessário)."""
    import argostranslate.package
    import argostranslate.translate

    origem = (idioma_origem or "en")[:2]
    if origem == "pt":
        return texto
    print(f"      Traduzindo offline ({origem} -> pt) com argostranslate...")
    argostranslate.package.update_package_index()
    disponiveis = argostranslate.package.get_available_packages()
    pacote = next((p for p in disponiveis if p.from_code == origem and p.to_code == "pt"), None)
    if pacote is None:
        # tenta via inglês como pivô se não houver caminho direto
        raise RuntimeError(f"argostranslate não tem pacote {origem}->pt disponível.")
    argostranslate.package.install_from_path(pacote.download())
    return argostranslate.translate.translate(texto, origem, "pt")


# --------------------------------------------------------------------------- #
# Saída
# --------------------------------------------------------------------------- #
def formatar_tempo_srt(segundos: float) -> str:
    ms = int(round((segundos - int(segundos)) * 1000))
    s = int(segundos)
    h, s = divmod(s, 3600)
    m, s = divmod(s, 60)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def gerar_srt(segments: list) -> str:
    linhas = []
    for i, seg in enumerate(segments, start=1):
        linhas.append(f"{i}\n{formatar_tempo_srt(seg['start'])} --> "
                      f"{formatar_tempo_srt(seg['end'])}\n{seg['text'].strip()}\n")
    return "\n".join(linhas)


def nome_seguro(texto: str) -> str:
    return "".join(c if c.isalnum() or c in " -_" else "_" for c in texto).strip()[:80] or "transcricao"


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    p = argparse.ArgumentParser(
        description="Transcreve e traduz vídeos do YouTube para PT-BR com o Whisper da OpenAI.")
    p.add_argument("url", help="URL do vídeo do YouTube")
    p.add_argument("--saida", default="saida", help="Pasta de saída (padrão: ./saida)")
    p.add_argument("--motor", choices=["auto", "api", "local"], default="auto",
                   help="Motor de transcrição (padrão: auto)")
    p.add_argument("--modelo", default="whisper-1", help="[api] Modelo de transcrição (padrão: whisper-1)")
    p.add_argument("--modelo-local", default="small",
                   help="[local] Modelo openai-whisper: tiny/base/small/medium/large (padrão: small)")
    p.add_argument("--modelo-traducao", default="gpt-4o-mini",
                   help="[api] Modelo de chat para tradução (padrão: gpt-4o-mini)")
    p.add_argument("--traducao", choices=["auto", "api", "offline", "nenhuma"], default="auto",
                   help="Como traduzir (padrão: auto = api se houver chave, senão offline)")
    p.add_argument("--idioma-origem", default=None, help="Força o idioma de origem (ex.: en).")
    p.add_argument("--sem-traducao", action="store_true", help="Atalho para --traducao nenhuma.")
    p.add_argument("--manter-audio", action="store_true", help="Mantém o áudio baixado na pasta de saída.")
    args = p.parse_args()

    motor = resolver_motor(args.motor)
    checar_dependencias(motor)
    print(f"      Motor de transcrição: {motor}")

    pasta_saida = Path(args.saida)
    pasta_saida.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="ytwhisper_"))

    try:
        audio, titulo = baixar_audio(args.url, tmp)

        print(f"[2/4] Preparando áudio...")
        print(f"[3/4] Transcrevendo com Whisper ({motor})...")
        if motor == "api":
            transcricao, idioma_det, segments = transcrever_api_completo(
                audio, args.modelo, args.idioma_origem, tmp)
        else:
            transcricao, idioma_det, segments = transcrever_local_completo(
                audio, args.modelo_local, args.idioma_origem)
        print(f"      Idioma detectado: {idioma_det or 'desconhecido'}")

        base = nome_seguro(titulo)
        (pasta_saida / f"{base}.original.txt").write_text(transcricao, encoding="utf-8")
        if segments:
            (pasta_saida / f"{base}.original.srt").write_text(gerar_srt(segments), encoding="utf-8")

        # ----- Tradução -----
        modo_trad = "nenhuma" if args.sem_traducao else args.traducao
        ja_pt = bool(idioma_det) and idioma_det.lower().startswith("pt")

        if modo_trad == "nenhuma":
            print("[4/4] Tradução desativada.")
            final_txt = pasta_saida / f"{base}.original.txt"
        elif ja_pt:
            print("[4/4] Vídeo já está em português; pulando tradução.")
            final_txt = pasta_saida / f"{base}.pt.txt"
            final_txt.write_text(transcricao, encoding="utf-8")
        else:
            if modo_trad == "auto":
                modo_trad = "api" if os.environ.get("OPENAI_API_KEY") else "offline"
            print(f"[4/4] Traduzindo para português (modo: {modo_trad})...")
            try:
                if modo_trad == "api":
                    texto_pt = traduzir_api(transcricao, args.modelo_traducao)
                else:
                    texto_pt = traduzir_offline(transcricao, idioma_det)
                final_txt = pasta_saida / f"{base}.pt.txt"
                final_txt.write_text(texto_pt, encoding="utf-8")
            except Exception as e:
                print(f"      [AVISO] Falha na tradução ({e}). Mantendo apenas o original.")
                final_txt = pasta_saida / f"{base}.original.txt"

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
