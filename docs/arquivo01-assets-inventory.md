# VERTICE - Arquivo 01: Inventario de Assets

Data da triagem: 2026-06-20

Origem analisada: `E:\`

Foram encontrados os 13 ficheiros mais recentes indicados pela criadora:

- 10 imagens soltas
- 3 arquivos ZIP

Este documento organiza o que deve entrar no Arquivo 01, evita duplicados e marca pendencias antes da automacao.

## Decisao Sobre Os ZIPs

| Ficheiro | Decisao | Motivo |
|---|---|---|
| `E:\arquivo01 completo v2.zip` | Usar como fonte principal da v2 | Contem a linha do tempo unificada, guia de fotos/audios e PDFs v2. |
| `E:\assets_arquivo01.zip` | Usar apenas para assets v1 que nao estao na v2 | Contem PDFs iniciais, guia antigo, scripts e algumas fotos antigas. |
| `E:\assets arquivo01 v2 plottwist.zip` | Nao importar diretamente | E duplicado/subconjunto dos PDFs v2 ja presentes em `arquivo01 completo v2.zip`. |

## PDFs Confirmados

### Usar de `assets_arquivo01.zip`

| Asset final | Canal | Destinatario | Tempo | Expira | Observacao |
|---|---|---:|---:|---:|---|
| `A0_Dossie_Inicial.pdf` | WebApp | Todos | 00:30 | Nao | Dossie inicial. |
| `A_Pista1_ConversaKairo.pdf` | WebApp | A | 05:00 | 3m30s | Conversa truncada de Kairo. |
| `B_Pista1_UltimoContato.pdf` | WebApp | B | 07:00 | 3m30s | Ultimo contacto real. |
| `C_Documento_Projeto.pdf` | WebApp | C | 30:00 | 3m30s | Artigo secreto do projecto. |
| `D_Logs_Mensagens.pdf` | WebApp | D | 15:00 | Nao | Logs cortados. |
| `D_Logs_Duplicados.pdf` | WebApp | D | 42:00 | Nao | Mensagens duplicadas. |
| `F_Registros_Suspeitos.pdf` | WebApp | F | 10:00 | 3m30s | Registos de horarios suspeitos. |
| `Replication_Doc.pdf` | WebApp | Todos | 60:00 | Nao | Replication active/codigo. |

### Usar de `arquivo01 completo v2.zip`

| Asset final | Canal | Destinatario | Tempo | Expira | Observacao |
|---|---|---:|---:|---:|---|
| `A_Pista2_RelatorioMedico.pdf` | WebApp | A | 50:00 | 3m30s | Relatorio medico fragmentado. |
| `C_Pista2_MensagensCifradas.pdf` | WebApp | C | 55:00 | 3m30s | Mensagens cifradas. |
| `D_Pista2_TransferenciaProjeto.pdf` | WebApp | D | 70:00 | Nao | Transferencia do projecto. |
| `D_Pista3_EspecialistaFinal.pdf` | WebApp | D | 72:00 | Nao | Revelacao do papel do especialista. |
| `F_Pista2_DiarioKairo.pdf` | WebApp | F | 36:00 | 3m30s | Diario de Kairo. |
| `TODOS_RevelacaoFinal.pdf` | WebApp | Todos | 85:00 | Nao | Revelacao final. |
| `POSJOGO_LocalizacaoCorpo.pdf` | WhatsApp/WebApp pos-jogo | A, C, F | +13 | Nao | Localizacao/ultimo ping. |
| `B_PosJogo_ConfissaoAmigo.pdf` | WhatsApp/WebApp pos-jogo | B | +13 | Nao | Confissao escrita. |

## Imagens Soltas Confirmadas

| Ficheiro actual | Nome final recomendado | Canal | Destinatario | Tempo | Expira | Estado |
|---|---|---|---:|---:|---:|---|
| `E:\IMG_8565.PNG` | `Kairo_Foto_Normal.jpg` | WebApp | Todos | 00:30 | Nao | Usar. Foto inicial de Kairo. |
| `E:\IMG_8567.PNG` | `C_Foto_Evento.jpg` | WebApp | C | 08:00 | 3m30s | Usar, mas contem placeholder `[NOME DO JOGADOR D]`. |
| `E:\IMG_8569.PNG` | `A_Foto_Contraditoria.jpg` | WebApp | A | 20:00 | 3m30s | Usar. E-mail/ecran corrompido. |
| `E:\IMG_8566.PNG` | `F_Foto_Detalhe.jpg` | WebApp | F | 36:00 | 3m30s | Usar como pista visual extra de F. |
| `E:\IMG_8560.PNG` | `VIG_01_Entrada_0309.jpg` | WebApp | F | 36:00 | 3m30s | Usar. Entrada na residencia. |
| `E:\IMG_8559.PNG` | `VIG_02_Sala_0347.jpg` | WebApp | A | 50:00 | 3m30s | Usar; guia cita CAM-01, imagem esta como CAM-03. |
| `E:\5886363455424499763.jpg` | `VIG_03_SaidaTraseira_0431.jpg` | WebApp | C | 55:00 | 3m30s | Usar. Duas silhuetas na saida traseira. |
| `E:\IMG_8557.PNG` | `VIG_04_Parque_0447.jpg` | WebApp | Todos | 60:00 | Nao | Corrigir antes de upload: timestamp/camera nao batem com a timeline. |
| `E:\IMG_8563.PNG` | `PostGame_Robot_Glitch.jpg` | WhatsApp/WebApp pos-jogo | A, B, C, F | +10 | Nao | Usar. |
| `E:\IMG_8556.PNG` | `VIG_05_RostoParcial.jpg` | WhatsApp/WebApp pos-jogo | A, C, F | +12 | Nao | Usar. |

## Imagens Duplicadas/Supersedidas

Dentro de `assets_arquivo01.zip` existem:

- `Foto reveladora.jpg`
- `Meeting 1.jpg`
- `Quarto desarrumado.jpg`

Estas devem ser tratadas como versoes antigas ou material de referencia. As imagens soltas mais recentes substituem estas versoes.

## Assets Ainda Em Falta

### Audios

Nao foram encontrados ficheiros `.mp3` reais, apenas scripts/guias.

| Asset esperado | Destinatario | Tempo | Estado |
|---|---:|---:|---|
| `B_Audio_Estranho.mp3` | B | 33:00 | Falta gerar/importar. |
| `B_Audio_Kairo.mp3` | B | 55:00 | Falta gerar/importar. |
| `Audio_Grupo_35min.mp3` | Todos | 35:00 | Falta gerar/importar. |
| `Audio_Residencia_Ambiente.mp3` | Todos | 42:00 | Falta gerar/importar. |
| `Audio_Final_Distorcido.mp3` | Todos | 78:00 | Falta gerar/importar. |
| `D_Audio_Tecnico.mp3` | D | 42:00 | Falta gerar/importar. |
| `B_PosJogo_Audio_Confissao.mp3` | B | +13 | Falta gerar/importar. |

### Video

| Asset esperado | Destinatario | Tempo | Estado |
|---|---:|---:|---|
| `PostGame_Video_Final.mp4` | A, B, C, F | +18 | Falta gerar/importar. |

### Memes

Nao foram encontrados os 4 memes finais.

| Asset esperado | Destinatario | Tempo | Estado |
|---|---:|---:|---|
| `Meme1_Exagero.jpg` | Todos | 12:30 | Falta gerar/importar. |
| `Meme2_Horario.jpg` | Todos | 22:00 | Falta gerar/importar. |
| `Meme3_Teoria.jpg` | Todos | 38:00 | Falta gerar/importar. |
| `Meme4_WebApp.jpg` | Todos | 65:00 | Falta gerar/importar. |

## Mapa De Automacao Recomendado

| Tempo | Asset/Evento | Canal | Destinatario | Expira |
|---:|---|---|---:|---:|
| 00:00 | Mensagem IA inicial | WhatsApp/WebApp | Todos | Nao |
| 00:30 | `A0_Dossie_Inicial.pdf` + `Kairo_Foto_Normal.jpg` | WebApp | Todos | Nao |
| 00:50 | Mensagem IA: prestar atencao aos detalhes | WhatsApp | Todos | Nao |
| 01:00 | Mensagem IA: papeis e segredo | WhatsApp | Todos | Nao |
| 05:00 | `A_Pista1_ConversaKairo.pdf` | WebApp | A | 3m30s |
| 07:00 | `B_Pista1_UltimoContato.pdf` | WebApp | B | 3m30s |
| 08:00 | `C_Foto_Evento.jpg` | WebApp | C | 3m30s |
| 10:00 | `F_Registros_Suspeitos.pdf` | WebApp | F | 3m30s |
| 12:00 | Mensagem IA: horario estranho | WhatsApp | Todos | Nao |
| 12:30 | `Meme1_Exagero.jpg` | WhatsApp | Todos | Nao |
| 15:00 | `D_Logs_Mensagens.pdf` | WebApp | D | Nao |
| 18:00 | Mensagem privada: manipular grupo | WhatsApp/WebApp | E | Nao |
| 20:00 | `A_Foto_Contraditoria.jpg` | WebApp | A | 3m30s |
| 22:00 | `Meme2_Horario.jpg` | WhatsApp | Todos | Nao |
| 25:00 | Mensagem IA: nem todos dizem tudo | WhatsApp | Todos | Nao |
| 30:00 | `C_Documento_Projeto.pdf` | WebApp | C | 3m30s |
| 33:00 | `B_Audio_Estranho.mp3` | WhatsApp | B | Nao |
| 35:00 | `Audio_Grupo_35min.mp3` | WhatsApp | Todos | Nao |
| 36:00 | `VIG_01_Entrada_0309.jpg` | WebApp | F | 3m30s |
| 36:00 | `F_Pista2_DiarioKairo.pdf` | WebApp | F | 3m30s |
| 36:00 | `F_Foto_Detalhe.jpg` | WebApp | F | 3m30s |
| 38:00 | `Meme3_Teoria.jpg` | WhatsApp | Todos | Nao |
| 42:00 | `D_Logs_Duplicados.pdf` | WebApp | D | Nao |
| 42:00 | `D_Audio_Tecnico.mp3` | WhatsApp | D | Nao |
| 42:00 | `Audio_Residencia_Ambiente.mp3` | WebApp | Todos | Nao |
| 45:00 | Mensagem IA: oculto mais importante | WhatsApp | Todos | Nao |
| 50:00 | `A_Pista2_RelatorioMedico.pdf` | WebApp | A | 3m30s |
| 50:00 | `VIG_02_Sala_0347.jpg` | WebApp | A | 3m30s |
| 55:00 | `B_Audio_Kairo.mp3` | WhatsApp | B | Nao |
| 55:00 | `C_Pista2_MensagensCifradas.pdf` | WebApp | C | 3m30s |
| 55:00 | `VIG_03_SaidaTraseira_0431.jpg` | WebApp | C | 3m30s |
| 57:00 | Mensagem apagada: "ele nao devia--" | WhatsApp | Todos | Nao |
| 58:00 | Mensagem IA: ainda acham que falam com ele? | WhatsApp | Todos | Nao |
| 60:00 | `Replication_Doc.pdf` | WebApp | Todos | Nao |
| 60:00 | `VIG_04_Parque_0447.jpg` | WebApp | Todos | Nao |
| 65:00 | `Meme4_WebApp.jpg` | WhatsApp | Todos | Nao |
| 70:00 | `D_Pista2_TransferenciaProjeto.pdf` | WebApp | D | Nao |
| 72:00 | Mensagem privada: desvia agora | WhatsApp/WebApp | E | Nao |
| 72:00 | `D_Pista3_EspecialistaFinal.pdf` | WebApp | D | Nao |
| 75:00 | Mensagem IA: a verdade nao muda nada | WhatsApp | Todos | Nao |
| 78:00 | `Audio_Final_Distorcido.mp3` | WhatsApp | Todos | Nao |
| 85:00 | `TODOS_RevelacaoFinal.pdf` | WebApp | Todos | Nao |
| 87:00 | Mensagem IA: nunca falaram com ele | WhatsApp | Todos | Nao |
| 88:00 | Mensagem IA: amigo proximo e especialista | WhatsApp | Todos | Nao |
| 90:00 | Mensagem IA: Bem-vindos ao VERTICE | WhatsApp | Todos | Nao |
| +10 | `PostGame_Robot_Glitch.jpg` | WhatsApp/WebApp pos-jogo | A, B, C, F | Nao |
| +12 | `VIG_05_RostoParcial.jpg` | WhatsApp/WebApp pos-jogo | A, C, F | Nao |
| +13 | `POSJOGO_LocalizacaoCorpo.pdf` | WhatsApp/WebApp pos-jogo | A, C, F | Nao |
| +13 | `B_PosJogo_Audio_Confissao.mp3` | WhatsApp pos-jogo | B | Nao |
| +13 | `B_PosJogo_ConfissaoAmigo.pdf` | WhatsApp/WebApp pos-jogo | B | Nao |
| +15 | Mensagem privada: isto nao acabou + link | WhatsApp | A, B, C, F | Nao |
| +18 | `PostGame_Video_Final.mp4` | WhatsApp/WebApp pos-jogo | A, B, C, F | Nao |

## Pendencias Antes Do Upload

1. Corrigir ou confirmar `VIG_04_Parque_0447.jpg`: a imagem actual mostra timestamp/camera diferente do guia.
2. Decidir como tratar `C_Foto_Evento.jpg`, porque contem placeholder `[NOME DO JOGADOR D]`.
3. Gerar/importar audios.
4. Gerar/importar video final.
5. Gerar/importar memes.
6. Definir se `F_Foto_Detalhe.jpg` entra como pista extra aos 36:00 ou se fica apenas como asset opcional.

