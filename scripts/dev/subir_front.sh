#!/usr/bin/env bash
# Sobe o front-end do GeraDocs localmente.
#
#     ./scripts/dev/subir_front.sh           primeiro plano; Ctrl+C para parar
#     ./scripts/dev/subir_front.sh fundo     segundo plano; sobrevive ao terminal fechar
#     ./scripts/dev/subir_front.sh parar
#     ./scripts/dev/subir_front.sh status
#     ./scripts/dev/subir_front.sh logs      acompanha o registro do modo `fundo`
#
# Mesma interface do `subir_api.sh` — e a mesma dos dois scripts do Resgate
# Certo. Quem alterna entre os projetos digita o mesmo comando nos quatro
# repositórios; o que muda é o que cada script faz por dentro.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$RAIZ"

PORTA=3000
REGISTRO=/tmp/geradocs-front.log
ARQUIVO_PID=/tmp/geradocs-front.pid
# O `basePath` do next.config.ts: a raiz responde 308 para cá, e é este endereço
# que abre a aplicação.
URL="http://localhost:$PORTA/GeraDocsFrontend"
API="${GERADOCS_API_URL:-http://localhost:8080}"

# ---------------------------------------------------------------------------

# Quem realmente escuta a porta — **não** o processo que iniciamos.
#
# `npm run dev` é um lançador: o npm executa o `next`, que por sua vez sobe o
# servidor num processo filho. Matar o pai deixa o neto segurando a porta, e o
# tropeço seguinte é um "Port 3000 is in use" sem nada visível para matar. A
# porta é a única fonte de verdade — inclusive para instâncias subidas à mão.
#
# `|| true`: **"ninguém escutando" não é erro**, mas o `lsof` sai com 1, o
# `pipefail` propaga pelo cano e o `set -e` derrubaria o script antes da
# primeira linha de saída.
quem_escuta() { lsof -nP -iTCP:"$PORTA" -sTCP:LISTEN -t 2>/dev/null || true; }

exigir_dependencias() {
    if [ ! -d node_modules ]; then
        echo "ERRO: não há node_modules. Instale a partir do lock:" >&2
        echo "  npm ci" >&2
        exit 1
    fi
}

exigir_porta_livre() {
    local em_uso
    em_uso=$(quem_escuta | head -1)
    if [ -n "$em_uso" ]; then
        echo "ERRO: já há algo escutando na porta $PORTA (PID $em_uso)." >&2
        echo "Provavelmente um servidor que ficou de pé. Para derrubá-lo:" >&2
        echo "  ./scripts/dev/subir_front.sh parar" >&2
        exit 1
    fi
}

# A aplicação sobe sem a API — e mostra o motivo na tela, em vez de quebrar
# (é o que o e2e "backend fora do ar" cobra). Por isso isto avisa, não barra.
avisar_api() {
    if ! curl -sf -o /dev/null --max-time 2 "$API/actuator/health" 2>/dev/null; then
        echo "AVISO: a API não respondeu em $API."
        echo "       A tela sobe assim mesmo e explica a ausência; para subi-la:"
        echo "       (no repositório do back-end) ./scripts/dev/subir_api.sh fundo"
        echo
    fi
}

# ---------------------------------------------------------------------------

comando_fundo() {
    exigir_dependencias
    exigir_porta_livre
    avisar_api

    # `< /dev/null` não é enfeite: sem ele o processo herda o terminal como
    # entrada e, ao fechar a janela, passa a ler de um descritor inválido.
    # `nohup` cuida do SIGHUP; a entrada é problema separado, e precisa das duas.
    nohup npm run dev < /dev/null >> "$REGISTRO" 2>&1 &
    local pid=$!
    echo "$pid" > "$ARQUIVO_PID"

    # Confirma que subiu de fato, em vez de anunciar sucesso porque o `nohup`
    # retornou. `-L` porque a raiz redireciona para o basePath.
    local tentativa=0
    until curl -sf -o /dev/null -L --max-time 3 "$URL/" 2>/dev/null; do
        tentativa=$((tentativa + 1))
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "ERRO: o processo morreu ao subir. Últimas linhas:" >&2
            tail -25 "$REGISTRO" >&2
            rm -f "$ARQUIVO_PID"
            exit 1
        fi
        if [ "$tentativa" -ge 90 ]; then
            echo "ERRO: não respondeu em 90s. Veja: ./scripts/dev/subir_front.sh logs" >&2
            exit 1
        fi
        sleep 1
    done

    echo "Front-end de pé em segundo plano · PID $pid"
    echo "  $URL"
    echo "  registro: $REGISTRO"
    echo
    echo "Pode fechar o terminal. Para parar:"
    echo "  ./scripts/dev/subir_front.sh parar"
}

comando_parar() {
    local pids
    pids=$(quem_escuta)

    if [ -z "$pids" ]; then
        echo "Nada escutando na porta $PORTA — o front-end já está parado."
        encerrar_lancador
        rm -f "$ARQUIVO_PID"
        return 0
    fi

    # O `next dev` deixa mais de um processo na porta (o servidor e o worker de
    # compilação). Derrubar só o primeiro devolveria a porta ocupada.
    local pid
    for pid in $pids; do
        kill "$pid" 2>/dev/null || true
    done

    local tentativa=0
    while [ -n "$(quem_escuta)" ]; do
        tentativa=$((tentativa + 1))
        if [ "$tentativa" -ge 10 ]; then
            echo "Não encerrou em 10s; forçando."
            for pid in $(quem_escuta); do kill -9 "$pid" 2>/dev/null || true; done
            break
        fi
        sleep 1
    done

    # O npm é o pai que lançou o `next`: derrubar só o filho deixaria o npm vivo
    # segurando o terminal e o registro.
    encerrar_lancador
    rm -f "$ARQUIVO_PID"
    echo "Front-end parado ($(echo "$pids" | tr '\n' ' '))."
}

encerrar_lancador() {
    [ -f "$ARQUIVO_PID" ] || return 0
    local lancador
    lancador=$(cat "$ARQUIVO_PID")
    if [ -n "$lancador" ] && kill -0 "$lancador" 2>/dev/null; then
        kill "$lancador" 2>/dev/null || true
    fi
}

comando_status() {
    local pid
    pid=$(quem_escuta | head -1)

    if [ -z "$pid" ]; then
        echo "parado — nada escutando na porta $PORTA"
        return 1
    fi

    local codigo
    codigo=$(curl -s -o /dev/null -L -w '%{http_code}' --max-time 3 "$URL/" 2>/dev/null || echo 000)

    echo "de pé · PID $pid · porta $PORTA"
    echo "  $URL/ responde $codigo"
    [ -f "$ARQUIVO_PID" ] && echo "  subido por este script (modo fundo)" \
                          || echo "  subido por fora deste script"
}

# ---------------------------------------------------------------------------

case "${1:-primeiro-plano}" in
    fundo)   comando_fundo ;;
    parar)   comando_parar ;;
    status)  comando_status ;;
    logs)    tail -f "$REGISTRO" ;;
    primeiro-plano)
        exigir_dependencias
        exigir_porta_livre
        avisar_api

        echo "Front-end em $URL"
        echo "Ctrl+C para parar.  (Para sobreviver ao terminal: $0 fundo)"
        echo
        exec npm run dev
        ;;
    *)
        echo "uso: $0 [fundo|parar|status|logs]" >&2
        exit 2
        ;;
esac
