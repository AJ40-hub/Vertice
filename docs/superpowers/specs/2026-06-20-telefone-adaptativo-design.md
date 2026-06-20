# VERTICE - Telefone Adaptativo do Jogador

## Objetivo

Depois da sala de espera completar o numero de jogadores e o jogo iniciar, cada jogador entra num telefone individual dentro do WebApp. A experiencia deve parecer um smartphone real, mas controlado pelo universo VERTICE. As pistas chegam no tempo certo como mensagens privadas, anexos, mensagens de grupo, notificacoes de sistema e eventos especiais.

## Direcao Visual Aprovada

O telefone sera adaptativo por dispositivo.

- Jogadores em iOS recebem o modelo visual iOS premium, baseado na primeira versao aprovada da opcao A: moldura muito arredondada, ilha superior, status bar, wallpaper escuro, grelha de apps, dock translucido e notificacao flutuante.
- Jogadores em Android recebem o modelo visual Android/Samsung, baseado na opcao B: moldura menos arredondada, camera central em furo, status bar Android, card de notificacao e grelha de apps.
- Desktop, tablets incertos ou navegadores onde a deteccao seja inconclusiva recebem o modelo iOS premium como fallback.

Os modelos devem ser inspirados em padroes conhecidos, mas sem usar nomes, logotipos ou assets oficiais de iPhone, iOS, Samsung ou Android.

## Estrutura do Telefone

O telefone tem uma shell visual fixa e apps internas.

- Home: mostra o arquivo ativo, status do sistema, apps e notificacoes recentes.
- Mensagens: WhatsApp ficticio do jogo, com conversa privada VERTICE, grupo da sala, Kairo e mensagens de sistema.
- Galeria: fotos desbloqueadas para aquele jogador.
- Email: PDFs, documentos, relatorios e mensagens mais formais.
- Notas: texto curto, fragmentos, logs e lembretes de Kairo.
- Chamadas: registros de chamadas, horarios suspeitos e eventos sonoros futuros.
- Browser/Sistema: paginas falsas, seccoes desbloqueadas e eventos de glitch.

O jogador ve apenas as pistas destinadas ao seu papel, ao grupo todo ou ao pos-jogo quando elegivel.

## Automacao de Mensagens

O cronometro da sala continua a ser a fonte da verdade. Quando um evento fica pronto, o backend cria uma pista para os jogadores-alvo. A UI apresenta essa pista como uma mensagem dentro do telefone.

Tipos de mensagem:

- Privada VERTICE: enviada apenas ao jogador-alvo.
- Grupo da sala: enviada a todos ou a todos os jogadores elegiveis.
- Kairo: evento especial em que Kairo aparece como contacto.
- Sistema: avisos, glitch, pista expirada e desbloqueios.
- Anexo: foto, PDF, audio futuro ou video futuro.

Pistas com expiracao mostram contador dentro da conversa. Quando expiram, o anexo fica bloqueado e a mensagem muda de estado visual.

## Estados Especiais

- Kairo aparece: a conversa/contacto Kairo entra temporariamente, envia mensagem e fica com estado anormal.
- Mensagem apagada: bolha de mensagem truncada ou apagada, com rastro visual.
- Pista expirada: anexo escurecido, texto de expiracao e sem acesso ao ficheiro.
- Pos-jogo: telefone muda de atmosfera, recebe conteudo exclusivo e pode esconder apps normais.
- Offline/sem rede: estado cenico quando o jogo quer criar tensao, sem impedir o polling real.

## Detecao de Dispositivo

A deteccao sera feita no frontend, sem depender da base de dados.

Regra:

```ts
if (isIosDevice()) return 'ios'
if (isAndroidDevice()) return 'android'
return 'ios'
```

A deteccao pode usar `navigator.userAgent`, `navigator.platform`, `navigator.userAgentData` quando disponivel e sinais de touch para iPadOS moderno. A escolha visual nao altera as regras do jogo nem os dados gravados.

## Performance e PWA

- A shell do telefone deve ser leve e CSS-first.
- Imagens e anexos continuam a vir por URLs assinadas.
- Animacoes devem usar `transform` e `opacity`, respeitando `prefers-reduced-motion`.
- Layout mobile-first, sem scroll horizontal.
- Alvos de toque com pelo menos 44px.
- O telefone deve funcionar bem em 375px de largura e tambem em desktop, centralizado.

## Componentes Propostos

- `DeviceShell`: decide e renderiza a moldura iOS ou Android.
- `PhoneStatusBar`: hora, rede, bateria e indicadores cenicos.
- `PhoneHome`: ecrã inicial com apps, notificacoes e arquivo ativo.
- `PhoneAppIcon`: icone de app com badge.
- `MessagesApp`: lista de conversas e vista de conversa.
- `MessageBubble`: bolhas privadas, grupo, sistema, Kairo e anexos.
- `AttachmentPreview`: foto, PDF, audio futuro, video futuro e estado expirado.
- `PhoneNotification`: notificacao flutuante quando chega pista nova.

## Fase de Implementacao Recomendada

Implementar primeiro a experiencia visual e funcional com os dados atuais de `clues`.

Escopo da primeira fase:

- shell iOS/Android adaptativa;
- home do telefone;
- app Mensagens;
- renderizacao de mensagens/pistas existentes;
- fotos e PDFs via URL assinada;
- contador de expiracao;
- notificacao flutuante para nova pista.

Ficam para fase seguinte:

- sons/haptics;
- audios reais;
- video final;
- mensagens apagadas avancadas;
- configurador admin de roteiros visuais.

## Criterios de Aceite

- Em iOS, o jogador ve a moldura iOS premium original.
- Em Android, o jogador ve a moldura Android/Samsung.
- Em desktop, aparece a moldura iOS premium.
- O jogador nao ve pistas de outro papel.
- Uma nova pista aparece como notificacao e dentro da conversa correta.
- Fotos renderizam dentro do telefone.
- PDFs abrem por link seguro.
- Pistas expiraveis mostram contador e estado expirado.
- Build, lint e typecheck passam antes de deploy.
